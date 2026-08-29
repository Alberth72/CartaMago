# Environment Runbook

## Objetivo

Levantar CartaMago como ambiente local productivo: menu publico, panel administrativo, Supabase local, datos semilla y una bandeja de pedidos simulada.

## Requisitos

- Node.js y npm.
- Docker Desktop corriendo.
- Supabase CLI via `npx.cmd supabase`.
- Navegador para abrir el menu y `/admin`.

## Ambientes Y Rutas

### Demo Rapida Con Mock

Inicio:

```powershell
npm.cmd run dev:mock
```

Rutas:

```text
Menu:  http://localhost:5173
Admin: http://localhost:5173/admin
```

Datos:

```text
Frontend local + datos mock en memoria
```

Uso recomendado:

```text
Revision visual rapida del panel sin depender de Supabase.
```

### Local Con Supabase Local (Docker) — Ruta rapida recomendada

Un solo comando prepara Docker + Supabase local con datos de prueba
(migraciones + seed + pedidos simulados + 4 usuarios por rol + roles en
`multibrand_members` + `.env.localdb.local`):

```powershell
npm.cmd run local:setup
```

Cuando termine (print "Listo"), levanta la app:

```powershell
npm.cmd run dev:localdb
```

Rutas:

```text
Menu:           http://localhost:5173
Admin:          http://localhost:5173/admin
Supabase API:   http://127.0.0.1:54321
Supabase Studio:http://127.0.0.1:54323
Database:       postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Usuarios por rol (contrasena: `Cambiar-esta-clave-123`):

```text
superadmin@cartamago.local  -> toda la marca
warehouse@cartamago.local   -> bodega central (stock, compras, despachos)
branch@cartamago.local      -> sede principal (Brasas & Sazon)
cashier@cartamago.local     -> sede norte (Brasas & Sazon Norte)
```

Datos:

```text
Frontend local + Supabase local en Docker + seed + pedidos simulados
```

Uso recomendado:

```text
Desarrollo, pruebas RLS, pruebas de pedidos, validacion del panel administrativo.
```

Flujo de trabajo diario (sin repetir la instalacion):

```text
1) Docker Desktop corriendo.
2) npm.cmd run dev:localdb        # los contenedores y datos ya quedaron del setup
3) Abrir http://localhost:5173/admin
```

Si quieres datos de prueba frescos sin detener nada:

```powershell
npm.cmd run local:reset           # asume Docker/Supabase ya levantado
npm.cmd run dev:localdb
```

Apagado:

```powershell
npm.cmd run local:down            # npx.cmd supabase stop
```

Detalles del comando rapido:

```text
npm.cmd run local:setup  -> supabase start + db reset (migraciones + seed)
                          + pedidos simulados
                          + 4 usuarios (superadmin, warehouse, branch, cashier)
                          + roles en multibrand_members
                          + escribe .env.localdb.local
```

Paso a paso manual (equivalente al script, si prefieres hacerlo a mano):

```powershell
# 1) Levantar el stack (reusa contenedores ya corriendo)
npx.cmd supabase start

# 2) Esquema + migraciones + seed desde cero
npx.cmd supabase db reset

# 3) Pedidos simulados de produccion
Get-Content supabase\dev\production-orders-simulation.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres

# 4) Crear usuarios por rol (recomendado: 1 vez `npm.cmd run local:setup`).
#    Manualmente, repetir por cada email: superadmin@, warehouse@, branch@, cashier@
npx.cmd supabase status   # toma ANON_KEY y SERVICE_ROLE_KEY
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>"
$env:ADMIN_EMAIL="superadmin@cartamago.local"
$env:ADMIN_PASSWORD="Cambiar-esta-clave-123"
npm.cmd run supabase:create-admin

# 5) Asignar el rol de cada usuario en multibrand_members
@"
insert into public.multibrand_members (id, user_id, brand_id, warehouse_id, branch_id, role)
select 'mb_superadmin', id, 'brasas-sazon-brand', null::text, null::text, 'superadmin' from auth.users where email = 'superadmin@cartamago.local'
union all
select 'mb_warehouse', id, 'brasas-sazon-brand', 'brasas-central', null::text, 'warehouse_admin' from auth.users where email = 'warehouse@cartamago.local'
union all
select 'mb_branch', id, null::text, 'brasas-central', 'brasas-sazon', 'branch_admin' from auth.users where email = 'branch@cartamago.local'
union all
select 'mb_cashier', id, null::text, 'brasas-central', 'brasas-sazon-norte', 'cashier' from auth.users where email = 'cashier@cartamago.local'
on conflict (id) do update set role = excluded.role;
"@ | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres

