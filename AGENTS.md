# CartaMago Agents Guide

## Product Mission

Build CartaMago as a lightweight QR menu and WhatsApp ordering platform for restaurants, fast food shops, food trucks, cafes, and small local sellers.

The first target customer is a roast chicken restaurant, but the product must stay reusable for future businesses.

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

Phase 1, demo and early customers:

- Web: Vite + React + TypeScript.
- Styling: Tailwind CSS.
- Ordering handoff: WhatsApp click-to-chat links.
- Hosting: Netlify static deploy.
- Data source: local TypeScript/JSON menu files.
- QR: generated QR pointing to the deployed menu URL.

Phase 2, when customers need admin or multi-tenant data:

- Backend: Supabase first, then a custom API only when business rules require it.
- Database: PostgreSQL through Supabase.
- Storage: Supabase Storage or another low-cost image host.
- Auth: seller/admin auth only when menu editing is exposed.
- Payments: keep out of phase 1; add only after WhatsApp ordering is stable.

## Agent Operating Mode

Use this cycle for every task:

```text
Enfocar -> Ejecutar -> Validar -> Decidir
```

Before implementation, classify the task:

```text
Frente:
Impacto:
Cambio minimo:
Validacion:
Siguiente decision:
```

Priority order:

1. Customer can scan, read, and order quickly.
2. WhatsApp message is clear and actionable.
3. Menu data is easy to update.
4. Mobile performance and readability.
5. Deploy and QR reliability.
6. Reusable structure for multiple businesses.
7. Seller/admin tools.
8. Visual polish.

## Hard Rules

- Do not build a heavy ecommerce backend for the first demo.
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
  app/              App shell and routing
  components/       Reusable UI
  data/             Local restaurant/menu data
  features/
    menu/           Menu browsing
    order/          Cart and WhatsApp message composition
  lib/              Shared helpers
docs/
  agent-operating-model.md
  technical-specialists.md
  quality-gates.md
  product-identity.md
  progress-dashboard.md
public/
  assets/           Logos, product photos, QR outputs
```

## Common Workflow

1. Inspect relevant files.
2. Classify the task with the CartaMago operating mode.
3. Explain the intended change briefly.
4. Implement a small useful slice.
5. Validate with the smallest relevant command.
6. Update docs when architecture, behavior, runtime, deployment, or agent guidance changes.
7. Close with changed files, validation, residual risk, and next recommended gap.

## Definition Of Done

```text
Implemented
+ validated
+ documented when behavior or architecture changed
+ mobile flow checked
+ residual risk named
+ next decision clear
```
