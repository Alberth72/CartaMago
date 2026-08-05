# Local Client Demo Playbook

## Objetivo

Presentar CartaMago sin desplegar a produccion:

- Menu publico usable.
- Pedido por WhatsApp para recoger/domicilio/mesa.
- Panel admin con pedidos variados.
- CRUD de productos por categoria.
- DiDi Food explicado como integracion futura preparada, no activa.

## Ruta Recomendada Para La Presentacion

Usar demo mock si el objetivo es fluidez visual y no persistencia real:

```powershell
npm.cmd install
npm.cmd run dev:mock
```

Abrir:

```text
Menu:  http://127.0.0.1:5173/
Admin: http://127.0.0.1:5173/admin
```

Credenciales:

```text
  owner@cartamago.test
cartamago-e2e
```

Esta ruta trae en memoria:

- Menu completo por categorias.
- Productos con imagen por defecto.
- Pedidos demo con estados distintos.
- Recoger, domicilio local, mesa y DiDi Food cancelado/externo.
- CRUD de productos sin tocar datos reales.

## Ruta Completa Con Supabase Local

Usar si se quiere mostrar persistencia real local:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
Get-Content supabase\dev\production-orders-simulation.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
npm.cmd run dev:localdb
```

Luego crear admin local si no existe:

```powershell
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY del status>"
$env:ADMIN_EMAIL="owner@cartamago.local"
$env:ADMIN_PASSWORD="Cambiar-esta-clave-123"
npm.cmd run supabase:create-admin
```

Asignar membresia:

```powershell
@"
insert into public.restaurant_members (id, restaurant_id, user_id, role)
select
  'brasas-sazon-owner-' || id,
  'brasas-sazon',
  id,
  'owner'
from auth.users
where email = 'owner@cartamago.local'
on conflict (restaurant_id, user_id) do update set role = excluded.role;
"@ | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
```

## Guion De Demo

1. Abrir el menu publico.
2. Mostrar categorias y productos con imagen por defecto.
3. Agregar producto al pedido.
4. Mostrar validaciones:
   - Recoger pide nombre y telefono.
   - Domicilio local pide nombre, telefono y direccion.
   - Mesa pide numero de mesa.
   - DiDi Food queda bloqueado como integracion pendiente.
5. Abrir admin.
6. Mostrar bandeja de pedidos con estados variados.
7. Abrir un pedido y cambiar estado.
8. Ir a Menu.
9. Seleccionar una categoria y ver productos filtrados.
10. Crear, editar o eliminar un producto demo.

## Mensaje Para El Cliente

```text
Hoy mostramos el flujo local completo sin tocar produccion. CartaMago ya permite menu QR, armado de pedido, handoff por WhatsApp, panel admin, pedidos operativos y preparacion para integraciones como DiDi Food. La siguiente fase es validar precios/fotos reales y decidir si el restaurante operara pedidos desde WhatsApp, desde el panel, o ambos.
```