# 6) Levantar la app
npm.cmd run dev:localdb
```

> Nota: `npm.cmd run dev:localdb` usa `.env.localdb.local` (ya escrito por el script).
> No confundir con `.env.local`, que apunta al Supabase cloud.
> Además, `dev:localdb` y `build:localdb` ejecutan un guard (`scripts/check-localdb-env.mjs`)
> que verifica que `.env.localdb.local` exista y su URL sea localhost, **evitando escribir
> en produccion por accidente**.

> **Dependencia del Edge Runtime para guardar pedidos de forma local**: los pedidos del menu
> QR se persisten via la Edge Function `create-order`, que corre en el contenedor Docker
> `supabase_edge_runtime_CartaMago`. Si ese contenedor esta caido (`Exited (255)`), el endpoint
> `/functions/v1/create-order` responde `503` y **el pedido no se guarda** (sale por WhatsApp
> pero no aparece en el admin de la sede). Si te pasa, reinicialo:
>
> ```powershell
> docker restart supabase_edge_runtime_CartaMago
> # verificar:  Invoke-WebRequest -Uri 'http://127.0.0.1:54321/functions/v1/create-order' -Method OPTIONS  -> 200
> ```
>
> Un reinicio limpio de toda la stack lo resuelve: `npx.cmd supabase stop` + `npm.cmd run local:setup`.
>
> **Otro motivo por el que "pide pero no se guarda": `400 invalid submission`**.
> `create-order` tiene un honeypot anti-bot: si el campo `website` de la peticion **no esta vacio**,
> responde `{"error":"validation_error","message":"invalid submission"}` (HTTP 400) y **no guarda**.
> El cliente real debe enviar `website: ''`. Si vuelve a salir ese 400, revisa
> `src/features/menu/hooks/usePublicMenuOrder.ts` (payload de `saveOrder`).

### Confirmacion Automatica Por WhatsApp

`create-order` puede enviar un aviso automatico al WhatsApp del cliente despues
de guardar el pedido. El enlace manual `wa.me` sigue disponible para que el
cliente envie o reenvie el pedido al restaurante.

Si faltan credenciales, telefono del cliente o plantilla aprobada, el pedido se
guarda igual y queda una fila en `order_notifications` con `status = 'skipped'`
o `status = 'failed'`.

Secretos requeridos por la Edge Function:

```text
WHATSAPP_ACCESS_TOKEN=<Meta Cloud API access token>
WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID del numero emisor>
WHATSAPP_TEMPLATE_NAME=pedido_recibido
WHATSAPP_TEMPLATE_LANGUAGE=es_CO
WHATSAPP_STATUS_TEMPLATE_LANGUAGE=es_CO
WHATSAPP_STATUS_TEMPLATE_CONFIRMED=pedido_confirmado
WHATSAPP_STATUS_TEMPLATE_PREPARING=pedido_en_preparacion
WHATSAPP_STATUS_TEMPLATE_READY=pedido_listo
WHATSAPP_STATUS_TEMPLATE_READY_DELIVERY=pedido_enviado
WHATSAPP_STATUS_TEMPLATE_DELIVERED=pedido_entregado
WHATSAPP_STATUS_TEMPLATE_CANCELLED=pedido_cancelado
WHATSAPP_GRAPH_VERSION=v23.0
WHATSAPP_DEFAULT_COUNTRY_CODE=57
WHATSAPP_CONFIRMATION_TO_OVERRIDE=
PUBLIC_SITE_URL=https://brasas-sazon-menu.netlify.app
```

`WHATSAPP_CONFIRMATION_TO_OVERRIDE` es solo para pruebas locales/staging: si lo
llenamos, todas las confirmaciones salen a ese numero permitido por Meta,
ignorando el telefono que escriba el cliente en el formulario. En produccion
debe quedar vacio para enviar al cliente real.

`WHATSAPP_BUSINESS_ACCOUNT_ID` no lo usa `create-order`; guardalo solo si lo
necesitas para administrar plantillas desde herramientas externas.

Para configurarlos en produccion:

```powershell
npx.cmd supabase secrets set WHATSAPP_ACCESS_TOKEN=<token> --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<phone-number-id> --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_TEMPLATE_NAME=pedido_recibido --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_TEMPLATE_LANGUAGE=es_CO --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_GRAPH_VERSION=v23.0 --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_DEFAULT_COUNTRY_CODE=57 --project-ref <project-ref>
npx.cmd supabase secrets unset WHATSAPP_CONFIRMATION_TO_OVERRIDE --project-ref <project-ref>
npx.cmd supabase secrets set PUBLIC_SITE_URL=https://brasas-sazon-menu.netlify.app --project-ref <project-ref>
```

La plantilla `pedido_recibido` debe estar aprobada en Meta y tener 6 parametros
de cuerpo, en este orden:

```text
{{1}} nombre del cliente
{{2}} numero de ticket
{{3}} sede
{{4}} tipo de entrega
{{5}} total aproximado
{{6}} enlace de rastreo
```

Texto sugerido para la plantilla Utility `pedido_recibido`:

```text
Hola {{1}}, recibimos tu pedido {{2}} en {{3}}.

