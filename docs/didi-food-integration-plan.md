# DiDiFood Integration Plan

## Objetivo

CartaMago debe capturar el pedido desde el menu propio y centralizarlo en el panel de pedidos, sin importar el modo:

- Recoger en restaurante.
- Mesa.
- Domicilio con mensajeria del local.
- Domicilio por DiDiFood.

WhatsApp sigue siendo el handoff operativo actual para recoger, mesa y domicilio local. DiDiFood entra como proveedor de cumplimiento externo, no como reemplazo del menu CartaMago ni como pedido por WhatsApp.

## Fuentes Confirmadas

La plataforma oficial de desarrolladores de DiDi Food ofrece APIs, documentacion, herramientas y centro de ayuda para integracion. La version publica menciona integracion de menus y pedidos.

```text
https://developer.didi-food.com/
https://developer.didi-food.com/es-MX/home
```

DiDiFood tambien aparece en flujos de integradores POS donde se autoriza una tienda y se reciben detalles de pedido y tiempo de recogida.

```text
https://help.deliverect.com/en/articles/7979340-didi-food-link-your-didi-food-store
```

Hasta tener usuario developer, no se deben inventar endpoints, firmas ni payloads oficiales.

## Decision De Producto

El selector del menu puede mostrar:

```text
Recoger
Domicilio local
DiDiFood
Mesa
```

Recoger, domicilio local y mesa se cierran por WhatsApp mientras no haya notificaciones internas robustas. DiDiFood no debe finalizar desde el boton de WhatsApp.

Todos los pedidos operativos se guardan en `orders` y aparecen en el panel interno.

DiDiFood se modela inicialmente como:

```text
fulfillment_mode = didi_food
delivery_provider = didi_food
external_provider = didi_food
external_status = draft
```

## Preparacion Implementada

- Nuevo modo `didi_food`.
- Nuevo modo `local_delivery` para separar domicilio del local de DiDiFood.
- Compatibilidad de lectura para pedidos legacy `delivery`.
- Mensaje WhatsApp distingue `Domicilio con mensajeria del local` y `Domicilio por DiDiFood`.
- El cierre publico por DiDiFood queda bloqueado hasta tener integracion oficial.
- `orders` queda preparado con campos de canal, proveedor externo, estado externo y payload externo.
- Nuevas tablas para `restaurant_integrations` e `integration_events`.
- Contrato local `DidiFoodDraftOrder` para preparar el adapter futuro sin acoplar UI a la API real.
- Vista admin `Integraciones -> DiDi Food` para registrar preparacion no secreta: tienda externa, estado sandbox y notas internas.

## Base De Datos

Migracion:

```text
supabase/migrations/202607280001_order_channels_and_integrations.sql
```

Campos nuevos en `orders`:

```text
order_channel
delivery_provider
payment_status
external_provider
external_order_id
external_status
external_payload
```

Tablas nuevas:

```text
restaurant_integrations
integration_events
```

## Adapter Futuro

Cuando tengamos acceso developer:

```text
Cart/order domain -> DidiFoodAdapter -> DiDi Food Open Platform
```

Funciones esperadas, sujetas a documentacion oficial:

- Autorizar tienda.
- Mapear tienda externa.
- Sincronizar menu/productos/disponibilidad.
- Crear o entregar orden a DiDiFood si la API lo permite.
- Recibir webhooks de estado.
- Reconciliar eventos externos con `orders`.

## Gate De Seguridad

- No guardar secretos DiDi en frontend.
- No usar variables `VITE_` para tokens privados.
- Validar firma de webhooks en backend o edge function.
- Hacer eventos idempotentes por `external_id`.
- Mantener WhatsApp como fallback operativo.
- Separar estado de pedido de estado de pago.

## Siguiente Slice Disponible

Sin usuario developer todavia, el siguiente avance util es fortalecer el contrato interno:

```text
Integration events -> Order sync monitor -> Manual reconciliation
```

Trabajo concreto:

- Mostrar eventos de integracion por pedido.
- Crear adapter mock `DidiFoodAdapter` con respuestas locales.
- Preparar Edge Function `didi-food-webhook` sin activar proveedor real.
- Definir mapeo menu/productos/disponibilidad hacia payload interno neutro.
- Con credenciales developer, reemplazar el mock por el adapter oficial.
