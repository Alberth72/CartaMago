# NestJS Foundation

## Purpose

CartaMago is moving from a QR-menu MVP into a mature multi-branch operations platform. The QR menu remains the fastest customer entry point, while NestJS becomes the application boundary for operational commands that need stronger consistency, auditability, and integration control.

Current foundation:

```text
apps/api
  src/main.ts
  src/app.module.ts
  src/config/api.config.ts
  src/database/*
  src/health/*
  src/tenancy/*
```

## Runtime Shape

```text
Customer / staff
  -> React web app
  -> Supabase direct reads for fast menu/admin views where safe
  -> NestJS API for mature commands
  -> Postgres/Supabase as source of truth
```

The API starts independently from the web app:

```powershell
npm.cmd run api:dev
npm.cmd run api:build
npm.cmd run api:start
```

Health endpoints:

```text
GET /api/health
GET /api/health/live
GET /api/health/ready
```

`/api/health/ready` returns `degraded` when no `DATABASE_URL` is configured. This is intentional so the foundation can compile and run before command modules are migrated.

Migrated command endpoints:

```text
POST /api/cash/sales
POST /api/cash/session-sales
POST /api/orders/status
```

`/api/cash/sales` wraps the existing `create_sale` RPC and forwards the Supabase bearer token so current `auth.uid()` and RLS assumptions continue to work. `/api/cash/session-sales` wraps `create_cash_session_sale` for tokenized cash terminals.

`/api/orders/status` is the first order command moved into NestJS. React sends the Supabase bearer token, Nest updates the order through RLS, then sends the configured WhatsApp status template and records the attempt in `order_notifications` with the service-role key.

## Environment

```text
API_HOST=127.0.0.1
API_PORT=3333
API_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_API_BASE_URL=http://127.0.0.1:3333
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DATABASE_SSL=false
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_STATUS_TEMPLATE_CONFIRMED=pedido_confirmado
WHATSAPP_STATUS_TEMPLATE_PREPARING=pedido_en_preparacion
WHATSAPP_STATUS_TEMPLATE_READY=pedido_listo
WHATSAPP_STATUS_TEMPLATE_READY_DELIVERY=pedido_enviado
WHATSAPP_STATUS_TEMPLATE_DELIVERED=pedido_entregado
WHATSAPP_STATUS_TEMPLATE_CANCELLED=pedido_cancelado
```

Use `DATABASE_URL` for direct Postgres connectivity. Keep Supabase anon/service keys out of client-side files.

## Migration Strategy

We use a strangler pattern:

```text
Before: React -> Supabase RPC
Step 1: React -> Nest endpoint -> existing RPC/transaction
Step 2: React -> Nest service -> Postgres transaction + audit + idempotency
Step 3: Nest -> queues/webhooks/integrations when needed
```

This lets us mature one command at a time without rewriting the QR menu, admin UI, or database schema.

## What Moves To Nest First

Priority order:

1. Caja and operational sales: create sale, payment method, receipt, order ticket, stock decrement. First wrapper done in Nest; full service/transaction ownership still pending.
2. Inventory and merma: dispatch, receive, stock adjustments, waste registration, negative-stock protection.
3. Orders: status changes and WhatsApp state notifications first; public order persistence, confirmation, status events, and tracking token creation later.
4. Reports orchestration: heavy cross-branch queries and exports when RPC-only reporting becomes hard to maintain.
5. Integrations: DIAN, Wompi, WhatsApp API, DiDiFood, printers, webhooks, retries, idempotency.

## What Stays Outside Nest For Now

- Public QR menu rendering.
- Local TypeScript seed fallback.
- Static Netlify web deploy.
- Simple safe reads that Supabase RLS already handles well.
- Product images in Supabase Storage.

## Module Target

Future Nest modules should follow this shape:

```text
auth/
tenancy/
branches/
orders/
cash/
inventory/
waste/
dispatches/
purchasing/
reports/
integrations/
```

Each command module should:

- Receive authenticated user context.
- Resolve `brand_id`, `branch_id`, `warehouse_id`, and role.
- Validate the role before writing.
- Execute writes inside a transaction.
- Emit an audit/event row when the operation changes money, stock, order state, or integration state.
- Be idempotent when triggered by public forms, retries, queues, or webhooks.

## Tenancy Boundary

Current role vocabulary is shared with the web app:

```text
superadmin
warehouse_admin
branch_admin
cashier
```

The first foundation service in `apps/api/src/tenancy` centralizes this role vocabulary for future guards. It does not replace Supabase RLS yet; it gives the API a place to enforce application rules before calling Postgres.

## Definition Of Done For Migrated Commands

For every command moved to Nest:

- Existing React flow still works.
- Supabase/RPC behavior is either wrapped or replaced deliberately.
- Unit tests cover role/scope validation.
- Integration or local smoke covers the real database path.
- Docs name the old path, new path, and rollback path.

## Current Rollback

The React repositories try Nest only when `VITE_API_BASE_URL` is configured. If the API is unavailable or returns a server-side failure, the app falls back to the existing Supabase RPC path:

```text
src/features/admin/repositories/adminOperationsRepository.ts -> create_sale
src/features/cash-terminal/cashTerminalRepository.ts -> create_cash_session_sale
src/features/admin/repositories/adminOrderRepository.ts -> direct orders update
```
