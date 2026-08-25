# Transición Multi-Sede (40+ sedes) — Evaluación y Primer Camino

> Estado: evaluación de arquitectura + primera tajada implementada (Fase 0 + Fase 1) para
> el rol `superadmin` (solo informes) y el módulo de Reportes sobre la BD.
> Objetivo: un proyecto que hoy valida 2 sedes pero **está diseñado para 40+**, sin construir backend pesado antes de que lo pida un segundo pagador/compromiso real.

## Caras (roles) del producto

| Cara | Rol (OperationsRole) | Hoy | Target a 40 sedes |
|---|---|---|---|
| Cliente | (público) | QR → menú → WhatsApp. Hecho | Igual + tracking por token |
| Admin de sede | `branch_admin` | Catálogo, pedidos, stock de sede, solicitudes. Hecho | Separar por sede con RLS estricto |
| Admin de bodega | `warehouse_admin` | Stock central, compras, despachos. Hecho | Igual + reportes de compras/consumo |
| Admin de todo | `superadmin` | HOY: panel completo (CRUD). **Cambio:** debe ser **solo informes** | Solo reportes consolidados del brand |

Dato clave: hoy el `superadmin` maneja CRUD de todo (ver `AdminApp.tsx`). El nuevo rol objetivo lo restringe a **reportes** (read-only). Esto es una decisión de producto que hay que fijar.

## Qué ya está hecho (fundación multi-tenant correcta)

- Esquema `brands → warehouses → branches` + `multibrand_members` (roles) + RLS por tenencia.
- Stock en dos niveles (`warehouse_stock` / `branch_stock`) + `inventory_movements` + `formulas`.
- Ciclo operativo: `dispatch_requests`, `dispatches`, `purchase_orders`, `suppliers`, RPCs (`create_dispatch_request`, `dispatch_request`, `receive_dispatch`, `sell_product`, `register_merma`, `create_purchase_order`…).
- Pedidos: `orders`, `order_items`, `order_status_events`, Edge Function `create-order`.

**La base de datos ya soporta 40 sedes.** El cuello de botella no es la BD, es la **capa de aplicación**.

## Qué NO está hecho (y cuándo construirlo)

- **Reportes consolidados para `superadmin`** (no existe módulo de reportes). ← primer camino
- **Backend de aplicación (NestJS u otro Node)** con colas/webhooks/idempotencia para DIAN, pagos, DiDi, concurrencia de stock. ← NO ahora; solo cuando haya 2º pagador (regla dura).
- POS, cierre de caja, facturación electrónica DIAN. ← Fase posterior.

## Primer camino de transformación (road)

### Fase 0 — Fijar arquitectura objetivo y alinear docs
- Marcar explícitamente que **NestJS es target, no presente** (evitar asumir cobertura que no existe).
- ADRs: confirmar ADR-001 (multi-tenant, hecho) y dejar ADR-002 (inventario=NestJS) como plan.
- Definir que `superadmin` = solo reportes.

### Fase 1 — Primera tajada (hecho: superadmin report-only + módulo Reportes)
**Superadmin report-only + módulo de Reportes**, leyendo lo que ya hay en la BD:

- DB (Supabase): RPC read-only `report_brand_overview` (migración `202608160001`),
  gated a `superadmin` de la marca por RLS (`multibrand_members`). Devuelve:
  ventas por día/sede, embudo de pedidos, stock crítico, compras y despachos abiertos.
- Admin: tab **Reportes** (solo superadmin); en producción el superadmin ve
  **solo** Reportes (CRUD oculto). En mock (dev:mock/e2e) conserva CRUD para testing.
- Implementado en: `reportsTypes.ts`, `adminReportsRepository.ts`, `useAdminReports.ts`,
  `ReportsPanel.tsx`, `AdminApp.tsx` (nuevo rol).
- Unit tests (43) y e2e admin (`reports.spec.ts`) para el panel de reportes.

### Fase 2 — Frontera de servicio de aplicación (NestJS) [gate: 2º pagador]
- Migrar los costures pesados/async fuera del cliente y de RPCs simples: webhooks (DiDi/DIAN/pagos), idempotencia, colas (Redis + BullMQ), concurrencia de stock, notificaciones.
- Detrás del MISMO Postgres (Supabase o RDS) — no se reescribe la BD.

### Fase 3 — POS, cierre de caja, facturación DIAN
- App de cajero, arqueo de caja, tickets, factura electrónica por operador autorizado DIAN.

## Decisión que necesito de ti
1. ¿Confirmas `superadmin` = **solo informes** (hoy gestiona todo)?
2. ¿Arrancamos por la **Fase 1 (Reportes read-only sobre la BD)** o prefieres primero solo la Fase 0 (docs/ADR) y tocar reportes después?

## Referencias
- `docs/architecture.md` (estado actual) · `docs/app-structure-multibrand.md` (target) · `docs/roadmap.md` (gates) · `src/features/admin/AdminApp.tsx` (roles hoy)