Entrega: {{4}}
Total aproximado: {{5}}

Puedes seguir el estado aqui: {{6}}

El restaurante confirmara disponibilidad, tiempo estimado y pago por WhatsApp.
```

No incluir promociones, descuentos ni ventas adicionales en esta plantilla; debe
quedar como Utility/transaccional.

Para respuestas automaticas al cambiar estado desde el admin, configurar las
mismas credenciales en NestJS y estas plantillas:

```text
WHATSAPP_STATUS_TEMPLATE_CONFIRMED=pedido_confirmado
WHATSAPP_STATUS_TEMPLATE_PREPARING=pedido_en_preparacion
WHATSAPP_STATUS_TEMPLATE_READY=pedido_listo
WHATSAPP_STATUS_TEMPLATE_READY_DELIVERY=pedido_enviado
WHATSAPP_STATUS_TEMPLATE_DELIVERED=pedido_entregado
WHATSAPP_STATUS_TEMPLATE_CANCELLED=pedido_cancelado
WHATSAPP_STATUS_TEMPLATE_LANGUAGE=es_CO
```

Parametros de esas plantillas:

```text
{{1}} nombre del cliente
{{2}} numero de ticket
{{3}} estado legible
{{4}} sede
{{5}} enlace de rastreo
{{6}} total
```

Para probar localmente despues de cambiar variables de entorno:

```powershell
npx.cmd supabase stop
npx.cmd supabase start
```

Verificacion rapida:

```sql
select order_id, destination_phone, template_name, status, error_code, created_at
from public.order_notifications
order by created_at desc
limit 5;
```

## De Donde Sale La Data En Local (sin tocar produccion)

Cuando usas `npm run dev:localdb` la app **no toca la URL de produccion**
(`https://utoifeenoqhddsrubsxy.supabase.co`). Lee de la base en Docker
(`http://127.0.0.1:54321`). El contenido se construye asi:

| Origen | Que aporta | Cuando se carga |
|---|---|---|
| `supabase/migrations/*.sql` | Esquema + datos demo idempotentes (brands, warehouses, branches, stock, proveedores, formulas) | `npx supabase db reset` (paso 2 del script) |
| `supabase/seed.sql` | Menu real: branch `brasas-sazon`, 8 categorias, todos los productos con precios | Se carga automaticamente con `db reset` |
| `supabase/dev/production-orders-simulation.sql` | 6+ pedidos demo con estados variados | `sqlIntoDb()` en paso 3 del script |
| `scripts/setup-local.mjs` | 4 usuarios por rol + filas en `multibrand_members` + escribe `.env.localdb.local` | Pasos 4-5 |

En modo `dev:mock` no hay DB: la data vive en `restaurantSeed.ts` y `adminMockRepository.ts`.
El menu publico tiene fallback: si la peticion a Supabase local falla, usa `restaurantSeed.ts`.
El admin no funciona sin Supabase porque requiere login y roles.

Para blindar, `dev:localdb` y `build:localdb` ejecutan `scripts/check-localdb-env.mjs`
que verifica que `.env.localdb.local` exista y su URL sea localhost, rechazando arrancar
si apunta a otro lado (proteccion contra escribir en produccion por accidente).

### Local Con Supabase Cloud

Inicio:

```powershell
npm.cmd run dev
```

