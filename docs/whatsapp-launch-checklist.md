# WhatsApp Launch Checklist

## Goal

Prepare a quick official-user test for this flow:

```text
QR -> Web menu -> Cart -> Internal order -> WhatsApp confirmation to customer
```

## Current Production Target

- Public URL: `https://brasas-sazon-menu.netlify.app/`
- Admin URL: `https://brasas-sazon-menu.netlify.app/admin`
- Branch ID: `brasas-sazon`
- Current WhatsApp in Supabase: `573104217941`

## What Changes The Live QR

The live menu reads the WhatsApp number from Supabase:

```text
public.branches.whatsapp_number
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
9. Tap `Confirmar pedido`.
10. Confirm no WhatsApp window opens automatically.
11. Confirm the customer phone receives the automatic `pedido_recibido` notice.
12. Confirm the order appears in the admin order tray.

## Automatic Customer Confirmation

The public order flow now does both pieces:

- Saves the order through `create-order`.
- After saving, the function tries to send the customer a WhatsApp template notice.
- Keeps a manual `wa.me` link as a fallback on the confirmation screen.

If the automatic notice is not configured, the order is still valid and the UI keeps `Enviar manualmente` as the fallback. Check `docs/environment-runbook.md` for the required Supabase secrets and the `order_notifications` verification query.

## Production Release Gate

Before enabling `pedido_recibido` in PDN, Meta must show:

- Template name: `pedido_recibido`
- Language: `es_CO`
- Category: `Utility`
- Status: `Approved`

Use `docs/production-release-whatsapp-confirmation.md` for the full PDN release and rollback checklist.

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
update public.branches
set whatsapp_number = '57XXXXXXXXXX'
where id = 'brasas-sazon';
```

Then verify:

```sql
select id, name, whatsapp_number
from public.branches
where id = 'brasas-sazon';
```

## Rollback

If the official test must return to the previous test number:

```sql
update public.branches
set whatsapp_number = '573104217941'
where id = 'brasas-sazon';
```

## Done

- Official admin number saved.
- Public menu opens from the QR URL.
- `Confirmar pedido` does not open WhatsApp automatically.
- Order appears in the admin order tray.
- `order_notifications.status = sent` for `pedido_recibido`.
- Customer receives the automatic confirmation.
- Seed and docs updated after the number is approved as definitive.
