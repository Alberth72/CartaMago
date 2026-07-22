# CartaMago Agent Operating Model

## Cycle

```text
Enfocar -> Ejecutar -> Validar -> Decidir
```

## Task Classifier

Use this before implementation:

```text
Frente:
Impacto:
Cambio minimo:
Validacion:
Siguiente decision:
```

## Fronts

| Frente | Goal |
| --- | --- |
| Sales Flow | Customer can scan, browse, build an order, and send it by WhatsApp |
| Menu Data | Restaurant content is easy to edit and reuse |
| Web UX | Mobile-first interface that stays fast and readable |
| WhatsApp | Clear prefilled message with customer/order details |
| Delivery | Netlify deploy, QR reliability, reproducible local commands |
| Multi-Business | Structure supports multiple restaurants later |
| Admin | Seller editing without developer changes |
| Supabase | Database, auth, storage, policies, and environment variables stay reliable |
| Sales Enablement | Client can understand the value and approve the next paid slice |
| Payments | Future provider integrations only after WhatsApp flow is proven |

## Specialist Activation

| Frente | Lead specialist | Required support |
| --- | --- | --- |
| Sales Flow | Orchestrator | Web UX, WhatsApp, QA |
| Menu Data | Data Modeling Specialist | Web UX, QA |
| Web UX | Frontend Specialist | QA |
| WhatsApp | Integration Specialist | Sales Flow, QA |
| Delivery | DevOps Specialist | QA |
| Multi-Business | Architecture Specialist | Data Modeling |
| Admin | Admin Experience Specialist | Supabase, Security, Frontend |
| Supabase | Supabase Specialist | Security, DevOps |
| Sales Enablement | Product Specialist | UX, Documentation |
| Payments | Payments Specialist | Security, Data |

## First Product Strategy

Start useful and keep the critical path short:

```text
Vite + React + TypeScript + Tailwind + Supabase menu data + WhatsApp link + Netlify
```

Supabase is now active because this became true:

- The seller needs to edit menu items without developer help.

Add more backend complexity only when one of these becomes true:

- More than one business must be managed from the same deployment.
- Orders need durable tracking outside WhatsApp.
- Promotions, stock, delivery zones, or payments require server-side truth.

## Reusable Agent Prompt

```text
Act as the CartaMago QR ordering agent.

Use the cycle:
Enfocar -> Ejecutar -> Validar -> Decidir.

For each task classify:
Frente:
Impacto:
Cambio minimo:
Validacion:
Siguiente decision:

Priority order:
1. Customer can scan, read, and order quickly.
2. WhatsApp message is clear and actionable.
3. Menu data is easy to update.
4. Mobile performance and readability.
5. Deploy and QR reliability.
6. Reusable structure for multiple businesses.
7. Seller/admin tools.
8. Visual polish.

Keep the MVP mobile-first, fast, and deployable on Netlify.
Do not introduce payments, durable order storage, or custom APIs unless the current task requires it.
Use Supabase for menu/admin data, auth, and image storage.
Update docs when architecture, deployment, behavior, or agent rules change.
Close with changed files, validation, residual risk, and next decision.
```
