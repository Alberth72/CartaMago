# Architecture

## Purpose

This document maps the current CartaMago implementation. It covers:

- The public QR menu with WhatsApp ordering (the validated core).
- The admin panel with orders, menu editing, inventory, and operations.
- Live tracking displays for customers, kitchen, and the room.
- The multi-brand distribution model (`brands -> warehouses -> branches`).

The ordering path stays intentional and lightweight:

```text
QR -> Public menu -> Cart -> WhatsApp order -> Restaurant confirms
```

Orders are also persisted and surfaced in the admin orders tray so kitchen and staff can move them through fulfillment states. The public menu keeps a local TypeScript seed fallback so the QR experience works even if Supabase is not configured or a request fails.

## Current Runtime Shape

```text
Customer phone
  -> QR / production URL
  -> Netlify static site
  -> Vite + React app (BrowserRouter)
  -> Supabase menu data, with seed fallback
  -> Cart state in browser
  -> wa.me link with encoded order message
  -> Restaurant WhatsApp
```

Routes (defined in `src/app/AppRouter.tsx`):

```text
/                              public menu (current branch)
/s/:branchId                   scoped public menu
/tracking/t/:trackingToken     public customer tracking by token
/s/:branchId/tracking/t/:trackingToken scoped public tracking by token
/tracking/:orderId             demo/legacy tracking by internal ID
/s/:branchId/tracking/:orderId scoped demo/legacy tracking
/s/:branchId/kitchen/t/:displayToken kitchen display by branch token
/s/:branchId/salon/t/:displayToken   room/lobby display by branch token
/s/:branchId/caja/:cashSessionId/t/:accessToken cash terminal by open cash-session token
/kitchen                       demo/legacy kitchen display
/salon                         demo/legacy room display
/admin                         owner panel
```

Key URLs:

```text
Public menu: https://brasas-sazon-menu.netlify.app
Admin:       https://brasas-sazon-menu.netlify.app/admin
```

## Frontend

The app is a static Vite React app.

Important files:

```text
src/app/App.tsx
src/app/AppRouter.tsx
src/main.tsx
src/features/menu/PublicMenuApp.tsx
src/features/menu/hooks/usePublicMenuOrder.ts
src/index.css
```

Responsibilities:

- Route between the public menu, `/admin`, and tracking/kitchen/room displays in `AppRouter.tsx`.
- Render restaurant profile, hero, categories, products, physical menu photos, and cart.
- Keep cart and customer details in client state.
- Generate the WhatsApp order URL from the current cart.

The frontend is Vite + React + TypeScript + Tailwind. There is no custom backend in phase 1; Netlify serves the built `dist/` output.

## Menu Data

Public menu data is loaded through:

```text
src/services/menuRepository.ts
```

The repository exposes one main public loader:

```text
fetchPublicMenu()
```

Data source decision:

```text
Supabase configured and request succeeds -> use Supabase rows
Supabase missing or request fails       -> use local seed
```

Local fallback seed:

```text
src/data/restaurantSeed.ts
```

Supabase tables used by the public menu:

```text
branches
categories
products
menu_photos
branch_products    (per-branch prices/catalog)
```

Operational tables (multi-brand distribution):

```text
brands
warehouses
warehouse_stock
branch_stock
inventory_items
inventory_movements
formulas
suppliers
supplier_items
purchase_orders
purchase_order_items
dispatch_requests
dispatch_request_items
dispatches
dispatch_items
cash_sessions
sales
sale_items
sale_payments
sale_receipts
orders
order_items
order_status_events
integration_events
```

Storage bucket used for product images:

```text
menu-assets
```

Runtime environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_BRANCH_ID
VITE_MENU_STORAGE_BUCKET
```

Defaults:

```text
VITE_BRANCH_ID=brasas-sazon
VITE_MENU_STORAGE_BUCKET=menu-assets
```

## Public Ordering Flow

Main file:

```text
src/features/menu/PublicMenuApp.tsx
```

State and commands:

```text
src/features/menu/hooks/usePublicMenuOrder.ts
```

Flow:

1. Customer scans the QR and opens the public menu.
2. App renders seed data immediately.
3. App attempts to fetch Supabase menu data.
4. Customer browses categories and adds products.
5. Cart total is calculated in the browser.
6. Customer selects pickup, delivery, or table.
7. App builds a structured WhatsApp URL.
8. App sends order intent to `create-order`.
9. Customer sends the message; the restaurant confirms inside WhatsApp.

WhatsApp message composition lives in:

```text
src/features/order/orderMessage.ts
```

Public order persistence lives in:

```text
src/features/order/repositories/publicOrderRepository.ts
supabase/functions/create-order/index.ts
```

Security boundary:

```text
Client builds intent
Edge Function validates product availability, price, totals, rate limit, and anti-bot signals
Supabase persists order with service role
RLS prevents public direct writes/reads of orders
```

The message includes:

- Restaurant name.
- Product quantities and line totals.
- Total or known total when some prices are missing.
- Fulfillment mode.
- Delivery address, table number, or pickup note.
- Customer name and optional notes.

## Operations Core (Warehouse -> Branch)

CartaMago now models distribution for multi-brand operations. The tenancy chain is:

```text
brands -> warehouses -> branches
```

- A brand owns one or more warehouses.
- A warehouse owns one or more branches (each with its own menu/QR).
- Inventory lives at two levels: `warehouse_stock` (central) and `branch_stock` (per branch).
- Branches do not buy directly; they request dispatch from their warehouse.

The fulfillment lifecycle (RPCs on `warehouse_dispatch_operations`):

```text
Branch requests stock (create_dispatch_request)
  -> Warehouse approves/dispatches (dispatch_request)
  -> Branch receives (receive_dispatch)
  -> Branch sells with manual payment and internal receipt (create_sale)
  -> create_sale decrements branch stock by formula (sell_product)
  -> Losses are recorded as merma (register_merma)
