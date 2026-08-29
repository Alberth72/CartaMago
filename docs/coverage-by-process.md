# Cobertura por Proceso (TDD + BDD)

Generado automáticamente el 2026-08-29T23:26:44.582Z — no editar a mano.

## Cómo se mide

- **TDD (unit)**: cobertura de líneas por archivo mediante `@vitest/coverage-v8` (`npm run test:coverage`).
- **BDD (e2e)**: cobertura de funciones ejecutadas en escenarios Playwright (`page.coverage` en Chromium), capturada por los specs y convertida con `npm run coverage:e2e:convert`.
- **Proceso**: cada archivo de `src/` o `apps/api/src/` se asigna a un único proceso de negocio (ver mapa en `scripts/coverage-report.mjs`).

## Comandos

```text
npm run test:coverage          # TDD: vitest + coverage v8 -> coverage/unit
npm run test:e2e               # BDD público (captura coverage en Chromium)
npm run test:e2e:admin         # BDD admin (captura coverage en Chromium)
npm run coverage:e2e:convert   # convierte capturas -> coverage/e2e/coverage-final.json
npm run coverage:report        # genera docs/coverage-by-process.md
npm run test:coverage:all      # todo el pipeline en un comando
```

## Resumen por proceso

| Proceso | Archivos | Líneas TDD | % TDD | Funciones BDD | % BDD | Tests unit | Specs/scenarios BDD | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Menú público (QR) | 10 | 165/1309 | 12.6% | 52/120 | 43.3% | 1 | 1/4 | critico |
| Pedido y WhatsApp | 5 | 163/200 | 81.5% | 5/19 | 26.3% | 2 | 1/1 | cubierto |
| Admin: autenticación y roles | 7 | 51/396 | 12.9% | 30/50 | 60% | 2 | 2/4 | critico |
| Admin: menú y productos | 6 | 0/801 | 0% | 51/83 | 61.4% | 0 | 1/3 | critico |
| Admin: bandeja de pedidos | 5 | 56/733 | 7.6% | 30/72 | 41.7% | 2 | 1/1 | critico |
| Operaciones: inventario, mermas y stock | 10 | 176/2234 | 7.9% | 114/193 | 59.1% | 1 | 1/1 | critico |
| Compras y bodega | 4 | 21/948 | 2.2% | 0/0 | — | 1 | 0/0 | critico |
| Caja y ventas | 7 | 81/951 | 8.5% | 45/63 | 71.4% | 1 | 1/1 | critico |
| Reportes (superadmin) | 4 | 41/169 | 24.3% | 15/18 | 83.3% | 1 | 1/1 | critico |
| Tracking y pantallas | 6 | 0/1044 | 0% | 70/95 | 73.7% | 0 | 1/4 | critico |
| Recibos e impresión | 4 | 0/155 | 0% | 6/15 | 40% | 0 | 0/0 | critico |
| Integraciones externas | 4 | 0/296 | 0% | 28/32 | 87.5% | 0 | 1/1 | critico |
| API NestJS (núcleo) | 17 | 19/536 | 3.5% | 0/0 | — | 1 | 0/0 | critico |
| Infra compartida (lib/services/app/components/admin shell) | 16 | 427/1405 | 30.4% | 108/170 | 63.5% | 3 | 0/0 | parcial |

## Detalle por proceso

### Admin: menú y productos (`admin-menu`)

- Estado: critico
- Líneas TDD: 0/801 (0%)
- Funciones BDD: 51/83 (61.4%)
- Tests unit: ninguno directo
- BDD: 1 spec(s), 3 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Tracking y pantallas (`tracking`)

- Estado: critico
- Líneas TDD: 0/1044 (0%)
- Funciones BDD: 70/95 (73.7%)
- Tests unit: ninguno directo
- BDD: 1 spec(s), 4 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Recibos e impresión (`recibos`)

- Estado: critico
- Líneas TDD: 0/155 (0%)
- Funciones BDD: 6/15 (40%)
- Tests unit: ninguno directo
- BDD: 0 spec(s), 0 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Integraciones externas (`integraciones`)

- Estado: critico
- Líneas TDD: 0/296 (0%)
- Funciones BDD: 28/32 (87.5%)
- Tests unit: ninguno directo
- BDD: 1 spec(s), 1 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Compras y bodega (`compras-bodega`)

- Estado: critico
- Líneas TDD: 21/948 (2.2%)
- Funciones BDD: 0/0 (—)
- Tests unit: `tests/unit/repositories/adminWarehousePurchasingRepository.test.ts`
- BDD: 0 spec(s), 0 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### API NestJS (núcleo) (`api-core`)

