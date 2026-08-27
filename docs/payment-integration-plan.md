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

El panel operativo de sede/caja ya puede registrar ventas internas con pago manual:

- `sales`: venta auditable por sede.
- `sale_items`: productos vendidos.
- `sale_payments`: medio, proveedor, estado y referencia de pago.
- `sale_receipts`: comprobante interno no DIAN.
- `cash_sessions`: apertura/cierre de una o varias cajas por sede, base inicial, conteo real y efectivo esperado.

La RPC `create_sale` guarda la venta, registra el pago, emite comprobante interno y descuenta inventario de sede por formula reutilizando el descuento operativo de producto cuando el producto tiene formula activa. El tab `Caja` administra apertura/cierre y enlaces de terminal; la venta canonica se arma y cobra desde el terminal tokenizado de cada caja.

Cada caja abierta tambien genera un terminal operativo por token:

- Ruta: `/s/:branchId/caja/:cashSessionId/t/:accessToken`.
- Lectura: `get_cash_session_terminal` devuelve solo caja, sede y productos disponibles.
- Escritura: `create_cash_session_sale` valida caja abierta + token vigente antes de llamar `create_sale`.
- Cierre: `close_cash_session` revoca el token para cortar el endpoint.
- Operacion: cada venta de caja crea tambien un pedido en `orders`/`order_items` con `order_channel = cash_terminal`.
- Trazabilidad: `sales.order_id` conecta el comprobante interno con el ticket operativo de cocina/pedidos.

El recibo operativo ya tiene vista imprimible compartida:

- QR: el enlace de tracking muestra el ticket del pedido y permite imprimirlo.
- Caja: al cobrar desde el terminal tokenizado se muestra el ultimo recibo con productos, pago, total y boton de impresion.
- Backend: `get_order_tracking` devuelve metadatos seguros de recibo (`receiptNumber`, negocio/sede, canal, pago, estado, productos y total). No expone telefono, direccion ni payloads privados.
- Impresion: `ReceiptCard` usa una capa `receipt-print-mode` para imprimir solo el recibo, no toda la pantalla.

Para Wompi, el sistema queda preparado con:

- `payment_method = wompi`
- `payment_provider = wompi`
- `payment_status = pending`
- `external_status = payment_link_required`

Esto permite operar manualmente hoy y conectar checkout luego sin cambiar la UX principal.

## Fuera De Esta Etapa

Facturacion electronica DIAN queda diferida. La decision posterior es si se integra un operador autorizado o si se construye una capa propia. Hasta entonces, el ticket QR y `sale_receipts` son comprobantes internos operativos, no factura electronica.

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
