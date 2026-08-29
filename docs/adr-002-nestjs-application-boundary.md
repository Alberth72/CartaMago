# ADR-002: NestJS Application Boundary

## Status

Accepted

## Context

CartaMago already has the core QR menu flow, four operational roles, multi-branch inventory, dispatches, mermas, cash sessions, manual payments, and internal receipts. The first client path points to 10 branches, and a second potential client points to 30 branches.

The database model is already Supabase/Postgres with multi-tenant tables and RLS. The next risk is not menu rendering; it is operational consistency across chain workflows.

## Decision

Introduce NestJS under `apps/api` as the application boundary for mature operational commands.

NestJS will not replace the public QR menu. It will gradually take ownership of commands that change money, stock, receipts, order states, or integration states.

## Migration Order

1. Caja / sales / internal receipts.
2. Inventory dispatch, receive, adjustments, and merma.
3. Public order persistence and order-state transitions.
4. Reports orchestration when queries/exports become heavy.
5. External integrations: DIAN, Wompi, WhatsApp API, DiDiFood, printers.

## Consequences

- React can keep the current menu and admin experience while command paths move one by one.
- Supabase/Postgres remains the source of truth.
- Existing RPCs can be wrapped first, then replaced with Nest services and transactions.
- API modules must enforce tenancy/role checks before writing.
- Commands triggered by public requests, retries, queues, or webhooks must be idempotent.

## Rollback

Each migrated command must keep the previous Supabase RPC path available until local smoke tests by role pass and the cloud rollout is explicitly approved.