- Estado: critico
- Líneas TDD: 19/536 (3.5%)
- Funciones BDD: 0/0 (—)
- Tests unit: `tests/unit/api/tenancy.service.test.ts`
- BDD: 0 spec(s), 0 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Admin: bandeja de pedidos (`admin-pedidos`)

- Estado: critico
- Líneas TDD: 56/733 (7.6%)
- Funciones BDD: 30/72 (41.7%)
- Tests unit: `tests/unit/repositories/adminOrderRepository.test.ts`, `tests/unit/repositories/mockParity.test.ts`
- BDD: 1 spec(s), 1 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Operaciones: inventario, mermas y stock (`operaciones`)

- Estado: critico
- Líneas TDD: 176/2234 (7.9%)
- Funciones BDD: 114/193 (59.1%)
- Tests unit: `tests/unit/repositories/adminOperationsRepository.test.ts`
- BDD: 1 spec(s), 1 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Caja y ventas (`caja-ventas`)

- Estado: critico
- Líneas TDD: 81/951 (8.5%)
- Funciones BDD: 45/63 (71.4%)
- Tests unit: `tests/unit/api/cash.service.test.ts`
- BDD: 1 spec(s), 1 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Menú público (QR) (`menu-publico`)

- Estado: critico
- Líneas TDD: 165/1309 (12.6%)
- Funciones BDD: 52/120 (43.3%)
- Tests unit: `tests/unit/features/order/orderReceipt.test.ts`
- BDD: 1 spec(s), 4 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Admin: autenticación y roles (`admin-auth`)

- Estado: critico
- Líneas TDD: 51/396 (12.9%)
- Funciones BDD: 30/50 (60%)
- Tests unit: `tests/unit/features/admin/roleAccess.test.ts`, `tests/unit/repositories/adminAuthRepository.test.ts`
- BDD: 2 spec(s), 4 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Reportes (superadmin) (`reportes`)

- Estado: critico
- Líneas TDD: 41/169 (24.3%)
- Funciones BDD: 15/18 (83.3%)
- Tests unit: `tests/unit/repositories/adminReportsRepository.test.ts`
- BDD: 1 spec(s), 1 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Infra compartida (lib/services/app/components/admin shell) (`shared-infra`)

- Estado: parcial
- Líneas TDD: 427/1405 (30.4%)
- Funciones BDD: 108/170 (63.5%)
- Tests unit: `tests/unit/lib/branchLinks.test.ts`, `tests/unit/lib/format.test.ts`, `tests/unit/lib/slug.test.ts`
- BDD: 0 spec(s), 0 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

### Pedido y WhatsApp (`pedido-whatsapp`)

- Estado: cubierto
- Líneas TDD: 163/200 (81.5%)
- Funciones BDD: 5/19 (26.3%)
- Tests unit: `tests/unit/features/order/orderMessage.test.ts`, `tests/unit/features/order/payment.test.ts`
- BDD: 1 spec(s), 1 escenario(s)

_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._

## Prioridades sugeridas (menor cobertura TDD primero)

1. **Admin: menú y productos** — 0% líneas TDD, 61.4% funciones BDD
1. **Tracking y pantallas** — 0% líneas TDD, 73.7% funciones BDD
1. **Recibos e impresión** — 0% líneas TDD, 40% funciones BDD
1. **Integraciones externas** — 0% líneas TDD, 87.5% funciones BDD
1. **Compras y bodega** — 2.2% líneas TDD, — funciones BDD
1. **API NestJS (núcleo)** — 3.5% líneas TDD, — funciones BDD
1. **Admin: bandeja de pedidos** — 7.6% líneas TDD, 41.7% funciones BDD
1. **Operaciones: inventario, mermas y stock** — 7.9% líneas TDD, 59.1% funciones BDD
1. **Caja y ventas** — 8.5% líneas TDD, 71.4% funciones BDD
1. **Menú público (QR)** — 12.6% líneas TDD, 43.3% funciones BDD
1. **Admin: autenticación y roles** — 12.9% líneas TDD, 60% funciones BDD
1. **Reportes (superadmin)** — 24.3% líneas TDD, 83.3% funciones BDD
1. **Infra compartida (lib/services/app/components/admin shell)** — 30.4% líneas TDD, 63.5% funciones BDD
1. **Pedido y WhatsApp** — 81.5% líneas TDD, 26.3% funciones BDD
