# CartaMago — Ruta de Producto (Roadmap)

**Objetivo de la aplicación** (ver `AGENTS.md` y `docs/product-identity.md`):

```text
Plataforma ligera de menú QR + pedidos por WhatsApp, reutilizable para varias
negocios. El flujo core validado es:
QR -> Menú público -> Carrito -> Pedido WhatsApp -> Negocio confirma.
```

La prioridad es entregar un producto vendible y estable primero; la expansión
multi-sede es una oportunidad de cliente que **solo se construye cuando un
segundo pagador lo justifica** (regla dura: no backend pesado en el MVP).

---

## Objetivo operativo vigente

```text
Bodega central -> sedes -> solicitud de reabastecimiento -> despacho ->
recepcion en sede -> descuento por venta/formula.
```

## Fases

### Fase 0 — Estabilizar y consolidar (actual)
Hacer que el repositorio y el build vuelvan a ser reproducibles y verdes.

| Acción | Estado |
|---|---|
| Build `npm run build` y lint `npm run lint` en verde | Hecho |
| Reparar extracción incompleta de Supabase/slug (`supabaseClient.ts`, `slug.ts`) | Hecho |
| Alinear tests/docs/scripts a `VITE_BRANCH_ID` y `branch_id` | Hecho |
| E2E público y admin mock en verde | Hecho |
| Silenciar falso warning de chunk (PowerShell) en `vite.config.ts` | Hecho |
| Commit del trabajo pendiente coherente (inventario/merma + docs + migraciones) | Pendiente |
| Documentar el roadmap y actualizar `progress-dashboard.md` | Hecho |
| **Salida:** árbol limpio, build verde, historial reproducible. | — |

### Fase 1 — Cerrar MVP de Brasas & Sazón (primer cliente)
Cerrar el ciclo comercial del restaurante real.

| Acción | Evidencia / Gate |
|---|---|
| Confirmar precios reales y reemplazar temporales | `src/data/restaurantSeed.ts`, Supabase |
| Guardar número oficial de WhatsApp | `docs/whatsapp-launch-checklist.md` |
| Validar edición/upload desde admin en producción | Hecho: upload temporal en `pollo-entero`, QR público verificó imagen, rollback limpio |
| Re-verificar QR → menú → carrito → WhatsApp → confirmación | Test manual en móvil |
| QA visual móvil y densidad del product-card | Deploy en Netlify |
| Push a GitHub (`main`) | `docs/github-publish-checklist.md` |
| **Salida:** primer cliente operando con pagos fuera del app (WhatsApp). | — |

### Fase 2 — Multi-sede / multi-marca (solo con 2º pagador)
Pivote hacia bodegas/sedes/fórmulas cuando exista justificación.

```
Frente: activar el eje brands -> warehouses -> branches
```

| Acción | Gate |
|---|---|
| Aplicar en orden y en staging (local): `202608080001` y `202608080002` | ✅ migraciones + seed aplican (validado en staging local) |
| Alinear el código a `branch_id` | Hecho en el árbol local; requiere deploy coordinado con migraciones |
| Actualizar `supabase/seed.sql` al modelo `branches` | ✅ hecho |
| Reescribir `adminInventoryRepository` (`branch_stock`) y consultas de menú/pedidos | ✅ hecho |
| RLS por tenant verificada | `supabase/tests/security_rls_check.sql` |
| Rollout: aplicar migraciones + seed a staging/producción JUNTOS con el deploy de código | Hecho en Supabase cloud + Netlify production |
| **Salida:** multi-tenant operativo. | Cloud migrado; falta ciclo real de edición/upload con dueño |

> ⚠️ **Lección de estabilidad (validada en staging local, 08-ago-2026):**
> La migración multi-marca y la app son **dos mitades de un mismo cambio**.
> La cadena `202608080001+002` convierte `restaurants`→`branches` y
> `restaurant_id`→`branch_id`. El árbol local ya está alineado al modelo
> `branches/branch_id`, pero producción solo debe recibirlo junto con las
> migraciones, seed y variables `VITE_BRANCH_ID` coordinadas.
> Rollout cloud ejecutado: se reparó historial remoto hasta `202607290002`, se
> aplicaron migraciones `202607300001`→`202608080002`, se desplegó
> `create-order`, y Netlify production quedó en deploy `6a7fbf1709294fda6d2c916f`.
> Backup previo: schema `pre_rollout_202608_branch`.
> Fixes necesarios de la cadena `202608080002` (hallados en staging):
> 1. Orden de DROPs por dependencias (`dispatch_items` antes que `dispatches`,
>    `dispatch_request_items` antes que `dispatch_requests`).
> 2. Dropear la `branches` stub de `202608080001` (y sus FKs
>    `inventory_movements.branch_id/warehouse_id`) antes del rename
>    `restaurants → branches`.
> 3. No dropear `can_manage_brand/warehouse/branch` (crear-or-replace conserva
>    las policies de `brands/warehouses/suppliers/purchase*/warehouse_stock`).
> 4. `DROP ... CASCADE` para las funciones de tenancy del restaurante
>    (`is_restaurant_member`, `restaurant_has_members`, `can_manage_restaurant`).
> 5. `drop policy` previa de storage `"public can read menu assets"`.
> 6. Dropear `register_merma` antes de recrearla (cambia `p_restaurant_id`→`p_branch_id`;
>    Postgres no permite renombrar parámetros con CREATE OR REPLACE).

### Fase 3 — Operaciones (inventario transaccional, POS, DIAN)
Núcleo operativo pesado; requiere arquitectura SaaS y decisión de negocio.

| Acción | Nota |
|---|---|
| Inventario transaccional + fórmulas (`sell_product`) | Ya diseñado en migraciones |
| POS multi-sede / cajero | Requiere app dedicada |
| Facturación electrónica DIAN | Integración con operador; es el límite real |
| **Salida:** plataforma operativa (no solo menú). | — |

---

## Tajada activa: bodega central + dos sedes

| Accion | Gate |
|---|---|
| RPCs operativas de solicitud, despacho y recepcion | Hecho: `202608150001_warehouse_dispatch_operations.sql` |
| Demo operativa con bodega central + dos sedes + stock inicial | Hecho en migracion idempotente |
| Pantalla Admin `Operacion` para bodega/sedes/solicitudes/venta | Hecho |
| Scope por usuario: admin de sede queda atado a su sede y admin de bodega gestiona despacho central | Hecho |
| E2E mock del ciclo solicitud -> despacho -> recepcion | Hecho: `npm.cmd run test:e2e:admin` |
| Aplicar `202608150001` en Supabase cloud | Pendiente |
| Smoke cloud con usuario real: crear solicitud, despachar, recibir, registrar venta | Pendiente |

## Reglas de avance

- No se inicia una fase nueva sin cerrar la salida de la anterior.
- Prioridad del usuario final: leer y ordenar rápido (móvil). Nada debe bloquear el pedido.
- Backend propio solo cuando Supabase no pueda expresar la regla.
- El código y las migraciones deben quedar coherentes entre sí antes de commitear.
