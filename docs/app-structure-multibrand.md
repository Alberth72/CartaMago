# Estructura de la Aplicación — Plataforma de Distribución Multi-Sede

**Fecha:** 06 de agosto de 2026
**Estado:** Diseño de producto y arquitectura (pre-ADR)

---

## 1. El Panorama del Cliente (modelo Hub-and-Spoke genérico)

El cliente describió una **cadena de distribución centralizada** que sirve a cualquier figura de negocio en las sedes:

```text
                    ┌─────────────────────────┐
                    │   BODEGA PRINCIPAL      │
                    │  - Insumos / Inventario │
                    │  - Proveedores          │
                    └───────────┬─────────────┘
                                │  Distribución
              ┌─────────────────┼─────────────────┐
              │                 │                 │
        ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
        │  Sede 1   │     │  Sede 2   │     │  Sede 10  │
        │ Restaurante│     │ Carnicería │     │ Farmacia  │
        └───────────┘     └───────────┘     └───────────┘
```

### 1.1 El ciclo de negocio genérico

```text
Bodega compra insumos a proveedores
  -> Bodega despacha insumos a las sedes
  -> Sede recibe insumos (stock de sede)
  -> Sede convierte insumos en productos (recetas/fórmulas)
  -> Sede vende productos (POS)
  -> Insumos de la sede se agotan
  -> Sede solicita reabastecimiento a la bodega
  -> (ciclo se repite)
```

### 1.2 Qué significa esto para el modelo de datos

| Concepto | Antes (asumido) | Ahora (real) |
|---|---|---|
| Nivel de inventario | Solo por sede | **Dos niveles**: stock central (bodega) + stock por sede |
| Proveedores | No modelados | **Solo a nivel de bodega central** |
| Compras | No modeladas | **Centralizadas**: la bodega compra a proveedores |
| Distribución | No modelada | **Despachos/transferencias** de bodega → sedes |
| Consumo | No modelado | Las sedes **venden (POS)** y consumen su stock por **fórmula/receta** |
| Pedido de sedes | No modelado | Las sedes **solo solicitan despacho** a la bodega (no compran directo) |
| Menú | Global | **Cada sede define su propio catálogo** con su propio QR |
| Precios | Globales | **Por sede** |
| Facturación | Centralizada | **Por sede** (cada sede con su resolución DIAN) |

### 1.3 Decisiones resueltas con el cliente (06-ago-2026)

| # | Decisión | Respuesta del cliente | Implicación |
|---|---|---|---|
| 1 | ¿Una marca puede tener más de una bodega? | **Sí**, y dejar el camino abierto para inscribir más bodegas | Modelo `brands → warehouses` (1:N) |
| 2 | ¿Las sedes pueden comprar directamente? | **No**, solo solicitan inventario a la bodega | Todo insumo entra por la bodega |
| 3 | ¿El catálogo es heredado o propio? | **Cada sede define su propio catálogo** | Cada sede tiene su QR y su catálogo |
| 4 | ¿Los precios son por sede o globales? | **Por sede** | Precios en `branch_products` |
| 5 | ¿La facturación DIAN es por sede o centralizada? | **Por sede** | Cada sede con su resolución DIAN |
| 6 | ¿El inventario se descuenta por fórmula o por producto? | **Por producto vendido con fórmula** | Ej: un plato consume varios insumos |

---

## 2. Roles y Paneles de la Aplicación

| Rol | Panel | Alcance |
|---|---|---|
| **Superadmin** | Panel Central | Toda la plataforma: marcas, bodegas, sedes, usuarios, planes |
| **Admin de Bodega** | Panel Bodega | Insumos, inventario central, proveedores, compras, despachos |
| **Admin de Sede** | Panel Sede | Catálogo, stock de sede, solicitudes de despacho, reportes, cajeros |
| **Cajero** | POS | Venta, pedidos, cierre de caja |

---

## 3. Panel Central (Superadmin)

**Propósito:** administrar toda la plataforma y la jerarquía.

| Módulo | Opciones |
|---|---|
| **Dashboard** | KPIs globales, sedes activas, bodegas, facturación del mes |
| **Marcas** | Crear/editar marcas, logo, colores, plan |
| **Bodegas** | Crear/editar bodegas centrales, asignar a marca |
| **Sedes** | Crear/editar sedes, asignar a bodega, activar/desactivar |
| **Usuarios** | Crear usuarios, asignar rol (admin bodega, admin sede, cajero), asignar a sede/bodega |
| **Planes y facturación** | Planes por marca, límites de sedes, facturación SaaS |
| **Auditoría** | Log de acciones, cambios de stock, movimientos |

