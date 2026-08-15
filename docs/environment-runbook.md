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

### Local Con Supabase Local

Inicio:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
Get-Content supabase\dev\production-orders-simulation.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
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

Datos:

```text
Frontend local + Supabase local en Docker + seed + pedidos simulados
```

Uso recomendado:

```text
Desarrollo, pruebas RLS, pruebas de pedidos, validacion de panel administrativo.
```

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

### 7. Crear usuario admin local

En PowerShell, usando los valores de `npx.cmd supabase status`:

```powershell
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY del status>"
$env:ADMIN_EMAIL="owner@cartamago.local"
$env:ADMIN_PASSWORD="Cambiar-esta-clave-123"
npm.cmd run supabase:create-admin
```

### 8. Asignar membresia a la sede

Ejecutar este SQL cambiando el email si usaste otro:

```powershell
@"
insert into public.branch_members (id, branch_id, user_id, role)
select
  'brasas-sazon-owner-' || id,
  'brasas-sazon',
  id,
  'owner'
from auth.users
where email = 'owner@cartamago.local'
on conflict (branch_id, user_id) do update set role = excluded.role;
"@ | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
```

### 9. Levantar app

```powershell
npm.cmd run dev
```

Abrir:

```text
http://localhost:5173
http://localhost:5173/admin
```

Entrar con:

```text
owner@cartamago.local
Cambiar-esta-clave-123
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
