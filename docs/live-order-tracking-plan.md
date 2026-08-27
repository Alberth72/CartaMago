# Live Order Tracking Plan

## Objetivo

CartaMago debe mostrar el avance del pedido fuera del panel admin:

- Cliente final: puede abrir un enlace de rastreo y ver el estado de su pedido.
- Cocina: puede ver una pantalla operativa con detalle completo de preparacion.
- Sala: puede poner una pantalla visible a clientes con estados limpios y sin datos internos.

## Rutas

- `/tracking/:orderId`: vista demo/legacy por ID interno (solo mock).
- `/tracking/t/:trackingToken`: vista publica segura por token no adivinable (produccion).
- `/s/:branchId/tracking/t/:trackingToken`: vista publica segura por token para una sede especifica.
- `/s/:branchId/kitchen/t/:displayToken`: pantalla operativa de cocina con token de sede.
- `/s/:branchId/salon/t/:displayToken`: pantalla publica de sala con token de sede.
- `/kitchen` y `/salon`: rutas legacy/demo.

## Estado Actual

En local/mock:

- Las tres vistas leen los pedidos demo.
- Se refrescan cada 10 segundos.
- La pantalla de cocina muestra pedidos activos agrupados por estado con notas, items y detalles de preparacion.
- La pantalla de salon muestra estados publicos sin notas internas, direccion, telefono ni pago.
- El rastreo individual muestra progreso, entrega, pago, total y productos.

Con Supabase:

- El rastreo publico del cliente usa `tracking_token` + RPC `get_order_tracking`.
- La RPC devuelve solo campos seguros para cliente: estado, entrega, pago, total, fechas, enlace de WhatsApp e items.
- La lectura anonima directa de `orders` y `order_items` queda bloqueada por `202608250001_secure_tracking_token_default.sql`.
- Cocina y sala usan tokens operativos propios por sede (`kitchen_display_token`, `room_display_token`) y RPCs separadas.
- `anon` no puede leer esos tokens desde `branches`; solo columnas publicas del menu.
- El polling queda como fallback.

## Flujo Cliente

1. Cliente hace un pedido.
2. CartaMago guarda el pedido.
3. El local cambia estados desde admin.
4. Cliente abre `/tracking/t/:trackingToken` o `/s/:branchId/tracking/t/:trackingToken`.
5. La vista cambia cuando el pedido pasa por:

```text
Recibido -> Confirmado -> En cocina -> Listo -> Entregado
```

Si el pedido se cancela, el rastreo muestra estado cancelado.

## Actores Y Datos

### Cocinero

Ruta: `/s/:branchId/kitchen/t/:displayToken`

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

Ruta: `/s/:branchId/salon/t/:displayToken`

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

Ruta: `/tracking/t/:trackingToken`.

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

## Seguridad Para Produccion

El rastreo publico por token ya esta implementado:

- `tracking_token` existe en `orders`, es unico y obligatorio.
- Los pedidos nuevos reciben token desde la Edge Function `create-order` o por default SQL.
- Los pedidos existentes/locales se rellenan por migracion.
- La RPC publica `get_order_tracking(token)` no expone telefono, direccion, nota general del cliente ni payloads de integraciones.
- Cocina usa `get_kitchen_display_orders(branch, token)` y puede ver datos operativos internos.
- Sala usa `get_room_display_orders(branch, token)` y recibe un payload publico reducido sin telefono, direccion, nota, pago ni payloads.
- `/tracking/:orderId` queda como ruta demo/legacy y no debe compartirse como enlace publico.

## Siguiente Slice Recomendado

1. Aplicar `202608250001_secure_tracking_token_default.sql` y `202608250002_branch_display_tokens.sql` en cloud cuando se decida rollout.
2. Validar en cloud que anon no pueda leer `orders` ni tokens de `branches`, pero si pueda consultar las RPCs con tokens correctos.
3. Agregar sonido o alerta visual en `/kitchen` para pedidos nuevos.
