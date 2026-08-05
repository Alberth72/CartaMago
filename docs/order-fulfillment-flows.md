# Order Fulfillment Flows

## Objetivo

Cada modo de entrega debe pedir solo los datos necesarios y cerrar por el canal correcto.

## Recoger

Canal actual:

```text
CartaMago -> WhatsApp -> Confirmacion manual del restaurante
```

Datos requeridos:

- Productos.
- Nombre de quien recoge.
- Telefono para confirmar.

Regla operativa:

```text
El pedido queda pendiente hasta que el restaurante confirme por WhatsApp.
```

Riesgo:

```text
El cliente puede no llegar.
```

Mitigacion MVP:

- No prometer pedido confirmado desde la web.
- Guardar telefono para seguimiento.
- Mantener estados admin: pendiente, confirmado, preparando, listo, entregado.

## Domicilio Local

Canal actual:

```text
CartaMago -> WhatsApp -> Confirmacion manual del restaurante
```

Datos requeridos:

- Productos.
- Nombre de quien recibe.
- Telefono para confirmar.
- Direccion.

Regla operativa:

```text
Cobertura, costo de domicilio y tiempo se confirman por WhatsApp.
```

## Mesa

Canal actual:

```text
CartaMago -> WhatsApp como respaldo operativo
```

Datos requeridos:

- Productos.
- Numero de mesa.

Regla operativa:

```text
Mesa puede pasar a envio interno sin WhatsApp cuando el admin tenga notificacion confiable.
```

## DiDi Food

Canal actual:

```text
Deshabilitado para cierre publico hasta integrar tienda oficial.
```

Regla operativa:

```text
DiDi Food no debe enviar pedidos por WhatsApp desde CartaMago.
```

Flujo esperado futuro:

```text
DiDi Food -> webhook/API -> orders -> admin -> reconciliacion de estado
```

Campos esperados:

- `order_channel = didi_food`
- `delivery_provider = didi_food`
- `external_provider = didi_food`
- `external_order_id`
- `external_status`
- `external_payload`
