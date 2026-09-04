# CartaMago Agents Guide

## Product Mission

Build CartaMago as a multi-branch restaurant operations platform whose customer entry point is a lightweight QR menu and WhatsApp ordering flow.

The first customer profile is a roast chicken chain, and the product must support future chains with many branches without duplicating code per business.

## Product Name

Working name: **CartaMago**

Why:

- It is short and easy to say in Spanish.
- It suggests a menu that turns into an order with a little magic.
- It works beyond one restaurant category.
- It can grow from QR menus into ordering, promotions, loyalty, and seller tools.

Tagline draft:

```text
Tu carta cobra vida.
```

## Target Stack

Phase 1, MVP and early customers:

- Web: Vite + React + TypeScript.
- Styling: Bootstrap isolated through `src/styles/framework/`, with CartaMago-owned utilities in `src/index.css`.
- Ordering handoff: WhatsApp click-to-chat links.
- Hosting: Netlify static deploy.
- Data source: Supabase-backed menu with local TypeScript seed fallback.
- QR: generated QR pointing to the deployed menu URL.
- Admin: owner login, category/product editing, availability, and image upload.

Phase 2, when customers need multi-tenant data and stronger operations:

- Backend: NestJS application API for mature operational commands, introduced gradually without breaking the QR menu.
- Database: PostgreSQL through Supabase.
- Storage: Supabase Storage or another low-cost image host.
- Auth: seller/admin auth with owner/restaurant restrictions.
- Payments: keep out of phase 1; add only after WhatsApp ordering is stable.

## Agent Operating Mode (Light)

Use 5 rules to keep tokens low and focus high:

### Rule 1: One-line focus (internal only)

Before each task, write in `<thinking>`:
```
Frente: [name]
Meta: [what this achieves]
Cambio: [files to touch]
```
Do not print this to the user.

### Rule 2: Plan + execute in one cycle

No separate "here's my plan, do you approve?" step. Read, implement, validate, deliver.

### Rule 3: Short delivery format

Close each task with:
```
[what changed] + [files changed] + [build: ok/error]
```
No tables, no code dumps, no repeated file contents.

### Rule 4: Don't re-read docs

Skip `docs/agent-operating-model.md`, `docs/technical-specialists.md`, `docs/work-cycles.md`, `docs/multi-agent-operating-model.md` unless the task specifically requires them. Query them only when the current problem demands it.

### Rule 5: Batch when safe

Create or edit multiple related files in one tool call when there's no dependency between them (e.g. creating 3 new components at once).

## Priority order

1. Customer can scan, read, and order quickly.
2. WhatsApp message is clear and actionable.
3. Menu data is easy to update.
4. Mobile performance and readability.
5. Deploy and QR reliability.
6. Reusable structure for multiple brands and branches.
7. Mature operational backend boundaries.
8. Seller/admin tools.
9. Visual polish.

## Current MVP State

Core validated flow:

```text
QR -> Public web menu -> Cart -> WhatsApp order -> Restaurant confirms
```

Validated in production:

- Netlify production URL is active.
- QR opens the public menu.
- WhatsApp order handoff works.
- Supabase project is linked; `create-order` redeployed.
- Public menu reads Supabase data with local seed fallback.
- `/admin` login works.
- Admin can edit menu data and upload images to `menu-assets`.
- Order is persisted and appears in the admin order tray.
- Operations (bodega/sedes/purchasing/tracking) validated locally.
- NestJS API foundation exists under `apps/api` with health/readiness endpoints and tenancy role types.

Current production URL:

```text
https://brasas-sazon-menu.netlify.app
```

Current admin URL:

```text
https://brasas-sazon-menu.netlify.app/admin
```

Deploy/build: `npm.cmd run build` (tsc -b + quiet vite build) -> `dist/` on Netlify. Use `npm.cmd run build:verbose` only when chunk/assets need inspection. Modes: `dev`, `dev:mock`, `dev:localdb`, `build:localdb`.
API build: `npm.cmd run api:build`. API dev: `npm.cmd run api:dev` -> `http://127.0.0.1:3333/api`.

## Hard Rules

- Do not build a heavy ecommerce backend for the first MVP.
- Do not add payment processing until the WhatsApp ordering flow is validated with real sellers.
- Do not make the first screen a marketing landing page; the menu must be immediately usable.
- Keep the app mobile-first because the primary entry point is a QR scan.
- Keep the ordering action visible and fast.
- Do not store secrets in source files.
- Use static data first unless a feature truly needs a backend.
- Keep business-specific content isolated so another restaurant can be added quickly.

## Target Repository Shape

```text
src/
  app/              App shell and route selection
  components/       Reusable UI
  data/             Local restaurant/menu data
  features/
    admin/          Owner admin UI, hooks, and Supabase/mock repositories
    menu/           Menu browsing
    order/          Cart and WhatsApp message composition
    tracking/       Customer, kitchen, and room displays
    integrations/   External channel contracts (e.g. didiFood)
  lib/              Shared helpers
  services/         Shared Supabase config and public menu repository
apps/
  api/              NestJS application boundary for operations, inventory, caja, receipts, and integrations
docs/
  architecture.md
  diagrams.md
  framework-map.md
  scalability-map.md
  roadmap.md
  progress-dashboard.md
  agent-operating-model.md
  multi-agent-operating-model.md
  adr-template.md
  quality-gates.md
  product-identity.md
public/
  client-assets/    Restaurant source/processed assets and QR outputs
supabase/
  migrations/       Database schema history
  seed.sql          Reproducible demo seed
```

## Common Workflow

1. Inspect relevant files.
2. Classify the task with Rule 1 (internal thinking only).
3. Implement a small useful slice.
4. Validate with the smallest relevant command.
5. Update docs when architecture, behavior, runtime, deployment, or agent guidance changes.
6. Close with short delivery format (Rule 3).

## Definition Of Done

```text
Implemented
+ validated
+ documented when behavior or architecture changed
+ mobile flow checked
+ residual risk named