Requiere `.env.local` apuntando al proyecto cloud:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<cloud-anon-or-publishable-key>
VITE_BRANCH_ID=brasas-sazon
VITE_MENU_STORAGE_BUCKET=menu-assets
```

Rutas:

```text
Menu:  http://localhost:5173
Admin: http://localhost:5173/admin
Cloud: https://<project-ref>.supabase.co
```

Datos:

```text
Frontend local + Supabase cloud/staging/produccion segun .env.local
```

Uso recomendado:

```text
Validar comportamiento local contra datos reales o staging sin desplegar Netlify.
```

Precaucion:

```text
Si .env.local apunta a produccion, los cambios del admin afectan datos reales.
```

### Preview Productivo Local

Inicio:

```powershell
npm.cmd run build
npm.cmd run preview
```

Rutas:

```text
Menu:  http://127.0.0.1:4173
Admin: http://127.0.0.1:4173/admin
```

Datos:

```text
Build estatica local + Supabase configurado en variables VITE al momento del build
```

Uso recomendado:

```text
Revisar el artefacto compilado antes de deploy.
```

Para preview productivo conectado a Supabase local:

```powershell
npm.cmd run build:localdb
npm.cmd run preview:local
```

Rutas:

```text
Menu:  http://127.0.0.1:4175
Admin: http://127.0.0.1:4175/admin
```

Este modo usa `.env.localdb.local` y evita confundir la build local con `.env.local` cuando ese archivo apunta al Supabase cloud.

### Produccion Netlify

Inicio:

```powershell
npm.cmd run build
npx.cmd netlify deploy --prod --dir=dist
```

Rutas actuales:

```text
Menu:  https://brasas-sazon-menu.netlify.app
Admin: https://brasas-sazon-menu.netlify.app/admin
```

Datos:

```text
Netlify production + Supabase cloud configurado en variables de entorno de Netlify
```

Uso recomendado:

```text
Operacion real del restaurante y QR productivo.
```

## Ruta Rapida Visual

Usa esta ruta si solo quieres ver el panel sin Supabase real:

```powershell
npm.cmd install
npm.cmd run dev:mock
```

Abrir:

```text
http://localhost:5173/admin
```

Credenciales mock:

```text
owner@cartamago.test
cartamago-e2e
```

Esta ruta usa datos en memoria. Sirve para revisar UI, pero no valida RLS, storage ni persistencia.

Para presentacion con cliente sin despliegue, usa tambien:

```text
docs/local-client-demo-playbook.md
```

Nota:

```text
Las credenciales mock solo funcionan en `npm.cmd run dev:mock`.
Si usas `npm.cmd run dev`, el admin autentica contra el Supabase configurado en `.env.local`.
Si usas `npm.cmd run dev:localdb`, debes crear primero el usuario local y membresia del restaurante.
```

## Ruta Productiva Local

### 1. Instalar dependencias

```powershell
npm.cmd install
```

### 2. Levantar Supabase local

```powershell
npx.cmd supabase start
```

Si es el primer arranque, Docker descargara las imagenes de Supabase.

### 3. Reiniciar base con migraciones y seed

```powershell
npx.cmd supabase db reset
```

Esto aplica:

- Restaurantes, categorias, productos e imagen por defecto.
- Pedidos base del seed.
- Tablas de integraciones.
- Politicas RLS por membresia.

### 4. Cargar pedidos simulados de produccion

```powershell
Get-Content supabase\dev\production-orders-simulation.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
```

Resultado esperado:

```text
production order simulation loaded
```

La simulacion agrega pedidos con estados y canales distintos:

- Pendiente con borrador externo de DiDiFood.
- Confirmado para domicilio local.
- En preparacion para recoger.
- Listo para mesa.
- Entregado.
- Cancelado desde DiDiFood.

### 5. Validar seguridad RLS

```powershell
Get-Content supabase\tests\security_rls_check.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
```

Resultado esperado:

```text
security_rls_check passed
```

### 6. Configurar `.env.local`

Tomar valores desde:

```powershell
npx.cmd supabase status
```

Crear `.env.local`:

```text
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY del status>
VITE_BRANCH_ID=brasas-sazon
VITE_MENU_STORAGE_BUCKET=menu-assets
```

No guardar service role keys en `.env.local`.

### 7. Crear usuarios por rol

La forma recomendada es una sola vez:

```powershell
npm.cmd run local:setup
```

Eso crea los 4 usuarios (superadmin, warehouse, branch, cashier) y sus filas
en `multibrand_members`. Si prefieres manual, repite los pasos 4-5 de la
seccion "Local Con Supabase Local (Docker)" por cada email.

### 9. Levantar app

```powershell
npm.cmd run dev
```

Abrir:

```text
http://localhost:5173
http://localhost:5173/admin
```

Entrar con uno de los 4 usuarios por rol:

```text
superadmin@cartamago.local  / Cambiar-esta-clave-123
warehouse@cartamago.local   / Cambiar-esta-clave-123
branch@cartamago.local      / Cambiar-esta-clave-123
cashier@cartamago.local     / Cambiar-esta-clave-123
```

El panel debe abrir en pedidos y mostrar la bandeja simulada.

## Vista Como Produccion

Para revisar la build final local:

```powershell
npm.cmd run build
npm.cmd run preview
```

Abrir la URL que imprima Vite Preview y entrar a `/admin`.

## Gates Antes De Deploy

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:e2e:admin
npm.cmd audit
```

## Limpieza

Detener Supabase local:

```powershell
npx.cmd supabase stop
```

Recrear datos desde cero:

```powershell
npx.cmd supabase db reset
Get-Content supabase\dev\production-orders-simulation.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
```

## Notas Operativas

- La simulacion no debe ejecutarse en produccion real.
- Para staging, se puede ejecutar antes de una demo y limpiar despues borrando ids con prefijo `ord_prod_sim_`.
- El flujo de pagos sigue fuera del frontend; cualquier secreto de DiDiFood o pagos debe vivir en backend/edge function.
