# CartaMago Work Cycles

## Purpose

Use this document to coordinate specialists in short cycles without losing the product thread.

The current product proof is:

```text
QR -> Public menu -> Cart -> WhatsApp order -> Restaurant confirms
```

The current owner proof is:

```text
/admin -> Login -> Edit product/category -> Upload image -> Public menu updates
```

## Cycle Format

Every cycle uses the same operating rhythm:

```text
Enfocar -> Ejecutar -> Validar -> Decidir
```

Cycle note template:

```text
Frente:
Especialista lider:
Impacto esperado:
Cambio minimo:
Validacion:
Riesgo residual:
Siguiente decision:
```

## Active Fronts

| Frente | Lead | Goal | Evidence | Next Useful Slice |
| --- | --- | --- | --- | --- |
| Sales Flow | Product Specialist | Make ordering feel fast and obvious | WhatsApp handoff verified by user | Tighten order message and customer fields |
| Public Menu UX | UX Specialist | Make scan-to-order readable on phones | Netlify URL and QR validated | Visual QA on real phones and refine cards |
| Admin Experience | Admin Experience Specialist | Let owner update menu without us | `/admin` tested by user | Edit real product + upload real image + verify public update |
| Menu Data | Data Modeling Specialist | Keep products faithful to the restaurant menu | Brasas & Sazon seed and Supabase data loaded | Replace temporary prices with confirmed COP prices |
| Supabase Ops | Supabase Specialist | Keep auth, DB, storage, and env stable | Migration, seed, bucket, login, upload check passed | Add owner/restaurant membership policies |
| Delivery | DevOps Specialist | Keep public URL and QR reliable | Netlify deploy active | Document deploy checklist and rollback path |
| Sales Enablement | Sales Enablement Specialist | Help client see value and next paid step | Client explanation doc exists | Prepare a concise client walkthrough |
| Multi-Business Architecture | Architecture Specialist | Prepare reusable structure for more restaurants | Business-specific data isolated | Define tenant model before second restaurant |

## Cycle 1: Stabilize The Brasas & Sazon MVP

Objective:

```text
Make the current client flow safe enough to show and edit live.
```

Scope:

- Confirm real prices.
- Replace temporary `26000 COP` values.
- Upload at least one real product image from `/admin`.
- Verify the public QR menu updates.
- Test WhatsApp message after admin data changes.

Exit criteria:

- Owner can log in.
- Owner can save a product change.
- Public menu shows the change.
- WhatsApp order still works.
- Residual price/photo gaps are documented.

## Cycle 2: Owner Admin Ergonomics

Objective:

```text
Make admin simple enough for a restaurant owner, not a developer.
```

Scope:

- Improve product list search/filter.
- Add clearer success/error states.
- Add delete or archive decision.
- Add image guidance and size limits.
- Add category ordering.

Exit criteria:

- Owner can find a product quickly.
- Owner can update availability during service.
- Image upload feels understandable.
- Accidental bad edits are harder.

## Cycle 3: Client Presentation

Objective:

```text
Show the client how the MVP can reduce friction and increase orders.
```

Scope:

- Prepare one-page explanation.
- Show QR scan path.
- Show WhatsApp message received by restaurant.
- Show admin edit and public update.
- Name known gaps honestly: prices, final photos, owner password, policies.

Exit criteria:

- Client understands practical value.
- Client can request corrections.
- Next paid/implementation decision is clear.

## Cycle 4: Multi-Restaurant Readiness

Objective:

```text
Prepare CartaMago to onboard a second business without cloning the app manually.
```

Scope:

- Define tenant/restaurant membership model.
- Move restaurant selection out of hardcoded env when needed.
- Restrict owner writes by restaurant.
- Define onboarding checklist.

Exit criteria:

- One Supabase project can support more than one restaurant safely.
- One deploy can route to more than one menu, or a deliberate per-client deploy strategy is documented.

## Decision Rules

- Do not add payments until WhatsApp ordering has repeated real use.
- Do not build durable order tracking until the restaurant asks for order history outside WhatsApp.
- Do not add multi-tenant complexity until the second real business is being onboarded.
- Do not invent menu items; use the physical menu, owner confirmation, or a written price list.
- Prefer small validated slices over large invisible architecture.
