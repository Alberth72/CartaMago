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

Usar si se quiere mostrar persistencia real local. Un solo comando deja Docker +
Supabase local con datos de prueba y los 4 usuarios por rol:

```powershell
npm.cmd run local:setup
npm.cmd run dev:localdb
```

El setup crea: migraciones + seed + pedidos simulados + 4 usuarios
(`superadmin@`, `warehouse@`, `branch@`, `cashier@`) con sus roles en
`multibrand_members`, y escribe `.env.localdb.local`.

Si prefieres manual, equivale a:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
Get-Content supabase\dev\production-orders-simulation.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
# crear usuarios por rol (scripts/create-supabase-admin.mjs por email)
# y asignar roles en multibrand_members (ver docs/environment-runbook.md)
npm.cmd run dev:localdb
```

Login demo (contrasena `Cambiar-esta-clave-123`): `superadmin@cartamago.local`,
`warehouse@cartamago.local`, `branch@cartamago.local`, `cashier@cartamago.local`.

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