---

## 4. Panel Bodega (Admin de Bodega)

**Propósito:** gestionar insumos, inventario central, proveedores y distribución.

| Módulo | Opciones |
|---|---|
| **Dashboard** | Stock crítico, despachos pendientes, compras recientes |
| **Insumos** | CRUD de insumos (nombre, unidad, costo, categoría), activar/desactivar |
| **Inventario Central** | Stock actual por insumo, ajustes, mermas, movimientos |
| **Proveedores** | CRUD de proveedores (contacto, teléfono, NIT, condiciones), activar/desactivar |
| **Compras** | Crear orden de compra a proveedor, recibir mercancía, registrar costo |
| **Despachos** | Ver solicitudes de sedes, aprobar/rechazar, crear despacho, registrar salida |
| **Transferencias** | Movimientos entre bodega y sedes, historial |
| **Reportes** | Compras por proveedor, consumo por sede, costo de insumos, stock crítico |

---

## 5. Panel Sede (Admin de Sede)

**Propósito:** gestionar el catálogo propio, el stock de la sede, las fórmulas y las solicitudes a la bodega.

| Módulo | Opciones |
|---|---|
| **Dashboard** | Ventas del día, stock crítico de sede, solicitudes pendientes |
| **Catálogo** | CRUD de categorías y productos, precios por sede, disponibilidad, imágenes, **QR propio de la sede** |
| **Fórmulas** | Definir qué insumos consume cada producto (ej: un plato = varios insumos) |
| **Stock de Sede** | Stock actual por insumo, ajustes, mermas locales |
| **Solicitudes de Despacho** | Crear solicitud a la bodega, ver estado (pendiente/aprobado/despachado/recibido), recibir mercancía |
| **Pedidos** | Ver pedidos (WhatsApp/POS), cambiar estado, historial |
| **Cajeros** | Crear/editar cajeros de la sede, asignar turnos |
| **Reportes** | Ventas por día, productos más vendidos, consumo de insumos por fórmula, cierre de caja |

---

## 6. POS (Cajero)

**Propósito:** vender y operar la caja de la sede.

| Módulo | Opciones |
|---|---|
| **Venta** | Seleccionar productos, cantidades, mesa/pedido, descuentos |
| **Pago** | Efectivo, tarjeta, transferencia, WhatsApp (pre-pedido) |
| **Facturación** | Emitir factura electrónica (DIAN) o ticket, nota crédito |
| **Cierre de Caja** | Arqueo, cuadre de efectivo, reporte de cierre |
| **Stock Rápido** | Ver stock disponible, alerta de insumo agotado |

---

## 7. Flujo de Distribución (el corazón del modelo)

```text
1. Sede detecta stock bajo
2. Sede crea Solicitud de Despacho a la Bodega
3. Bodega revisa solicitud
4. Bodega aprueba y crea Despacho (sale del inventario central)
5. Sede recibe mercancía (entra al stock de la sede)
6. Sede vende por POS -> descuenta stock de la sede por FÓRMULA
   (ej: un plato consume varios insumos)
7. Bodega compra a proveedor -> repone inventario central
```

### 7.1 Estados de una Solicitud de Despacho

```text
Pendiente -> Aprobada -> Despachada -> Recibida
     \-> Rechazada
```

### 7.2 Estados de una Orden de Compra

```text
Borrador -> Enviada a proveedor -> Recibida -> Pagada
```

---

## 8. Modelo de Datos (nivel conceptual)

```text
brands
  └── warehouses (bodegas centrales)  [1:N - una marca puede tener varias]
        ├── suppliers (proveedores)
        ├── purchase_orders (compras)
        ├── warehouse_stock (inventario central)
        └── branches (sedes)
              ├── branch_stock (stock de sede)
              ├── dispatch_requests (solicitudes de despacho)
              ├── dispatches (despachos)
              ├── catalog (categorías/productos)  [propio por sede]
              ├── branch_products (precios por sede)
              ├── formulas (fórmulas: producto -> insumos)
              ├── orders (pedidos)
              ├── invoices (facturación DIAN por sede)
              └── cashiers (cajeros)
```

### 8.1 Reglas de tenancy (RLS)

- **Superadmin**: ve todo.
- **Admin de Bodega**: ve solo su bodega y las sedes que dependen de ella.
- **Admin de Sede**: ve solo su sede.
- **Cajero**: ve solo su sede, solo módulo POS.

