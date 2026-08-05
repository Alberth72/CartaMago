# Payment Integration Plan

## Objetivo

CartaMago ya debe tratar el pago como parte operativa del pedido, no como texto libre.

Cada pedido guarda:

- `payment_method`: medio elegido por el cliente.
- `payment_provider`: quien procesa o valida el pago.
- `payment_status`: estado operativo del pago.

## Medios Por Tipo De Pedido

Recoger:

- Efectivo.
- Tarjeta en caja.
- Transferencia.
- Wompi online.

Domicilio local:

- Efectivo.
- Transferencia.
- Wompi online.

Mesa:

- Efectivo.
- Tarjeta en mesa.
- Transferencia.
- Wompi online.

DiDiFood:

- Pago en DiDiFood.

## Estado Actual

La app publica muestra los medios de pago habilitados segun el tipo de entrega.

Cuando el pedido se envia por WhatsApp, tambien se persiste el medio de pago en `orders` y se muestra en el panel admin.

Para Wompi, el sistema queda preparado con:

- `payment_method = wompi`
- `payment_provider = wompi`
- `payment_status = pending`
- `external_status = payment_link_required`

Esto permite operar manualmente hoy y conectar checkout luego sin cambiar la UX principal.

## Camino Feliz Wompi

Wompi Web Checkout requiere:

- Llave publica del comercio.
- Referencia unica de pago por compra.
- Monto en centavos y moneda COP.
- Firma de integridad.
- URL de redireccion.
- Webhook para escuchar eventos de transaccion.

La firma de integridad usa un secreto y debe generarse del lado servidor. No debe vivir en React ni en variables publicas `VITE_*`.

Flujo recomendado:

1. Cliente selecciona Wompi online.
2. CartaMago crea el pedido con `payment_status = pending`.
3. Edge Function `create-payment-session` genera referencia unica y firma.
4. Cliente abre Wompi Checkout.
5. Wompi redirige al resultado.
6. Webhook `wompi-webhook` valida el evento e idempotencia.
7. CartaMago marca `payment_status = paid`, `failed` o `cancelled`.

## Infraestructura Necesaria

Antes de produccion:

- Guardar secretos Wompi en Supabase Edge Function env vars.
- Crear tabla `payment_events` o reutilizar `integration_events` con provider `wompi`.
- Crear idempotencia por `transaction_id` y `reference`.
- Validar firma o evento recibido desde Wompi.
- Tener rollback manual: si Wompi falla, el restaurante puede cobrar por efectivo, tarjeta o transferencia.

## Referencias

- Wompi Payment Links: https://docs.wompi.co/en/docs/colombia/links-de-pago/
- Wompi Widget & Checkout Web: https://docs.wompi.co/en/docs/colombia/widget-checkout-web/
