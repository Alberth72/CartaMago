# Security RLS Validation

## Objetivo

Cerrar el riesgo residual de que una migracion futura vuelva a abrir datos sensibles o permisos globales en Supabase.

El chequeo vive en:

```text
supabase/tests/security_rls_check.sql
```

## Que Valida

- Existe `restaurant_members`.
- Existe `can_manage_restaurant`.
- `orders` y `order_items` no tienen lectura publica.
- Las politicas antiguas `authenticated can manage ...` ya no existen.
- `orders`, `order_items` e integraciones se administran por membresia.
- Storage `menu-assets` exige membresia para uploads.

## Como Ejecutarlo

Local, cuando Docker Desktop este corriendo:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
```

Si `psql` no esta instalado en el host, ejecutar desde el contenedor local:

```powershell
Get-Content supabase\tests\security_rls_check.sql | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
```

Tambien se puede ejecutar el contenido de `supabase/tests/security_rls_check.sql` con `psql`, SQL editor local o la herramienta SQL que estes usando.

Staging:

1. Aplicar migraciones en un proyecto Supabase que no sea produccion.
2. Abrir SQL Editor.
3. Ejecutar `supabase/tests/security_rls_check.sql`.
4. Esperar:

```text
security_rls_check passed
```

Si falla, no desplegar hasta corregir la politica o migracion indicada.

## Limitacion

Este chequeo inspecciona estructura y politicas instaladas. No reemplaza pruebas runtime con usuarios reales `anon` y `authenticated`.

Antes de pagos o DiDiFood productivo, agregar pruebas de rol que verifiquen:

- `anon` puede crear pedido, pero no leer pedidos.
- Un admin de restaurante A no puede leer ni editar restaurante B.
- Staff solo puede ver lo necesario para operar pedidos.
- Webhooks e integraciones solo escriben desde backend/edge function.

## Ultima Ejecucion Local

```text
2026-07-27 America/Bogota
npx.cmd supabase start -> ok
security_rls_check -> passed
```
