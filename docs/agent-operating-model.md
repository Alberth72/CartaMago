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
| Admin | Future seller editing without developer changes |
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
| Admin | Architecture Specialist | Security, Frontend |
| Payments | Payments Specialist | Security, Data |

## First Product Strategy

Start static and useful:

```text
Vite + React + TypeScript + Tailwind + local menu data + WhatsApp link + Netlify
```

Add backend only when one of these becomes true:

- The seller needs to edit menu items without developer help.
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

Keep the first demo static, mobile-first, fast, and deployable on Netlify.
Do not introduce backend, auth, payments, or database unless the current task requires it.
Update docs when architecture, deployment, behavior, or agent rules change.
Close with changed files, validation, residual risk, and next decision.
```
