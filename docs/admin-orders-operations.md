# Admin Orders Operations

## Objetivo

El panel de pedidos es una bandeja operativa para cocina y administracion. Todos los pedidos entran ahi, sin importar si vienen de QR, WhatsApp, mesa, domicilio local o una futura integracion con DiDiFood.

## Flujo De Estados

```text
Nuevo -> Confirmado -> Preparando -> Listo -> Entregado
                     \-> Cancelado
```

Uso esperado:

- `Nuevo`: el pedido entro, pero el restaurante aun no lo acepto.
- `Confirmado`: el restaurante valido disponibilidad, precio y canal.
- `Preparando`: cocina ya lo esta produciendo.
- `Listo`: cocina termino; falta recoger, llevar, servir o entregar a proveedor.
- `Entregado`: el cliente o responsable final recibio el pedido.
- `Cancelado`: el pedido no se va a preparar o entregar.

## Quien Confirma Entregado

- Recoger en restaurante: caja o mostrador lo marca cuando entrega al cliente.
- Mesa: mesero o cocina lo marca cuando el pedido fue servido.
- Domicilio local: mensajero del restaurante o administrador lo marca al confirmar entrega.
- DiDiFood: en fase manual, se marca al confirmar en el panel de DiDiFood o con el repartidor. En fase integrada, debe actualizarse por webhook validado desde backend/edge function.

## Indicadores De Tiempo

Cada pedido muestra cuanto tiempo lleva desde `created_at`.

Semaforo operativo:

- Verde: menos de 15 minutos.
- Amarillo: 15 minutos o mas.
- Rojo: 30 minutos o mas.
- Gris: pedidos entregados o cancelados.

La idea es que cocina pueda priorizar sin abrir cada pedido.

## Notificaciones Al Cliente

El detalle del pedido muestra una notificacion sugerida para el cliente final segun el estado actual del pedido.

En el MVP esta notificacion es asistida:

- El admin cambia el estado operativo del pedido.
- El panel genera un mensaje claro para el cliente.
- Si el pedido tiene telefono de cliente, el admin puede abrir WhatsApp con el mensaje listo.

Esto evita prometer tracking automatico antes de tener backend de notificaciones, pero deja el flujo preparado para una futura vista publica de seguimiento o envio automatico por WhatsApp/API.

## Pagos

El pedido guarda el medio de pago y el estado de pago.

El panel admin muestra si el pedido viene con efectivo, tarjeta en caja/mesa, transferencia, Wompi o DiDiFood.

Wompi queda como camino preparado, pero la confirmacion real debe venir por backend/webhook. Ver `docs/payment-integration-plan.md`.

## Sincronia Actual

El panel hace:

- Carga inicial al entrar.
- Suscripcion Realtime a cambios de `orders` y `order_status_events`.
- Refresco automatico cada 15 segundos.
- Refresco al volver el foco a la ventana.
- Boton manual `Actualizar`.

Este patron es suficiente para MVP porque:

- Realtime actualiza la cocina con baja latencia cuando esta disponible.
- El polling queda como fallback si el canal persistente falla.
- Es simple de operar en tablets o navegadores de cocina.

## Sincronia Siguiente Fase

Cuando haya volumen real o integraciones:

- Activar Supabase Realtime para `orders` y `order_items`.
- Mantener polling como fallback.
- Agregar sonido/alerta visual para pedidos nuevos.
- Registrar eventos de estado en tabla historica.
- Webhooks de DiDiFood/pagos deben escribir desde backend/edge function.

## Regla De Arquitectura

El frontend no decide secretos, firmas ni confirmaciones externas confiables.

Responsabilidades:

- React admin: visualiza, filtra y solicita cambios de estado.
- Supabase RLS: restringe restaurante por membresia.
- Edge/backend futuro: valida webhooks, idempotencia, pagos y estados externos.
- `orders`: fuente interna de verdad operativa.
- `integration_events`: inbox auditable de eventos externos.