```

Implementation files:

```text
src/features/admin/components/OperationsPanel.tsx
src/features/admin/hooks/useAdminOperations.ts
src/features/admin/repositories/adminOperationsRepository.ts
```

## Operational Sales And Internal Receipts

Sales are operational records, not DIAN invoices.

```text
create_sale
  -> validates branch scope
  -> resolves product price
  -> records sale + sale_items
  -> records sale_payments
  -> decrements branch_stock through sell_product
  -> issues sale_receipts as an internal receipt
```

Payment methods in this stage are manual/operational:

```text
cash
card_at_counter / card_at_table
bank_transfer
wompi pending
didi_food external
```

Cash sessions (`cash_sessions`) support opening and closing branch cash shifts. The admin exposes this as a dedicated `Caja` tab so branch/cashier users can open one or more named cash sessions with an initial base, generate the terminal link for each cash session, supervise open cash sessions, review recent sales, and close with the counted amount while the database computes expected cash from base plus paid cash sales. Products with an active formula decrement stock; products without formula are sold and audited without stock decrement until operations configures their formula.

Each open cash session also has its own operational terminal:

```text
Admin Caja tab
  -> opens named cash session with base
  -> receives `/s/:branchId/caja/:cashSessionId/t/:accessToken`
  -> cashier uses the terminal endpoint to sell
  -> close_cash_session revokes the token
```

Terminal reads and writes are not direct table access. The public endpoint uses `get_cash_session_terminal` for the minimal product/session payload and `create_cash_session_sale` to validate the open cash-session token before creating the sale.

Cash-terminal sales also create an operational order:

```text
create_cash_session_sale
  -> create_sale
  -> sales / sale_items / sale_payments / sale_receipts
  -> orders / order_items with order_channel = cash_terminal
