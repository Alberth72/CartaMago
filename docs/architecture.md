# Architecture

## Purpose

This document is the technical map for CartaMago's current MVP.

The product stays intentionally lightweight:

```text
QR -> Public menu -> Cart -> WhatsApp order -> Restaurant confirms
```

Supabase is used for editable menu data, but the public menu keeps a local TypeScript seed fallback so the QR experience still works if the database is not configured or a request fails.

## Current Runtime Shape

```text
Customer phone
  -> QR / production URL
  -> Netlify static site
  -> Vite + React app
  -> Supabase menu data, with seed fallback
  -> Cart state in browser
  -> wa.me link with encoded order message
  -> Restaurant WhatsApp
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
src/main.tsx
src/features/menu/PublicMenuApp.tsx
src/features/menu/hooks/usePublicMenuOrder.ts
src/index.css
```

Responsibilities:

- Route between the public menu and `/admin` in the app shell.
- Render restaurant profile, hero, categories, products, physical menu photos, and cart.
- Keep cart and customer details in client state.
- Generate the WhatsApp order URL from the current cart.

There is no custom backend in phase 1. Netlify serves the built `dist/` output.

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

Supabase tables used by the app:

```text
restaurants
categories
products
menu_photos
```

Storage bucket used for product images:

```text
menu-assets
```

Runtime environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_RESTAURANT_ID
VITE_MENU_STORAGE_BUCKET
```

Defaults:

```text
VITE_RESTAURANT_ID=brasas-sazon
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
- Create categories.
- Create and update products.
- Toggle product availability.
- Upload product images to Supabase Storage.

Current split:

- `AdminApp.tsx` composes the admin screen.
- `hooks/useAdminAuth.ts` owns session state, login, and logout.
- `hooks/useAdminMenu.ts` owns editable menu state and UI commands.
- `repositories/adminAuthRepository.ts` wraps Supabase Auth calls.
- `repositories/adminMenuRepository.ts` wraps menu queries, saves, and image uploads.
- `repositories/adminOrderRepository.ts` wraps order inbox reads, status updates, and Realtime subscriptions.

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

Current MVP includes:

- Public QR menu.
- Browser cart.
- WhatsApp order handoff.
- Supabase-backed editable menu.
- Local seed fallback.
- Admin login and product/image editing.
- Order inbox with Realtime subscription and polling fallback.
- Order status event log for auditable transitions.
- Edge Function for idempotent order creation, cart validation, and rate limiting.

Current MVP intentionally excludes:

- Payment processing.
- Custom ecommerce backend.
- Multi-tenant owner dashboard.
- Fully automated DiDiFood/payment webhooks.

These should only be added after the WhatsApp ordering flow is validated with real sellers.

## Change Guidelines

When changing architecture, keep these checks in mind:

- The public menu must remain fast and mobile-first.
- The WhatsApp message must remain clear enough for staff to act on immediately.
- Business-specific data should stay isolated behind restaurant records, env config, or seed files.
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
docs/supabase-admin-setup.md
docs/quality-gates.md
```
