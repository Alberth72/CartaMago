# Live Order Tracking Plan

## Objetivo

CartaMago debe mostrar el avance del pedido fuera del panel admin:

- Cliente final: puede abrir un enlace de rastreo y ver el estado de su pedido.
- Cocina: puede ver una pantalla operativa con detalle completo de preparacion.
- Sala: puede poner una pantalla visible a clientes con estados limpios y sin datos internos.

## Rutas

- `/tracking/:orderId`: vista de rastreo para un pedido.
- `/kitchen`: pantalla operativa para cocina.
- `/salon`: pantalla publica para clientes presentes en el local.

## Estado Actual

En local/mock:

- Las tres vistas leen los pedidos demo.
- Se refrescan cada 10 segundos.
- La pantalla de cocina muestra pedidos activos agrupados por estado con notas, items y detalles de preparacion.
- La pantalla de salon muestra estados publicos sin notas internas, direccion, telefono ni pago.
- El rastreo individual muestra progreso, entrega, pago, total y productos.

Con Supabase:

- Las vistas usan la misma fuente `orders` + `order_items`.
- Se suscriben a cambios de `orders` y `order_status_events` con Supabase Realtime.
- El polling queda como fallback.

## Flujo Cliente

1. Cliente hace un pedido.
2. CartaMago guarda el pedido.
3. El local cambia estados desde admin.
4. Cliente abre `/tracking/:orderId`.
5. La vista cambia cuando el pedido pasa por:

```text
Recibido -> Confirmado -> En cocina -> Listo -> Entregado
```

Si el pedido se cancela, el rastreo muestra estado cancelado.

## Actores Y Datos

### Cocinero

Ruta: `/kitchen`

Necesita:

- Estado operativo del pedido.
- Productos completos.
- Notas por producto.
- Nota general del cliente.
- Tipo de entrega.
- Mesa, mostrador o direccion si afecta despacho.
- Tiempo desde que entro.

No necesita:

- Una vista decorativa.
- Texto comercial.
- Informacion escondida detras de muchos clicks.

### Cliente En Sala

Ruta: `/salon`

Necesita:

- Saber si su mesa/pedido esta confirmado, en preparacion o listo.
- Ver una pantalla tranquila y legible a distancia.
- No ver notas internas de cocina ni datos de otros clientes.

No debe ver:

- Direcciones.
- Telefonos.
- Notas especiales.
- Estado de pago.
- Payloads o IDs tecnicos.

### Cliente Remoto

Ruta: `/tracking/:orderId` en demo, futura `/tracking/t/:trackingToken`.

Necesita:

- Confirmar que el pedido es el suyo.
- Ver el progreso paso a paso.
- Ver productos, total, entrega y pago de su propio pedido.
- Contactar al local si algo falla.

## Flujo Pantalla Cocina

La pantalla `/kitchen` esta pensada para:

- Cocina interna.
- Caja/mostrador.

Agrupa pedidos por:

- Recibidos.
- Confirmados.
- En cocina.
- Listos.

No muestra pedidos entregados o cancelados.

## Flujo Pantalla Salon

La pantalla `/salon` esta pensada para estar visible en el local.

Muestra solo pedidos confirmados, en cocina y listos.

Para mesa muestra `Mesa N`.
Para recoger puede mostrar el nombre si el local lo decide en el flujo de datos.
Para domicilios muestra codigo de pedido, no direccion.

## Seguridad Pendiente Antes De Produccion

La ruta actual usa `orderId`, suficiente para demo local y validacion funcional.

Antes de produccion publica, se debe crear un `tracking_token` por pedido:

- Token corto, aleatorio y no adivinable.
- URL publica tipo `/tracking/t/:trackingToken`.
- RLS o Edge Function que solo devuelva campos seguros para cliente.
- No exponer datos internos, pagos sensibles ni payloads de integraciones.

## Siguiente Slice Recomendado

1. Agregar `tracking_token` a `orders`.
2. Devolver `trackingUrl` al crear pedido.
3. Incluir link de rastreo en el mensaje de WhatsApp.
4. Crear vista publica con token, no con ID interno.
5. Agregar sonido o alerta visual en `/kitchen` para pedidos nuevos.
