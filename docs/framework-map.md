# Framework Map

## Purpose

This document explains each framework or tool used by CartaMago and how it influences the product.

CartaMago's first version is intentionally small:

```text
QR -> Web menu -> Cart -> WhatsApp order -> Restaurant confirms
```

That means the stack optimizes for speed, mobile readability, low cost, and easy deployment.

## Stack Summary

| Tool | Role | How it helps CartaMago |
| --- | --- | --- |
| Vite | Local dev server and production bundler | Makes the app fast to develop and produces a static `dist/` folder for Netlify |
| React | UI framework | Keeps menu, categories, cart, and order form interactive without a backend |
| TypeScript | Type safety | Makes products, prices, categories, and WhatsApp message data harder to break |
| Tailwind CSS | Styling system | Speeds up mobile-first design directly in components |
| Supabase | Database, Auth, and Storage | Lets the owner edit menu data and upload product images while preserving a local fallback |
| lucide-react | Icon library | Adds clear visual actions for add, remove, cart, and send |
| WhatsApp `wa.me` | Ordering handoff | Sends a structured order to the restaurant without building order infrastructure |
| Netlify | Static hosting | Publishes the QR menu quickly with a public URL |
| Oxlint | Code linting | Catches common code issues quickly |

## Vite

Vite is the project runtime for development and build.

In CartaMago, Vite influences:

- Local development through `npm.cmd run dev`.
- Fast hot reload while changing menu UI.
- Production output in `dist/`.
- Netlify compatibility because the final app is static.

Important file:

```text
vite.config.ts
```

Current use:

```text
React plugin + Tailwind plugin
```

Why it matters for the client:

```text
It lets us deliver a public menu quickly while still supporting Supabase-backed editing.
```

## React

React owns the interactive experience.

In CartaMago, React influences:

- Category selection.
- Product cards.
- Cart quantity changes.
- Pickup, delivery, or table selection.
- Customer notes.
- WhatsApp link generation based on current cart state.

Important file:

```text
src/features/menu/PublicMenuApp.tsx
```

Why it matters for the client:

```text
The customer does not only read a PDF. They build an order that arrives organized.
```

## TypeScript

TypeScript keeps the data shape explicit.

In CartaMago, TypeScript influences:

- Product IDs.
- Category IDs.
- Numeric prices.
- Fulfillment modes.
- Restaurant WhatsApp configuration.
- Cart message composition.

Important files:

```text
src/data/restaurantSeed.ts
src/features/order/orderMessage.ts
```

Why it matters for the client:

```text
It reduces mistakes when updating products, prices, and order formats.
```

## Tailwind CSS

Tailwind is the styling system.

In CartaMago, Tailwind influences:

- Mobile-first layout.
- Sticky WhatsApp action.
- Product card spacing.
- Button states.
- Category tabs.
- Fast visual iteration before a client MVP.

Important files:

```text
src/index.css
src/features/menu/PublicMenuApp.tsx
```

Why it matters for the client:

```text
It lets us adapt the menu to the restaurant's colors and style quickly.
```

## lucide-react

lucide-react provides icons as React components.

In CartaMago, lucide-react influences:

- Add item action.
- Remove quantity action.
- Delete item action.
- Cart indicator.
- Send to WhatsApp action.

Why it matters for the client:

```text
Icons reduce reading effort on a phone and make ordering feel faster.
```

## Supabase

Supabase provides the editable data layer for the MVP.

In CartaMago, Supabase influences:

- Public menu reads from `restaurants`, `categories`, `products`, and `menu_photos`.
- Public menu falls back to `src/data/restaurantSeed.ts` if Supabase is unavailable.
- `/admin` login uses Supabase Auth.
- Product image upload uses Supabase Storage bucket `menu-assets`.
- Admin operations are isolated in feature repositories and hooks.

Important files:

```text
src/services/menuRepository.ts
src/features/admin/hooks/useAdminAuth.ts
src/features/admin/hooks/useAdminMenu.ts
src/features/admin/repositories/adminAuthRepository.ts
src/features/admin/repositories/adminMenuRepository.ts
supabase/migrations/202607220001_admin_menu_schema.sql
supabase/seed.sql
```

Why it matters for the client:

```text
The owner can update the menu without a developer, while the QR menu stays simple and resilient.
```

## WhatsApp `wa.me`

WhatsApp is the first ordering integration.

In CartaMago, WhatsApp influences:

- No order backend is required for the first MVP.
- The restaurant keeps using a tool they already know.
- The customer sends a clear order with products, quantities, total, delivery mode, name, and notes.

Important file:

```text
src/features/order/orderMessage.ts
```

Why it matters for the client:

```text
Instead of receiving messy messages like "quiero un pollo", the seller receives a structured order.
```

## Netlify

Netlify hosts the static app.

In CartaMago, Netlify influences:

- Simple public deployment.
- QR-ready URL.
- No server maintenance for phase 1.
- Low-cost launch path.

Important file:

```text
netlify.toml
```

Why it matters for the client:

```text
The restaurant can start selling from a QR without paying for custom infrastructure.
```

## Oxlint

Oxlint checks the code quickly.

In CartaMago, Oxlint influences:

- Basic code quality.
- Faster feedback before MVP review.
- Less chance of obvious React or TypeScript mistakes.

Command:

```powershell
npm.cmd run lint
```

## How The Stack Stays Practical

CartaMago avoids these in phase 1:

- Heavy ecommerce backend.
- Payment gateway.
- Order dashboard.
- Custom order API.

Those can come later, but only after validating that restaurants want this flow.

Phase 1 is successful when:

```text
A customer scans, orders, and the restaurant receives a clear WhatsApp message.
```
