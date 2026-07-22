# CartaMago

CartaMago is a lightweight QR menu and WhatsApp ordering app for restaurants and local food sellers.

First MVP vertical:

```text
Asadero de pollos
```

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, and Storage
- WhatsApp `wa.me` order handoff
- Netlify static hosting

## Documentation

- [Framework map](./docs/framework-map.md)
- [Architecture](./docs/architecture.md)
- [Scalability map](./docs/scalability-map.md)
- [Admin menu guide](./docs/admin-menu-guide.md)
- [WhatsApp launch checklist](./docs/whatsapp-launch-checklist.md)
- [Public MVP preview](./docs/public-mvp-preview.md)
- [Supabase admin setup](./docs/supabase-admin-setup.md)
- [Architecture and process diagrams](./docs/diagrams.md)
- [GitHub publish checklist](./docs/github-publish-checklist.md)
- [Client sales explanation](./docs/client-sales-explanation.md)
- [Design asset workflow](./docs/design-asset-workflow.md)
- [Brasas & Sazon menu extraction](./docs/menu-extraction-brasas-sazon.md)
- [Product identity](./docs/product-identity.md)
- [Agent operating model](./docs/agent-operating-model.md)
- [Work cycles](./docs/work-cycles.md)
- [Quality gates](./docs/quality-gates.md)

## Local Commands

Use Windows PowerShell from `D:\Github\CartaMago`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

## Source Structure

```text
src/
  app/              App shell and route selection
  components/       Shared UI
  data/             Local fallback seed
  features/
    admin/          Owner admin UI, hooks, and Supabase repositories
    menu/           Public QR menu
    order/          WhatsApp order message composition
  lib/              Shared helpers
  services/         Shared Supabase config and public menu repository
supabase/
  migrations/       Database schema history
  seed.sql          Reproducible demo seed
public/
  client-assets/    Restaurant photos, processed assets, and QR outputs
```

## MVP Flow

1. Customer opens the QR menu.
2. Customer browses categories and adds items.
3. Customer chooses pickup, delivery, or table.
4. Customer sends the prefilled WhatsApp order.
5. Restaurant confirms availability and time in WhatsApp.

## Configure The MVP

Production restaurant and menu data is managed from:

```text
/admin
```

The fallback seed lives in:

```text
src/data/brasasSazonMenu.ts
```

Current Brasas & Sazon fallback number:

```text
whatsappNumber: '573104217941'
```

Use international format without `+`, spaces, or punctuation.

For an official WhatsApp launch test, follow `docs/whatsapp-launch-checklist.md`.

## Environment

Copy `.env.example` to `.env.local` for local Supabase-backed testing:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_RESTAURANT_ID=brasas-sazon
VITE_MENU_STORAGE_BUCKET=menu-assets
```

If these variables are missing, the public menu still works with `src/data/brasasSazonMenu.ts`. The `/admin` route requires Supabase.

## Netlify

The project includes `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

After deploy, generate a QR that points to the production URL.

## GitHub First Push

After creating the empty GitHub repo:

```powershell
git remote add origin https://github.com/<owner>/<repo>.git
git add .
git commit -m "Initial CartaMago MVP"
git branch -M main
git push -u origin main
```

Do not commit `.env.local`, `.admin-credentials.local`, `node_modules/`, `dist/`, or `.netlify/`.
