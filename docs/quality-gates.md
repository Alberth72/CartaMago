# Quality Gates

## Universal Gate

Run for every implementation change once the app exists:

```powershell
npm.cmd run build
```

If a command cannot run, document why and name the residual risk.

## Web Gate

Required for menu or order flow changes:

- Mobile viewport is usable.
- Product prices are visible.
- Cart total updates correctly.
- Empty cart state is clear.
- Main WhatsApp action is reachable.
- Mobile sticky action must review order details before opening WhatsApp.
- Text does not overlap on small screens.

## WhatsApp Gate

Required for ordering changes:

- Link opens WhatsApp.
- Message is URL-encoded.
- Message includes restaurant name.
- Message includes items, quantities, and total.
- Message includes pickup/delivery/table details when configured.
- Mobile flow lets the user review pickup/delivery/table before sending.
- Message does not say the order is confirmed.

## Data Gate

Required for menu data changes:

- Product IDs are stable.
- Prices are numeric.
- Categories are not empty.
- Hidden/unavailable items are handled intentionally.
- Business-specific configuration is isolated.

## Admin Gate

Required for admin-panel changes:

- `/admin` loads in production.
- Login works with a real Supabase user.
- Product create/edit saves to Supabase.
- Availability changes affect the public menu intentionally.
- Image upload succeeds to `menu-assets`.
- Public QR menu reflects the saved change.

## Supabase Gate

Required for database, auth, storage, or env changes:

- Migration/SQL runs successfully.
- Public read works with publishable/anon key.
- Admin write requires authenticated session.
- Netlify `VITE_` variables are visible to Vite when they must be public.
- Secret/service-role keys are not present in client bundle, docs, or git.
- Production deploys after env changes are built with `npx.cmd netlify build --context production`.

## Delivery Gate

Required before showing a client:

- Production deploy loads on mobile.
- QR scan opens the correct URL.
- WhatsApp handoff works from a phone.
- Restaurant number is correct.
- MVP data has no placeholder phone number.
- Admin URL loads when owner workflow is part of the review.
- Admin does not show the Supabase setup screen in production.

## Definition Of Done

```text
Implemented
+ build validated
+ mobile checked
+ WhatsApp checked when ordering changed
+ admin checked when menu editing changed
+ docs updated when behavior or architecture changed
+ residual risk named
+ next decision clear
```
