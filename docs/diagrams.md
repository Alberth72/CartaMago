# Diagrams

## Runtime Architecture

```mermaid
flowchart LR
  customer["Customer phone"]
  qr["QR code"]
  netlify["Netlify static site"]
  vite["Vite build output: dist/"]
  app["React app shell"]
  publicMenu["Public menu feature"]
  publicRepo["Public menu repository"]
  supabase["Supabase database"]
  seed["Local TypeScript seed fallback"]
  cart["Cart state"]
  message["WhatsApp message composer"]
  whatsapp["WhatsApp"]
  restaurant["Restaurant staff"]

  customer --> qr
  qr --> netlify
  vite --> netlify
  netlify --> app
  app --> publicMenu
  publicMenu --> publicRepo
  publicRepo --> supabase
  publicRepo --> seed
  publicMenu --> cart
  cart --> message
  publicRepo --> message
  message --> whatsapp
  whatsapp --> restaurant
```

## Admin Architecture

```mermaid
flowchart TD
  admin["Restaurant owner"]
  route["/admin"]
  app["AdminApp"]
  authHook["useAdminAuth"]
  menuHook["useAdminMenu"]
  authRepo["adminAuthRepository"]
  menuRepo["adminMenuRepository"]
  auth["Supabase Auth"]
  db["Supabase tables"]
  storage["Supabase Storage: menu-assets"]
  publicMenu["Public QR menu"]

  admin --> route
  route --> app
  app --> authHook
  app --> menuHook
  authHook --> authRepo
  menuHook --> menuRepo
  authRepo --> auth
  menuRepo --> db
  menuRepo --> storage
  db --> publicMenu
  storage --> publicMenu
```

## Customer Ordering Flow

```mermaid
flowchart TD
  scan["Scan QR"]
  open["Open CartaMago menu"]
  load["Load Supabase menu or seed fallback"]
  browse["Browse categories"]
  add["Add products"]
  adjust["Adjust quantities"]
  choose["Choose pickup, delivery, or table"]
  details["Add name, address/table, and notes"]
  send["Send order by WhatsApp"]
  confirm["Restaurant confirms availability and time"]

  scan --> open
  open --> load
  load --> browse
  browse --> add
  add --> adjust
  adjust --> choose
  choose --> details
  details --> send
  send --> confirm
```

## Restaurant Sales Process

```mermaid
sequenceDiagram
  actor Customer
  participant QR as QR Menu
  participant App as CartaMago
  participant Repo as Menu Repository
  participant DB as Supabase or Seed
  participant WA as WhatsApp
  actor Seller as Restaurant

  Customer->>QR: Scans code from table, counter, flyer, or delivery bag
  QR->>App: Opens the public menu
  App->>Repo: Requests menu data
  Repo->>DB: Reads Supabase, falls back to seed when needed
  Customer->>App: Selects products and quantities
  Customer->>App: Adds fulfillment details
  App->>WA: Opens structured message
  Customer->>WA: Sends message
  WA->>Seller: Delivers clear order
  Seller->>Customer: Confirms time, availability, and final details
```

## Data Flow

```mermaid
flowchart LR
  admin["Admin edits"]
  auth["Supabase Auth"]
  storage["Supabase Storage"]
  db["Supabase tables"]
  seed["Local fallback seed"]
  repo["menuRepository"]
  ui["React public UI"]
  cart["Cart lines"]
  total["Total calculation"]
  wa["Encoded wa.me URL"]

  admin --> auth
  admin --> storage
  admin --> db
  db --> repo
  seed --> repo
  repo --> ui
  ui --> cart
  cart --> total
  repo --> wa
  cart --> wa
  total --> wa
```

## Phase Evolution

```mermaid
flowchart TD
  current["Current: QR menu + Supabase admin + WhatsApp"]
  validate["Validate owner edits, image upload, prices, and WhatsApp flow"]
  multi["Multi-restaurant support"]
  ops["Optional order operations"]
  growth["Promotions, loyalty, payments"]

  current --> validate
  validate --> decision1{"Second seller or multiple branches?"}
  decision1 -- yes --> multi
  decision1 -- no --> improve1["Improve public menu, photos, prices, QR placement"]
  multi --> decision2{"WhatsApp becomes hard to track?"}
  decision2 -- yes --> ops
  decision2 -- no --> improve2["Keep WhatsApp-first workflow"]
  ops --> decision3{"Retention or payments requested?"}
  decision3 -- yes --> growth
  decision3 -- no --> improve3["Improve reporting and operations"]
```

## Agent Work Cycle

```mermaid
flowchart LR
  focus["Enfocar"]
  execute["Ejecutar"]
  validate["Validar"]
  decide["Decidir"]

  focus --> execute
  execute --> validate
  validate --> decide
  decide --> focus
```

Use the classifier before each implementation:

```text
Frente:
Impacto:
Cambio minimo:
Validacion:
Siguiente decision:
```

## MVP Success Criteria

```mermaid
flowchart TD
  start["Client opens MVP"]
  sees["Immediately sees food and menu"]
  understands["Understands prices and categories"]
  orders["Builds an order"]
  sends["Sends WhatsApp message"]
  owner["Owner can edit menu in /admin"]
  value["Sees why this can increase sales"]

  start --> sees
  sees --> understands
  understands --> orders
  orders --> sends
  sends --> owner
  owner --> value
```
