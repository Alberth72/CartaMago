# Admin Menu Guide

## Correction

Do not invent products.

Every product must come from one of these sources:

- The restaurant's physical menu.
- A written price list sent by the restaurant.
- A direct confirmation from the owner or manager.

Examples in this guide use existing Brasas & Sazon products only.

## Product Admin Goal

CartaMago must let the restaurant owner update the menu without depending on us.

The target admin flow is:

```text
Owner logs in -> edits products/categories/prices -> saves -> QR menu updates
```

The current file-based menu is the MVP fallback seed. The live public menu reads from Supabase when environment variables are configured.

## Current MVP Seed

The current seed fallback lives in:

```text
src/data/restaurantSeed.ts
```

This file controls:

- Restaurant name.
- WhatsApp number.
- Hero image.
- Social handle.
- Fulfillment modes.
- Categories.
- Products.
- Prices.
- Badges.
- Product availability.
- Default product placeholder image.

This is useful for the MVP because it lets us ship quickly, but it is not the final owner experience.

## Current MVP Price

All visible products are currently configured at:

```text
26000 COP
```

Reason:

```text
USD 8 x approx. 3220 COP = 25760 COP, rounded to 26000 COP.
```

This is a temporary MVP price. Replace it with the real restaurant price list before production.

## Create Products Safely

Use only products confirmed by the restaurant. Example using an existing Brasas & Sazon item:

```ts
{
  id: 'churrasco',
  categoryId: 'asados',
  name: 'Churrasco 300 gr',
  description: 'Con papa a la francesa, arepa, queso y ensalada dulce.',
  price: 26000,
  available: true,
},
```

Rules:

- `id` must be unique.
- `categoryId` must match an existing category.
- `name` must match the restaurant's menu or owner confirmation.
- `price` is a number in Colombian pesos.
- `available` controls whether the item can be ordered.

## Edit Existing Products

Change only the data:

```ts
price: 26000,
```

Do not write:

```ts
price: '$26.000',
```

The app formats COP prices automatically.

## Hide Products

Set:

```ts
available: false,
```

Local seed fallback behavior:

- The product remains in data.
- The add button is disabled.

Current owner-admin behavior:

- The owner toggles `Disponible / Agotado` from the admin panel.

## Owner Admin MVP

The codebase now includes a real admin surface at:

```text
/admin
```

Recommended stack:

```text
Supabase Auth + Supabase Postgres + React admin route
```

Why:

- Owner can log in.
- Owner edits data from a form.
- Public QR menu reads the latest published menu.
- We stop depending on code changes for content edits.
- It stays lightweight and low-cost.

Setup instructions live in:

```text
docs/supabase-admin-setup.md
```

## Local Admin

The local admin route uses the same Supabase environment variables as production.

Create `.env.local` from `.env.example` and set:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_RESTAURANT_ID
VITE_MENU_STORAGE_BUCKET
```

Then restart Vite. Environment variables are loaded when the dev server starts.

```powershell
npm.cmd run dev
```

Local URLs:

```text
http://localhost:5173/
http://localhost:5173/admin
```

## Product Images

The public menu uses this image priority:

```text
product image -> default product placeholder
```

That is why products stay visually consistent while the restaurant prepares real product photos.

The admin panel shows this distinction intentionally:

- `Imagen propia`: the product has its own `image_url`.
- `Imagen por defecto`: CartaMago uses `product-placeholder-preparing.png`.

When the owner uploads a product image from `/admin`, CartaMago stores it in Supabase Storage bucket `menu-assets` and saves the public URL on the product.

The editor also lets the owner clear a product image with `Usar defecto`.

## Admin Screens

Minimum owner admin:

```text
/admin/login
/admin/menu
/admin/categories
/admin/products/new
/admin/products/:id
```

For the first admin MVP, one screen can be enough:

```text
/admin/menu
```

It should include:

- Restaurant profile.
- WhatsApp number.
- Categories list.
- Product list.
- Create product.
- Edit product.
- Delete product with confirmation.
- Price field.
- Availability toggle.
- Save button.

Current admin shortcut:

```text
/admin -> Restaurante -> WhatsApp / Frase principal / Texto del encabezado -> Guardar datos
```

Those fields update `public.restaurants`. The public QR menu uses them for the hero copy and for the WhatsApp number used when the customer taps `Pedir por WhatsApp`.

## Data Model For Admin

Minimum tables:

```text
restaurants
categories
products
menu_photos
```

Suggested fields:

```text
restaurants
- id
- name
- whatsapp_number
- headline
- description
- social_handle
- hero_image_url

categories
- id
- restaurant_id
- name
- description
- sort_order

products
- id
- restaurant_id
- category_id
- name
- description
- price_cop
- badge
- available
- sort_order

menu_photos
- id
- restaurant_id
- title
- image_url
- sort_order
```

## Quality Rules

- The owner can only edit their own restaurant.
- Customer QR menu should not require login.
- WhatsApp number must be saved in international format without `+`.
- Prices are numeric COP values.
- The app must show clear errors if save fails.
- Product creation must not allow empty name, invalid price, or missing category.

## Official WhatsApp Launch

Use `docs/whatsapp-launch-checklist.md` when preparing a test with the restaurant administrator.

The fastest safe path is:

```text
Admin changes WhatsApp -> phone test from QR URL -> restaurant confirms message
```

After the number becomes definitive, keep the fallback seed and project docs in sync.

## Transition Plan

1. Keep `src/data/restaurantSeed.ts` as the MVP seed.
2. Create Supabase schema and seed it from this file.
3. Build `/admin/menu`.
4. Make public menu read from Supabase.
5. Keep a static fallback for local development.

## Practical Promise

For the MVP, we can show the sales flow now.

For the product vision, the owner must be able to update the menu from an admin panel. That is the next serious slice before selling CartaMago as self-managed.
