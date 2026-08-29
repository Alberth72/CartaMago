# Admin Operational Flows

## Principio

Cada clic cuesta tiempo. El admin no debe resolver caja, inventario, compras y configuracion desde la misma pantalla.

## Caja

Prioridad: vender rapido y cuadrar efectivo.

Flujo:

```text
Seleccionar sede
-> Abrir caja con nombre y base inicial
-> Entregar enlace de terminal de esa caja
-> Cajero abre el terminal de caja
-> Tocar productos para agregarlos al carrito
-> Ajustar cantidades
-> Elegir metodo de pago
-> Cobrar venta
-> Cerrar caja con conteo real
```

Reglas:

- Una sede puede tener una o varias cajas abiertas.
- Cada caja abierta tiene su propio token operativo y ruta dedicada.
- La venta canonica se registra desde `/s/:branchId/caja/:cashSessionId/t/:accessToken`.
- El tab Caja del admin abre, selecciona, comparte enlace, supervisa ventas recientes y cierra cajas.
- El admin no carga productos ni carrito dentro de Caja mientras no se decida permitir venta administrativa.
- Cada venta del terminal crea una venta financiera (`sales`) y un pedido operativo (`orders`) visible en la bandeja de pedidos/cocina.
- Los productos con formula activa descuentan inventario automaticamente.
- Los productos sin formula activa se venden y quedan auditados, pero no descuentan stock hasta que Operacion/Inventario les configure formula.
- El cierre calcula efectivo esperado como base inicial mas ventas en efectivo pagadas de esa caja.
- Al cerrar caja, el token queda revocado y el enlace operativo deja de vender.

## Operacion

Prioridad: que la sede no se quede sin producto.

Flujo:

```text
Ver stock de sede
-> Solicitar reabastecimiento a bodega
-> Seguir estado del despacho
-> Recibir despacho
```

Reglas:

- No debe mezclar venta POS ni cuadre de caja.
- La sede pide insumos; la bodega despacha; la sede recibe.
- El foco es continuidad operativa, no cobro.
- Cuando cambia `branch_stock` o `warehouse_stock`, Operacion debe refrescar la lectura visible sin pedir recarga manual. Usar Realtime y catch-up al volver a foco/visibilidad.

## Inventario

Prioridad: corregir stock real y auditar perdidas.

Flujo:

```text
Revisar stock
-> Registrar merma
-> Auditar movimientos
```

Reglas:

- Merma descuenta stock con motivo.
- Inventario no debe pedir pagos ni cerrar caja.
- Las formulas conectan productos vendidos con insumos descontados.
- Inventario debe refrescarse por eventos de `branch_stock` e `inventory_movements`; caja, pedido publico, despacho y merma no deben requerir recargar la pagina para ver el stock real. Las ventanas del mismo origen deben emitir un evento local de stock cambiado despues de una venta exitosa.

## Administrador De Sede

Prioridades naturales:

```text
1. Caja: abrir caja, vender y cerrar turno.
2. Pedidos: confirmar y mover estados.
3. Operacion: pedir/recibir reabastecimiento.
4. Inventario: registrar mermas y revisar stock.
5. Menu: ajustar disponibilidad, precios o productos.
```

El cajero debe vivir casi siempre en Caja. El administrador de sede entra a los demas tabs solo cuando la operacion lo exige.
