# Progress Dashboard

## Current Focus

```text
Build the operational warehouse cycle: central warehouse, two branches, stock movement, replenishment requests, dispatch, reception, and sale-based inventory decrement.
```

> La ruta de ejecución (fases, salidas y gates) está definida en `docs/roadmap.md`.

## Status

| Frente | Progress | Evidence | Current Gap | Next Decision |
| --- | --- | --- | --- | --- |
| Product Identity | Defined working name: CartaMago | `docs/product-identity.md` | Domain/social availability not verified | Decide whether CartaMago is final |
| AgentOps | Operating model expanded into specialist work cycles | `AGENTS.md`, `docs/agent-operating-model.md`, `docs/work-cycles.md`, `docs/technical-specialists.md` | Needs use during next cycles | Run Cycle 1 with the updated front model |
| Web UX | MVP scaffold implemented, public QR flow validated, mobile review flow corrected, sticky category nav added, and product-card quantity controls shipped | `src/features/menu/PublicMenuApp.tsx`, `npm.cmd run build`, `https://brasas-sazon-menu.netlify.app`, Netlify deploy `6a605782b659e16ba12e1aa4` | Needs visual QA on multiple phones | Inspect mobile and tune product-card density |
| Look & Feel | Public menu and admin panel refreshed with warmer Tailwind styling and a lightweight minimal chicken brand mark | `src/components/BrandMark.tsx`, `src/features/menu/PublicMenuApp.tsx`, `src/features/admin/AdminApp.tsx`, Netlify deploy `6a604cb184e8a56adc0b63ff` | Needs human visual review on phone and desktop | Tune logo proportions and product-card density after review |
| WhatsApp | Message composer implemented and manually verified | `src/features/order/orderMessage.ts`, user confirmed WhatsApp message received | MVP number configured; official number pending for launch test | Run `docs/whatsapp-launch-checklist.md` with the restaurant admin |
| Delivery | Netlify site renamed to white-label subdomain and production QR regenerated | `netlify.toml`, `https://brasas-sazon-menu.netlify.app`, `public/client-assets/brasas-sazon/processed/qr-netlify-production.png`, `public/client-assets/brasas-sazon/processed/qr-brasas-sazon-menu.png` | Production URL active | Share only the new QR/URL |
| Menu Data | MVP menu seed implemented | `src/data/restaurantSeed.ts` | Confirmed production prices still missing | Gather final product prices |
| Documentation | Framework and sales explanation added | `docs/framework-map.md`, `docs/diagrams.md`, `docs/client-sales-explanation.md` | Needs review during client conversation | Use docs to guide MVP narrative |
| Brasas & Sazon Adaptation | Business name, WhatsApp, visible menu categories and default product placeholder added | `src/data/restaurantSeed.ts`, `public/client-assets/brasas-sazon/processed/`, `docs/design-asset-workflow.md`, `docs/menu-extraction-brasas-sazon.md` | Prices mostly unclear in photos | Confirm price list before production deploy |
| Admin Workflow | Owner admin route tested with production login, product form, image upload, public QR update, and rollback | `src/features/admin/AdminApp.tsx`, `src/features/admin/components/`, Supabase Storage `menu-assets`, production smoke on `pollo-entero` | Needs real owner-provided image and prices | Run owner-supervised edit/upload and price confirmation |
| Supabase Setup | Remote project migrated to `branches/branch_id`, Edge Function redeployed, seed data preserved, public bucket policy active, admin member preserved | Supabase ref `utoifeenoqhddsrubsxy`, backup schema `pre_rollout_202608_branch`, `supabase/migrations/202608080001_multibrand_warehouse_formulas.sql`, `supabase/migrations/202608080002_unify_restaurants_into_branches.sql` | Owner must change temporary password before handing to client | Run real owner edit/upload cycle |
| Public MVP Preview | Stable Netlify URL, production QR, and WhatsApp handoff verified | `docs/public-mvp-preview.md`, `public/client-assets/brasas-sazon/processed/qr-netlify-production.png`, user confirmation | None for MVP sharing | Move to owner admin planning |
| Repository Readiness | Stabilization checkpoint merged to `master` and pushed to GitHub | Commit `9f646f1`, `git push origin master`, `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run test:e2e`, `npm.cmd run test:e2e:admin` | None for current rollout | Continue from clean `master` |
| Client Cycle | Cloud rollout unblocked; public menu, WhatsApp link, admin login/menu, `create-order`, and reversible image-upload cycle verified in production | Netlify deploy `6a7fbf1709294fda6d2c916f`, public smoke no console/network errors, WhatsApp `wa.me` link OK, smoke order created/deleted, `pollo-entero` upload verified and rolled back | Real product photo, official WhatsApp, and final prices still pending | Run owner-supervised phone test and content update |
| Operations Core | Backend/front slice implemented for bodega central, two sedes, role-scoped admin, dispatch requests, warehouse dispatch, branch reception, and sale decrement by formula | `supabase/migrations/202608150001_warehouse_dispatch_operations.sql`, `src/features/admin/repositories/adminScopeRepository.ts`, `src/features/admin/components/OperationsPanel.tsx`, `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run test:e2e:admin` | New migration not applied to Supabase cloud yet | Keep validating locally with branch and warehouse users before any cloud rollout |

## Next Slice

```text
Continue local validation: branch users must open their own sede by profile, warehouse users must manage central stock/dispatches, and no cloud rollout happens until this flow is accepted locally.
```
