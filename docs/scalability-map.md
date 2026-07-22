# Scalability Map

## Purpose

This map keeps CartaMago scalable without turning the MVP into heavy ecommerce software too early.

The north star is still:

```text
Customer scans -> reads fast -> orders by WhatsApp -> seller confirms
```

## Current Structure

```text
src/
  app/              App shell and route selection
  components/       Reusable UI shared across features
  data/             Local fallback restaurant/menu seed
  features/
    admin/          Owner editing experience
      components/   Admin panels and forms
      hooks/        Admin state and workflow commands
      repositories/ Supabase adapters for admin operations
    menu/           Public QR menu experience
    order/          Cart-to-WhatsApp message composition
  lib/              Small shared helpers
  services/         External data access and adapters
```

This is the right shape for the current project because it separates product domains without adding framework complexity.

## Scaling Stages

| Stage | Trigger | Add | Avoid |
| --- | --- | --- | --- |
| Single restaurant MVP | One active seller validating QR ordering | Keep seed fallback, Supabase tables, WhatsApp handoff | Payments, order dashboard, custom API |
| Editable operations | Seller updates menu weekly | Stronger admin forms, image rules, availability, audit-friendly docs | Multi-tenant dashboard before a second seller exists |
| Multi-restaurant | Two or more sellers need live data | Restaurant selector by slug/subdomain, RLS per owner, shared UI settings | Duplicating code per restaurant |
| Order operations | WhatsApp becomes hard to track | Lightweight order capture plus WhatsApp notification | Replacing WhatsApp before staff workflow is validated |
| Growth tools | Sellers ask for retention | Promotions, loyalty, analytics, QR campaign tracking | Broad CRM features without usage proof |

## Folder Rules

Use these rules when adding code:

- `src/app`: route shell, providers, app-level configuration.
- `src/features/menu`: public customer menu browsing and menu-specific UI.
- `src/features/order`: cart models, totals, WhatsApp message composition, future order capture.
- `src/features/admin`: owner/admin workflows.
- `src/services`: Supabase access, storage adapters, remote repositories.
- `src/data`: fallback seeds and business-specific local data only.
- `src/components`: reusable UI primitives that are not owned by one feature.
- `src/lib`: pure helpers such as formatting, validation, and small utilities.

If a component is used by only one feature, keep it inside that feature. Move it to `components` only after reuse is real.

## Data Scalability

Current data path:

```text
Supabase rows -> menuRepository -> UI models -> public menu/admin
```

Fallback path:

```text
brasasSazonMenu.ts -> menuRepository -> UI models
```

Next scalable data decisions:

- Add `restaurant.slug` before adding a second public menu URL.
- Keep `restaurant_id` on every business table.
- Enforce Supabase RLS before onboarding a second owner.
- Keep image paths business-scoped, for example `brasas-sazon/products/...`.
- Preserve the seed fallback as a demo and emergency mode.

## UI Scalability

The public menu should remain mobile-first and direct. Future UI additions should not block ordering.

Completed splits:

- Admin shell, setup notice, login, restaurant panel, category panel, product grid, and product editor inside `features/admin/components`.
- Admin auth and editable-menu workflows inside `features/admin/hooks`.
- Supabase auth, menu saving, loading, and image upload calls inside `features/admin/repositories`.

Good next splits:

- Product card component inside `features/menu`.
- Category tabs component inside `features/menu`.
- Cart panel component inside `features/order` or `features/menu`, depending on whether it remains WhatsApp-only.
- Admin repository tests when save/load rules become more complex.

Avoid global UI abstractions until at least two screens use the same pattern.

## Operational Scalability

Before adding a custom backend, validate:

- The seller receives enough WhatsApp orders to need tracking.
- Staff actually want a dashboard instead of WhatsApp-only confirmation.
- Menu editing needs roles, history, or approvals.
- Multiple sellers need separated owner access.

When those are true, Supabase should remain the first backend. A custom API comes later only for business rules Supabase cannot express cleanly.

## Cleanup Policy

Safe to keep out of source control:

- `node_modules/`
- `dist/`
- `.netlify/`
- `.tmp-*.log`
- Vite/React starter assets under `src/assets/` when unused.

Must stay in source control:

- `src/data/brasasSazonMenu.ts` as fallback seed.
- `supabase/migrations/` for schema history.
- `supabase/seed.sql` for reproducible demo data.
- `public/client-assets/brasas-sazon/processed/` assets used by the public menu.
- QR images that point to active production or documented preview URLs.

## Next Refactor Decision

The admin UI has been split into focused components:

```text
features/admin/
  AdminApp.tsx
  types.ts
  components/
    AdminShell.tsx
    AdminSetupNotice.tsx
    LoginForm.tsx
    RestaurantPanel.tsx
    CategoryPanel.tsx
    ProductGrid.tsx
    ProductEditor.tsx
  hooks/
    useAdminAuth.ts
    useAdminMenu.ts
  repositories/
    adminAuthRepository.ts
    adminMenuRepository.ts
```

The next admin refactor should add tests around repository behavior once loading, saving, image upload, or auth rules become more complex.
