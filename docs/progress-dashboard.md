# Progress Dashboard

## Current Focus

```text
Stabilize CartaMago: keep build/tests/docs aligned before the next client-facing slice.
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
| Admin Workflow | Owner admin route tested by user with Supabase login, product form, category form and image upload support; UI split into components, hooks, and repositories | `src/features/admin/AdminApp.tsx`, `src/features/admin/components/`, `src/features/admin/hooks/`, `src/features/admin/repositories/`, `docs/supabase-admin-setup.md`, user confirmation | Needs real product edit/image validation | Run visual owner workflow in `/admin` |
| Supabase Setup | Remote project linked, migration applied, seed loaded, public bucket policy created, Netlify env connected, admin user created, login fixed, and upload policy tested | Supabase ref `utoifeenoqhddsrubsxy`, `supabase/migrations/202607220001_admin_menu_schema.sql`, `supabase/seed.sql`, Netlify deploy `6a6040817b6133755b93f3cd`, admin `aramirez.red@gmail.com` | Owner must change temporary password before handing to client | Add owner/restaurant membership policies |
| Public MVP Preview | Stable Netlify URL, production QR, and WhatsApp handoff verified | `docs/public-mvp-preview.md`, `public/client-assets/brasas-sazon/processed/qr-netlify-production.png`, user confirmation | None for MVP sharing | Move to owner admin planning |
| Repository Readiness | Build/lint restored after incomplete Supabase/slug extraction; E2E public/admin mock green; docs/scripts aligned to `VITE_BRANCH_ID` | `src/services/menuRepository.ts`, `src/services/supabaseClient.ts`, `src/lib/slug.ts`, `tests/e2e/admin.spec.ts`, `tests/stress/cartamago-load.js`, `docs/roadmap.md`, `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run test:e2e`, `npm.cmd run test:e2e:admin` | Tree still has uncommitted stabilization changes | Review diff and commit a coherent stabilization checkpoint |
| Client Cycle | Blocked against Supabase cloud because the remote schema still exposes `restaurant_id`; `branches`/`branch_id` are not deployed there yet | Direct REST smoke test against configured cloud returned missing `branches`, `categories.branch_id`, and `products.branch_id` | Need coordinated DB migration/deploy before real `/admin` product edit | Decide rollout: migrate cloud to `branches/branch_id` with app deploy, or temporarily restore app compatibility with old `restaurants/restaurant_id` |

## Next Slice

```text
Commit the stabilization checkpoint, then unblock the client cycle by aligning Supabase cloud with the app schema (`branches/branch_id`) or by restoring temporary compatibility with the old cloud schema.

After the schema is aligned: edit one real product in `/admin`, upload a real image, verify the public QR menu updates, test WhatsApp again, and replace temporary prices with confirmed prices.

For the official WhatsApp test, use `docs/whatsapp-launch-checklist.md` and save the restaurant number from `/admin`.
```
