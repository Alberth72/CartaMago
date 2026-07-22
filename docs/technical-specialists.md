# Technical Specialists

## Shared Baseline

- TypeScript is the default language.
- Phase 1 is a lightweight frontend app backed by Supabase for admin/menu data.
- Menu data has a local typed seed fallback and a live Supabase source.
- WhatsApp is the first ordering integration.
- Netlify is the production hosting target.
- Supabase owns auth, PostgreSQL data, and menu image storage.
- Tailwind CSS is the styling system.
- Keep the interface mobile-first and immediately usable after QR scan.
- Update docs when architecture, behavior, deployment, or team workflow changes.

## Orchestrator

Owns focus, sequencing, and delivery.

Must verify:

- The task is classified before implementation.
- The work is the smallest useful slice.
- The next decision is explicit.

## Product Specialist

Owns customer value and restaurant workflow.

Must verify:

- The user can understand the menu without help.
- The restaurant receives an actionable WhatsApp message.
- Required business details are captured before sending the order.

## Frontend Specialist: Vite + React

Owns the web app.

Must verify:

- Components are responsive.
- Cart interactions are clear.
- Empty states and missing menu data do not break the app.
- Build passes before delivery.

## UX Specialist: QR Menu

Owns mobile scan behavior.

Must verify:

- First viewport shows the restaurant and menu intent.
- Categories and product cards are easy to scan.
- Main order action remains reachable.
- Text does not overlap on small phones.

## Styling Specialist: Tailwind CSS

Owns visual consistency.

Must verify:

- Tailwind classes are readable and not over-abstracted.
- Design uses clear contrast and food-friendly visuals.
- The UI does not become a generic landing page.

## Data Modeling Specialist

Owns menu schemas, seed data, and Supabase table shape.

Must verify:

- Menu items have stable IDs.
- Prices are numbers, not display strings.
- Categories, options, and availability are represented consistently.
- Business-specific data stays isolated.
- Local seed and Supabase data stay compatible.

## Supabase Specialist

Owns database, auth, storage, policies, and environment variables.

Must verify:

- Public menu reads only the intended public data.
- Admin writes require an authenticated user.
- Storage bucket `menu-assets` accepts owner uploads.
- Netlify uses a public publishable/anon key, not a masked secret, for Vite.
- Service role keys are never committed or exposed in client code.

## Admin Experience Specialist

Owns the restaurant-owner workflow.

Must verify:

- Owner can log in from `/admin`.
- Owner can create/edit products and categories.
- Owner can upload and preview product images.
- Save failures are visible and actionable.
- The public QR menu updates after admin changes.

## WhatsApp Integration Specialist

Owns order message composition.

Must verify:

- `wa.me` links are URL-encoded.
- Phone number format is configurable.
- The message includes items, quantities, totals, customer notes, and fulfillment mode when available.
- The app does not claim the order is confirmed before WhatsApp is sent.

## DevOps Specialist: Netlify

Owns local commands, build output, and deployment.

Must verify:

- `npm.cmd run build` works on Windows PowerShell.
- Netlify build command and publish directory are documented.
- QR points to the production URL.

## QA Specialist

Owns practical validation.

Must verify:

- Add item.
- Change quantity.
- Remove item.
- Send WhatsApp message.
- Test on a mobile viewport.
- Build passes.

## Future Security Specialist

Activated for admin editing, auth, payments, customer/order storage, or multi-restaurant data.

Must verify:

- Secrets stay in environment variables.
- Seller data is not exposed across businesses.
- Admin routes are protected.
- Stored customer data has a clear purpose and retention policy.

## Sales Enablement Specialist

Owns client-facing narrative, proof, and adoption.

Must verify:

- The client understands the QR -> menu -> WhatsApp flow.
- The value is explained in terms of faster orders and fewer mistakes.
- The MVP is not presented as finished SaaS.
- Known gaps such as real prices are named before selling.