---

## 9. Decisiones Resueltas (para el ADR-001)

| # | Decisión | Resolución |
|---|---|---|
| 1 | ¿Una marca puede tener más de una bodega? | **Sí**, modelo 1:N, con camino abierto para más bodegas |
| 2 | ¿Las sedes pueden comprar directamente? | **No**, solo solicitan inventario a la bodega |
| 3 | ¿El catálogo es heredado o propio? | **Propio por sede**, cada sede con su QR |
| 4 | ¿Los precios son por sede o globales? | **Por sede** |
| 5 | ¿La facturación DIAN es por sede o centralizada? | **Por sede**, cada sede con su resolución |
| 6 | ¿El inventario se descuenta por fórmula o por producto? | **Por producto vendido con fórmula** |

### 9.1 Implicación de la decisión 6 (fórmulas)

El descuento de inventario por fórmula es el diseño correcto para cualquier figura de negocio. Cuando el POS vende un producto, el sistema:

1. Busca la fórmula del producto.
2. Descuenta cada insumo de la fórmula del stock de la sede.
3. Si algún insumo no tiene stock suficiente, alerta al cajero antes de confirmar la venta.

Esto requiere que el **admin de sede** defina las fórmulas en el panel Sede (módulo Fórmulas), y que el **admin de bodega** defina los insumos base (módulo Insumos).

### 9.2 Cómo descontar inventario SIN complicaciones (patrón recomendado)

**La regla de oro: el descuento ocurre en UNA sola transacción atómica en la base de datos, no en el frontend ni en lógica dispersa.**

#### El patrón: RPC atómico `sell_product`

El POS **no calcula inventario**. Solo envía `product_id + cantidad`. Un procedimiento en la base de datos hace todo el descuento en una sola operación:

```sql
-- Pseudo-código del RPC sell_product
BEGIN;
  -- 1. Bloquear los insumos de la fórmula (evita doble venta)
  SELECT * FROM branch_stock
  WHERE branch_id = $sede AND insumo_id IN (fórmula del producto)
  FOR UPDATE;

  -- 2. Verificar stock suficiente para TODOS los insumos
  --    Si alguno no alcanza -> ROLLBACK y devolver error "sin stock"

  -- 3. Descontar cada insumo de la fórmula
  UPDATE branch_stock
  SET quantity = quantity - (cantidad_venta * cantidad_fórmula)
  WHERE branch_id = $sede AND insumo_id = $insumo;

  -- 4. Registrar el movimiento de inventario (auditoría)
  INSERT INTO inventory_movements (...);

COMMIT;
```

#### Por qué esto evita complicaciones

| Complicación | Cómo la evita el RPC atómico |
|---|---|
| **Doble venta** (2 cajeros venden el último insumo) | `FOR UPDATE` bloquea el insumo; el segundo cajero espera o falla |
| **Stock negativo** | La verificación de stock ocurre dentro de la misma transacción |
| **Lógica duplicada** | El frontend solo envía `product_id + cantidad`; el descuento vive en un solo lugar |
| **Inconsistencia** | Todo ocurre en una transacción: o descuenta todo o no descuenta nada |
| **Auditoría** | Cada venta registra un movimiento de inventario |

#### Lo que el frontend (POS) hace y NO hace

| Hace | NO hace |
|---|---|
| Envía `product_id + cantidad` al backend | No calcula stock |
| Muestra el error "sin stock" si el RPC lo rechaza | No descuenta inventario |
| Muestra el stock disponible (solo lectura) | No maneja transacciones |

#### Resumen del flujo de venta

```text
Cajero vende "producto" x2
  -> POS envía { product_id: "producto", quantity: 2 }
  -> RPC sell_product:
       bloquea insumos de la fórmula
       verifica stock
       descuenta todo en una transacción
       registra movimiento
  -> POS muestra "venta exitosa" o "sin stock de [insumo]"
```

### 9.3 Validación del enfoque de fórmulas y alternativas

**¿Es funcional descontar por fórmulas? Sí, es el enfoque correcto para cualquier figura de negocio.** Pero hay que pulir 3 puntos que el modelo simple no cubre.

#### Comparación de enfoques de descuento