```

`sales.order_id` links the financial receipt to the kitchen/order ticket. The order starts as `confirmed` so staff can move it through preparation, ready, and delivered without re-confirming a paid counter sale.

Electronic invoicing for DIAN is intentionally deferred to a later provider/build decision.

## Warehouse Purchasing

Procurement is centralized at the warehouse:

```text
create_inventory_item_for_warehouse -> create_purchase_order -> receive_purchase_order
```

- Suppliers are registered per warehouse/brand.
- `supplier_items` store the unit cost and lead time a supplier offers for an item.
- Reception of a purchase order moves stock into `warehouse_stock`.

Implementation files:

```text
src/features/admin/components/WarehousePurchasingPanel.tsx
src/features/admin/hooks/useWarehousePurchasing.ts
src/features/admin/repositories/adminWarehousePurchasingRepository.ts
```

## Inventory & Merma

```text
src/features/admin/components/InventoryPanel.tsx
src/features/admin/hooks/useAdminInventory.ts
src/features/admin/repositories/adminInventoryRepository.ts (register_merma)
```

## Tracking & Operational Displays

Public/operational views outside the admin, read from `orders` + `order_items` with Realtime plus polling fallback:

- `/tracking/t/:trackingToken` — customer progress via secure RPC by token (no customer PII in payload).
- `/kitchen` — kitchen tray grouped by status, full item/note detail.
- `/salon` — public room screen with clean statuses and no internal data.
- `/tracking/:orderId` — demo/legacy by internal ID (mock only; not for public production links).

```text
src/features/tracking/OrderTrackingPage.tsx
src/features/tracking/KitchenDisplayPage.tsx
src/features/tracking/LiveRoomDisplayPage.tsx
src/features/tracking/orderTrackingRepository.ts
src/features/tracking/trackingUi.ts
```

Progress is tracked via a non-guessable `tracking_token` per order: created by the `create-order` Edge Function, returned to the guest as a `trackingUrl`, and consumed by a security-definer RPC (`get_order_tracking`) that exposes only safe fields (no phone, address, notes, or integration payloads).

Kitchen and room displays use separate branch-level tokens. `kitchen_display_token` unlocks the operational kitchen payload through `get_kitchen_display_orders`; `room_display_token` unlocks a reduced lobby payload through `get_room_display_orders`. The public `anon` role can read normal menu columns from `branches`, but cannot select those display-token columns.

## Integrations

A setup panel maps future channels and their expected contract:

```text
src/features/admin/components/IntegrationsPanel.tsx
src/features/admin/hooks/useAdminIntegrations.ts
src/features/integrations/didiFood/types.ts
```

DiDiFood is documented but disabled until an official store integration is enabled (`docs/didi-food-integration-plan.md`).

## Admin Roles

The profile role scopes which panels the user operates:

- `superadmin` — **report-only**: consolidated brand reports. In production/localdb the CRUD panels are hidden (see `AdminApp.tsx`); the mock (dev:mock/e2e) keeps full access for testing.
- `warehouse_admin` — central stock, suppliers, purchasing, dispatches.
- `branch_admin` — own catalog, branch stock, dispatch requests, orders.
- `cashier` — POS/order handling.

Scope resolution lives in `src/features/admin/repositories/adminScopeRepository.ts`.

Consolidated reports: `reportsTypes.ts`, `repositories/adminReportsRepository.ts`, `hooks/useAdminReports.ts`, `components/ReportsPanel.tsx`, backed by the RPC `report_brand_overview` (migration `202608160001`), gated to brand superadmins.

## Admin Flow

Main file:

```text
src/features/admin/AdminApp.tsx
```

UI components:

```text
src/features/admin/components/
src/features/admin/types.ts
```

State and data access:

```text
src/features/admin/hooks/
src/features/admin/repositories/
```

The admin is available at:

```text
/admin
```

Responsibilities:

- Sign in through Supabase Auth.
- Edit restaurant profile fields used by the public QR.
- Create categories; create/update products; toggle availability; upload images.
- Run the order tray (status changes, customer WhatsApp link).
- Manage inventory/merma, operations (dispatch lifecycle), and warehouse purchasing.
- Manage integration settings.

Admin tabs (see `AdminApp.tsx`):

```text
Pedidos       order tray, payments, and status
Menu          products, categories, prices
Inventario    stock, items, and merma
Operacion     warehouse, branches, and dispatches
Integraciones DiDiFood, payments, and channels
```

The `Pedidos` tab renders the warehouse purchasing panel for `warehouse_admin` users and the order tray otherwise.

Current split:

- `AdminApp.tsx` composes the admin screen and selects panels by role.
- `hooks/*` own session, menu, orders, inventory, operations, purchasing, and integrations.
- `repositories/*` wrap Supabase Auth, menu, order inbox, scope, inventory, operations, purchasing, and integrations.
- `adminMockRepository.ts` provides the local/e2e mock provider.

This keeps Supabase calls out of JSX and makes the next testing step clearer.

The admin requires Supabase configuration. If Supabase is not configured, the public menu still works from the local seed, but admin editing is disabled.

## Deployment

Hosting target:

```text
Netlify
```

Build configuration:

```text
netlify.toml
```

Build command:

```powershell
npm.cmd run build
```

Publish directory:

```text
dist
```

The QR should point to the production public menu URL, not to a temporary preview URL.

## Boundaries

Currently implemented:

- Public QR menu with WhatsApp handoff and seed fallback.
- Admin panel: order tray, menu editing, inventory/merma, operations, integrations.
- Superadmin report-only: consolidated brand reports via RLS-gated RPC (menu/inventory/ops hidden in production).
- Live tracking: customer, kitchen, and room displays (local/demo flow).
- Multi-brand distribution: `brands -> warehouses -> branches`, two-level stock, dispatch lifecycle.
- Warehouse purchasing: suppliers, offers, purchase orders, central stock reception.
- Order persistence, status event log, Realtime + polling.
- Edge Function for idempotent order creation, cart validation, and rate limiting.

Intentional exclusions for now:

- Payment processing stays out of the core; Wompi is earmarked and confirmed only by backend/webhook.
- DiDiFood stays documented/disabled until an official store integration exists.
- POS and DIAN invoicing are a later phase, not part of the public menu.

These are only added after the WhatsApp ordering flow is validated with real sellers.

## Change Guidelines

When changing architecture, keep these checks in mind:

- The public menu must remain fast and mobile-first.
- The WhatsApp message must remain clear enough for staff to act on immediately.
- Business-specific data should stay isolated behind branch records, env config, or seed files.
- Supabase failures should not break the QR menu.
- UI components should not call Supabase directly.
- Public ordering and admin ordering should use separate repositories.
- Edge Functions own trusted business rules; client totals are treated as hints.
- New infrastructure needs a clear reason tied to real seller needs.

Related docs:

```text
docs/framework-map.md
docs/diagrams.md
docs/scalability-map.md
docs/roadmap.md
docs/app-structure-multibrand.md
docs/live-order-tracking-plan.md
docs/admin-orders-operations.md
docs/order-fulfillment-flows.md
docs/supabase-admin-setup.md
docs/quality-gates.md
```
