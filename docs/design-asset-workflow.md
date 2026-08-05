# Design Asset Workflow

## Goal

Adapt the Brasas & Sazon physical menu into a practical QR ordering experience without trying to make every image perfect in one pass.

## Source Material

Images shared in the conversation show:

- Brand: `Asadero y Restaurante Brasas & Sazon`.
- Slogan: `Tenemos el mejor Sabor`.
- Social handle: `brasasysazon1`.
- Ordering WhatsApp for this MVP: `+57 310 421 7941`.
- Menu categories: pollo, asados, bandejas, tipicos, sopas, menu infantil, jugos, limonadas and adiciones.

Many price areas are covered, blank, blurry, or hard to read. The app must not publish uncertain prices as facts.

## Asset Folders

Use this structure inside the same repo:

```text
public/client-assets/brasas-sazon/
  raw/        Original photos from the client, unchanged
  processed/ Cropped, compressed, corrected, or MVP-ready images
```

Keep originals because we may need to re-crop or re-process later.

## Step-By-Step Method

1. Save the original photos in `raw/` with stable names:

```text
menu-cover.jpg
menu-pollo.jpg
menu-asados.jpg
menu-bandejas.jpg
menu-tipicos.jpg
menu-sopas.jpg
menu-infantil.jpg
menu-bebidas-adiciones.jpg
```

2. Extract business facts:

```text
Name
Slogan
WhatsApp
Address or branch
Categories
Products
Prices
Social links
```

3. Separate what is certain from what is uncertain:

```text
Confirmed: can go live
Unclear: keep as "Por confirmar"
Missing: ask the client
```

4. Create only production-useful processed images:

```text
hero-brasas-sazon.jpg
product-placeholder-preparing.png
```

Current processed outputs:

```text
hero-brasas-sazon.jpg
brand-mark-minimal.svg
product-placeholder-preparing.png
qr-brasas-sazon-menu.png
qr-netlify-production.png
```

5. Use images with purpose:

- Hero image: emotional first impression.
- Product photos: help customers choose only when quality is good enough.
- Default product placeholder: use while product photos are not ready.
- Menu scans: extraction reference only, not the final ordering UI.
- Logo: brand recognition.

## Design Direction

Visual direction from the menu:

- Dark wood background.
- Fire and grill feeling.
- Yellow/gold accents.
- Red labels.
- Food-forward photography.

QR app translation:

- Keep the menu mobile-first.
- Use dark hero with warm overlay.
- Use clean product cards so prices and actions are easier to read than the physical menu.
- Keep WhatsApp action sticky and visible.

## What We Should Not Do

- Do not publish blurry menu photos as the main experience.
- Do not guess prices.
- Do not depend on a PDF-like image menu.
- Do not regenerate the brand logo with AI and pretend it is exact.
- Do not overwrite original photos.

## Client Questions

Before production deploy, confirm:

- Which branch receives this WhatsApp number?
- Is domicilio gratis for this branch?
- Are there delivery zones?
- Full price list.
- Are all items currently available?
- Does `Para llevar` always cost `$500`?
- Should orders support table number, pickup, and delivery from day one?