| Enfoque | Qué hace | ¿Funciona para cualquier negocio? | Complejidad |
|---|---|---|---|
| **A. Descuento directo por producto** | El producto ES el insumo (vendo "pollo" y descuento "pollo") | ❌ No: un plato consume varios insumos | Mínima |
| **B. Descuento por fórmula fija** | Producto → lista fija de insumos | ✅ Sí, para productos sin opciones | Media |
| **C. Descuento por fórmula con opciones** | Producto → insumos base + insumos según opción elegida | ✅ Sí, cubre el caso real | Alta |
| **D. Descuento por fórmula con merma** | Fórmula + % de merma/desperdicio | ✅ Sí, para transformación | Alta |

**Recomendación: enfoque C (fórmula con opciones) como base, con D (merma) como evolución.**

#### Punto 1: Opciones/variantes (el caso real que falta)

En cualquier negocio, el cliente casi siempre elige una variante. El modelo simple de fórmula fija no lo cubre:

```text
"Producto" NO es una fórmula fija. Es:
  - insumo base (siempre)
  - opción A O opción B O opción C (según lo que elija el cliente)
```

**Cómo modelarlo:**

```text
formulas
  ├── formula_ingredients (insumos base, siempre se descuentan)
  └── formula_options (grupos de opciones)
        grupo "acompañamiento":
          - opción A  -> 2 insumo A
          - opción B  -> 2 insumo B
          - opción C  -> 2 insumo C
```

**En el POS:** el cajero vende "producto" y elige la opción. El RPC descuenta: insumo base + opción elegida.

**En el catálogo público (QR):** el cliente elige la opción antes de agregar al carrito.

#### Punto 2: Merma y transformación

Si la bodega recibe insumos y la sede los transforma, hay merma. El modelo simple no la contempla:

```text
1 insumo entero -> se transforma en N unidades vendibles
  - N unidades vendibles
  - merma: desperdicio no vendible
```

**Cómo modelarlo (evolución, no fase 1):**

```text
fórmulas con factor de rendimiento:
  - 1 insumo entero rinde N unidades (factor N)
  - al transformar, se registra merma (ej: 10%)
```

**En fase 1:** se puede simplificar definiendo el insumo como la unidad vendible directamente (la bodega despacha unidades vendibles). La merma se maneja como ajuste manual de inventario. Esto evita la complejidad de la transformación al inicio.

#### Punto 3: Stock insuficiente — ¿bloquear o vender?

Hay dos filosofías:

| Filosofía | Comportamiento | Cuándo usarla |
|---|---|---|
| **Bloquear venta** | Si falta un insumo, el POS rechaza la venta | Fase 1 (control estricto) |
| **Vender con alerta** | El POS vende pero marca "stock bajo" y registra el faltante | Cuando el cliente no quiere perder ventas |

**Recomendación:** fase 1 = **bloquear venta** (control estricto). Es más simple y evita stock negativo. La opción "vender con alerta" se puede agregar después si el cliente lo pide.

#### Resumen de lo que hay que pulir

| Punto | Decisión | Impacto |
|---|---|---|
| **Opciones/variantes** | Modelar `formula_options` (variante elegible) | Es el caso real; sin esto, el descuento es incorrecto |
| **Merma/transformación** | Fase 1: insumo = unidad vendible; merma = ajuste manual | Evita complejidad de transformación al inicio |
| **Stock insuficiente** | Fase 1: bloquear venta | Control estricto, sin stock negativo |

**Conclusión:** el enfoque de fórmulas es funcional y correcto para cualquier figura de negocio, pero **debe incluir opciones/variantes** desde el inicio (el cliente elige variante). La merma y la transformación se pueden simplificar en fase 1 y evolucionar después.

### 9.4 Merma: concepto y modelo de base de datos

#### ¿Qué es la merma?

**Merma = pérdida de insumo** que no se convierte en producto vendible. Hay dos tipos:

| Tipo | Qué es | Ejemplo |
|---|---|---|
| **Merma de transformación** | Pérdida al convertir insumo → producto | Pollo entero → cuartos: se pierde piel, hueso, grasa |
| **Merma de almacenamiento** | Pérdida por daño, vencimiento o robo | Papas que se pudren, medicamento vencido, producto roto |

**Por qué importa:** sin merma, el inventario "no cuadra". Si la bodega despacha 100 pollos y la sede vende 400 cuartos, el sistema diría que sobran 0 pollos, pero en realidad se perdieron 10 en el despiece. La merma explica esa diferencia.

#### Cómo se registra la merma (dos enfoques)

**Enfoque A: Merma como movimiento de inventario (recomendado)**

La merma es un **tipo de movimiento** en la tabla `inventory_movements`. Cuando hay pérdida, se registra un movimiento de tipo `merma`:

