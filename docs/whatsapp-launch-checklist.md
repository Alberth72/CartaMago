# WhatsApp Launch Checklist

## Goal

Prepare a quick official-user test for this flow:

```text
QR -> Web menu -> Cart -> WhatsApp order -> Restaurant confirms
```

## Current Production Target

- Public URL: `https://brasas-sazon-menu.netlify.app/`
- Admin URL: `https://brasas-sazon-menu.netlify.app/admin`
- Restaurant ID: `brasas-sazon`
- Current WhatsApp in Supabase: `573104217941`

## What Changes The Live QR

The live menu reads the WhatsApp number from Supabase:

```text
public.restaurants.whatsapp_number
```

Changing that value updates the QR menu without changing the QR image or URL.

## Fast Official Test

1. Confirm the official WhatsApp number in international format.
2. Open `/admin`.
3. Edit `WhatsApp` in the `Restaurante` card.
4. Save.
5. Open the public QR URL on a phone.
6. Add one product to the cart.
7. Tap `Revisar pedido`.
8. Choose `Recoger`, `Domicilio`, or `Mesa`.
9. Tap `Pedir por WhatsApp`.
10. Confirm the message opens to the official restaurant number.
11. Ask the restaurant admin to confirm the message arrived.

## Files To Keep In Sync

These files do not drive live production while Supabase is healthy, but they should match the official launch state:

- `src/data/restaurantSeed.ts`: fallback seed used when Supabase is unavailable.
- `supabase/seed.sql`: repeatable database seed for rebuilding the environment.
- `docs/design-asset-workflow.md`: project notes with the MVP ordering number.
- `docs/menu-extraction-brasas-sazon.md`: extracted restaurant facts.
- `README.md`: setup example shown to future maintainers.
- `docs/progress-dashboard.md`: launch status and risks.

## Direct SQL Option

Use this only when the admin panel is unavailable:

```sql
update public.restaurants
set whatsapp_number = '57XXXXXXXXXX'
where id = 'brasas-sazon';
```

Then verify:

```sql
select id, name, whatsapp_number
from public.restaurants
where id = 'brasas-sazon';
```

## Rollback

If the official test must return to the previous test number:

```sql
update public.restaurants
set whatsapp_number = '573104217941'
where id = 'brasas-sazon';
```

## Done

- Official admin number saved.
- Public menu opens from the QR URL.
- WhatsApp opens with the selected order mode.
- Restaurant confirms message received.
- Seed and docs updated after the number is approved as definitive.
