# Progress Dashboard

## Current Focus

```text
Build CartaMago as a reusable QR menu and WhatsApp ordering product.
```

## Status

| Frente | Progress | Evidence | Current Gap | Next Decision |
| --- | --- | --- | --- | --- |
| Product Identity | Defined working name: CartaMago | `docs/product-identity.md` | Domain/social availability not verified | Decide whether CartaMago is final |
| AgentOps | Initial model created | `AGENTS.md`, `docs/agent-operating-model.md` | Needs validation during client demo | Use this model for next MVP slice |
| Web UX | MVP scaffold implemented | `src/App.tsx`, `npm.cmd run build` | Needs visual QA on phone | Run local demo and inspect mobile |
| WhatsApp | Message composer implemented | `src/features/order/orderMessage.ts`, `npm.cmd run build` | Demo number is placeholder | Replace with restaurant WhatsApp |
| Delivery | Netlify config added | `netlify.toml`, `npm.cmd run build` | Production deploy not created | Deploy and generate QR |
| Menu Data | Demo menu implemented | `src/data/demoMenu.ts` | Real restaurant menu missing | Gather product names/prices/photos |

## Next Slice

```text
Replace placeholder WhatsApp number, deploy to Netlify, and scan-test the QR menu on a phone.
```