```text
inventory_movements
  ├── id
  ├── branch_id / warehouse_id   (dónde ocurrió)
  ├── insumo_id                  (qué insumo se perdió)
  ├── quantity                   (cantidad perdida, negativa)
  ├── movement_type              ('compra', 'venta', 'despacho', 'recepción', 'merma', 'ajuste')
  ├── reason                     (motivo: 'vencimiento', 'daño', 'despiece', 'robo')
  ├── created_by                 (quién registró)
  └── created_at
```

**Ventaja:** la merma queda en el historial, es auditable, y el stock se descuenta automáticamente al registrar el movimiento.

**Enfoque B: Merma como porcentaje en la fórmula**

La fórmula tiene un `% de merma` que se aplica automáticamente al descontar:

```text
formulas
  ├── id
  ├── product_id
  ├── insumo_id
  ├── quantity_per_unit          (cuánto insumo consume 1 unidad)
  └── merma_percent              (ej: 10% = se pierde 10% al transformar)
```

**Ejemplo:** si la fórmula dice "1 pollo asado = 1 pollo + 10% merma", al vender 1 pollo asado se descuentan 1.1 pollos (1 + 10%).

**Ventaja:** la merma se descuenta automáticamente en cada venta, sin registro manual.

#### Recomendación: combinar ambos enfoques

| Enfoque | Cuándo usarlo |
|---|---|
| **A. Merma como movimiento** | Para merma de almacenamiento (vencimiento, daño, robo) — es un evento puntual |
| **B. Merma como % en fórmula** | Para merma de transformación (despiece, cocción) — es un costo fijo por producto |

**En fase 1:** implementar el **Enfoque A** (merma como movimiento) porque es más simple y cubre el caso que el cliente ya conoce (registrar pérdidas puntuales). El **Enfoque B** (porcentaje en fórmula) se agrega después si el cliente quiere que la merma se descuente automáticamente en cada venta.

#### Modelo de datos completo para merma

```text
inventory_movements (tabla de movimientos, incluye merma)
  ├── id
  ├── branch_id / warehouse_id   -- dónde ocurrió
  ├── insumo_id                  -- qué insumo
  ├── quantity                   -- cantidad (positiva = entrada, negativa = salida)
  ├── movement_type              -- 'compra' | 'venta' | 'despacho' | 'recepción' | 'merma' | 'ajuste'
  ├── reason                     -- motivo de la merma: 'vencimiento' | 'daño' | 'despiece' | 'robo' | 'otro'
  ├── reference_id               -- opcional: id de la venta/despacho/compra que originó el movimiento
  ├── created_by                 -- quién registró
  └── created_at

formulas (tabla de fórmulas, con merma opcional)
  ├── id
  ├── product_id                 -- producto de la sede
  ├── insumo_id                  -- insumo que consume
  ├── quantity_per_unit          -- cuánto insumo consume 1 unidad
  └── merma_percent              -- % de merma de transformación (opcional, default 0)
```

#### Flujo de registro de merma (Enfoque A)

```text
Admin de Sede detecta pérdida (ej: 5 papas podridas)
  -> Panel Sede > Stock de Sede > "Registrar merma"
  -> Selecciona insumo (papas), cantidad (5), motivo (daño)
  -> Sistema crea inventory_movements con movement_type='merma', quantity=-5
  -> Stock de la sede se descuenta automáticamente
  -> Queda en el historial para auditoría
```

#### Reporte de merma

El panel Sede y el panel Bodega deben poder ver:

```text
Reporte de merma por período:
  - Total de merma por insumo
  - Merma por motivo (vencimiento, daño, despiece, robo)
  - % de merma vs. consumo total (para detectar problemas)
  - Merma por sede (para comparar sedes)
```

---

## 10. Impacto en la Estimación

El modelo hub-and-spoke **agrega complejidad** a la fase de inventario (fase 2) porque introduce:

- Stock en dos niveles (central + sede).
- Flujo de solicitud/despacho/recepción.
- Compras y proveedores centralizados.
- **Fórmulas** (producto → insumos) para descuento automático de stock.
- Catálogo y precios por sede (cada sede con su QR).
- Facturación DIAN por sede (cada sede con su resolución).

**Estimación ajustada (tasa $3,000 COP/USD):**

| Fase | Antes | Con bodega central + fórmulas |
|---|---|---|
| 2. Inventario | $57M – $107M | **$75M – $140M** |
| Total proyecto | $250M – $430M | **$275M – $470M** |
| Duración | 4.5–6 meses | **5–6.5 meses** |