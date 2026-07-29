# Security Audit

## Estado Actual

Validado localmente:

```text
npm.cmd audit -> 0 vulnerabilities
npm.cmd run lint -> ok
npm.cmd run build -> ok
npm.cmd run test:e2e -> ok
npm.cmd run test:e2e:admin -> ok
security_rls_check local -> passed
security_rls_check cloud -> passed
```

Validado en Supabase cloud:

```text
create-order Edge Function -> ACTIVE
restaurant_members -> brasas-sazon owner configured
anon/authenticated direct insert into orders/order_items -> revoked
order_rate_limits -> service_role only
price mismatch test -> rejected
honeypot test -> rejected
rate limit test -> rejected with 429
```

## Arquitectura De Seguridad

```text
Cliente QR
  -> React static app
  -> Supabase anon key
  -> Public read menu
  -> Edge Function create-order
  -> WhatsApp handoff

Admin
  -> /admin
  -> Supabase Auth
  -> Authenticated session
  -> Menu/order repositories
  -> Supabase RLS policies

Integraciones futuras
  -> Edge/backend only for secrets
  -> Webhooks verified server-side
  -> integration_events inbox
  -> orders as internal source of truth
```

## Hallazgos

### Alto: pedidos publicamente legibles

La migracion inicial de pedidos tenia:

```sql
create policy "public can read own orders"
using (true);

create policy "public can read order items"
using (true);
```

Riesgo:

- Datos personales de clientes visibles con anon key.
- Direcciones, notas y mensajes WhatsApp expuestos.

Cierre:

- `202607280002_security_hardening.sql` elimina lectura publica de `orders` y `order_items`.
- `202607290001_lock_public_order_writes.sql` elimina insercion directa publica.
- La creacion publica de pedidos pasa por la Edge Function `create-order`.

### Alto: cualquier usuario autenticado podia administrar todo

Las politicas MVP usaban `authenticated ... using (true)`.

Riesgo:

- Un usuario autenticado podria editar cualquier restaurante si existiera mas de uno.
- No hay aislamiento por restaurante.

Cierre:

- Nueva tabla `restaurant_members`.
- Nueva funcion `can_manage_restaurant(restaurant_id)`.
- Politicas admin restringidas por membresia de restaurante.
- Bootstrap transicional: si un restaurante no tiene miembros, un usuario autenticado puede crear la primera membresia/administrarlo. Despues de agregar miembros, queda cerrado por membership.

### Alto: integraciones externas necesitan backend

DiDiFood y pagos no deben manejar tokens ni webhooks en cliente.

Cierre:

- `restaurant_integrations.credentials_ref` guarda referencia, no secreto.
- `integration_events` queda como inbox auditado.
- Siguiente implementacion debe ser edge/backend para webhooks, firma e idempotencia.

### Medio: endpoint publico de pedidos acepta spam

La Edge Function `create-order` acepta pedidos publicos para que el QR funcione.

Riesgo:

- Spam de pedidos.
- Payloads abusivos dentro de los limites aceptados.

Mitigacion actual:

- El cliente ya no hace insert directo en `orders` ni `order_items`.
- `create-order` valida campos, tamanos y cantidad de items.
- `create-order` recalcula precio, cantidad y disponibilidad contra `products`.
- `create-order` rechaza productos no disponibles, nombre/precio manipulado y totales inconsistentes.
- `create-order` aplica rate limit por restaurante/IP/ventana.
- `create-order` soporta CAPTCHA opcional con `TURNSTILE_SECRET_KEY`.
- El cliente envia honeypot `website` y timestamp `orderStartedAt` como friccion anti-bot ligera.
- La migracion `202607290001_lock_public_order_writes.sql` revoca `insert` para `anon` y `authenticated`.
- La migracion `202607290002_order_rate_limits.sql` crea `order_rate_limits` sin permisos publicos.

Pendiente:

- Conectar un widget Turnstile en cliente si el volumen de spam lo exige.
- Definir limites por restaurante en variables de entorno segun operacion real.
- Reducir datos personales guardados en `whatsapp_message` si no son necesarios.

### Medio: storage publico

`menu-assets` es publico para lectura.

Riesgo:

- Correcto para imagenes de menu, no para documentos privados.

Cierre:

- Upload/update/delete queda restringido por ruta de restaurante y membresia.
- No subir comprobantes, documentos, contratos ni datos sensibles a `menu-assets`.

## Pendientes Antes De Pagos

- Validar reglas de negocio mas fuertes dentro de `create-order` si se agregan promociones, combos o pagos.
- Edge Function/webhook `didi_food_webhook` con firma, timestamp e idempotencia.
- Tabla o log de idempotencia por evento externo.
- Separar permisos por rol: `owner`, `admin`, `staff`.
- Definir retencion de pedidos y datos personales.
- Ejecutar `supabase/tests/security_rls_check.sql` contra Supabase local o staging.

## Validacion RLS

El chequeo base esta documentado en `docs/security-rls-validation.md` y vive en:

```text
supabase/tests/security_rls_check.sql
```

Estado de entorno local:

```text
npx.cmd supabase start -> ok
security_rls_check -> passed
```

Nota: `psql` no esta instalado en el host, asi que el script se ejecuto dentro del contenedor `supabase_db_CartaMago`.

## Bootstrap De Owner

Despues de aplicar la migracion de hardening, insertar el owner real:

```sql
insert into public.restaurant_members (id, restaurant_id, user_id, role)
select
  'brasas-sazon-owner-' || id,
  'brasas-sazon',
  id,
  'owner'
from auth.users
where email = '<owner-email>';
```

Cuando esa fila existe, solo miembros de `brasas-sazon` podran administrar ese restaurante.

Estado cloud actual:

```text
brasas-sazon owner members: 1
```
