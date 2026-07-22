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
- Text does not overlap on small screens.

## WhatsApp Gate

Required for ordering changes:

- Link opens WhatsApp.
- Message is URL-encoded.
- Message includes restaurant name.
- Message includes items, quantities, and total.
- Message includes pickup/delivery/table details when configured.
- Message does not say the order is confirmed.

## Data Gate

Required for menu data changes:

- Product IDs are stable.
- Prices are numeric.
- Categories are not empty.
- Hidden/unavailable items are handled intentionally.
- Business-specific configuration is isolated.

## Delivery Gate

Required before showing a client:

- Production deploy loads on mobile.
- QR scan opens the correct URL.
- WhatsApp handoff works from a phone.
- Restaurant number is correct.
- Demo data has no placeholder phone number.

## Definition Of Done

```text
Implemented
+ build validated
+ mobile checked
+ WhatsApp checked when ordering changed
+ docs updated when behavior or architecture changed
+ residual risk named
+ next decision clear
```
