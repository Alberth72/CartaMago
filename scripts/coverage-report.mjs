#!/usr/bin/env node
// Reporte de cobertura TDD + BDD por proceso de negocio de CartaMago.
//
// Fuentes:
//   - TDD : coverage/unit/coverage-final.json   (generado por `vitest run --coverage`)
//   - BDD : coverage/e2e/coverage-final.json    (generado por `node scripts/coverage-e2e-convert.mjs`)
//
// Salida:
//   - Tabla por proceso en consola
//   - docs/coverage-by-process.md
//
// Uso: node scripts/coverage-report.mjs
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname, sep } from 'node:path'

const root = process.cwd()

// Mapa de procesos: cada archivo productivo se asigna a un único proceso.
const PROCESSES = [
  { id: 'menu-publico', name: 'Menú público (QR)', patterns: ['src/features/menu/', 'src/data/'] },
  { id: 'pedido-whatsapp', name: 'Pedido y WhatsApp', patterns: ['src/features/order/'] },
  {
    id: 'admin-auth',
    name: 'Admin: autenticación y roles',
    patterns: [
      'src/features/admin/roleAccess.ts',
      'src/features/admin/hooks/useAdminAuth.ts',
      'src/features/admin/repositories/adminAuthRepository.ts',
      'src/features/admin/repositories/adminScopeRepository.ts',
      'src/features/admin/components/LoginForm.tsx',
      'src/features/admin/components/AdminShell.tsx',
      'src/features/admin/components/AdminSetupNotice.tsx',
    ],
  },
  {
    id: 'admin-menu',
    name: 'Admin: menú y productos',
    patterns: [
      'src/features/admin/repositories/adminMenuRepository.ts',
      'src/features/admin/hooks/useAdminMenu.ts',
      'src/features/admin/components/CategoryPanel.tsx',
      'src/features/admin/components/ProductEditor.tsx',
      'src/features/admin/components/ProductGrid.tsx',
      'src/features/admin/components/RestaurantPanel.tsx',
    ],
  },
  {
    id: 'admin-pedidos',
    name: 'Admin: bandeja de pedidos',
    patterns: [
      'src/features/admin/repositories/adminOrderRepository.ts',
      'src/features/admin/components/OrdersPanel.tsx',
      'src/features/admin/components/OrdersList.tsx',
      'src/features/admin/components/OrderDetailModal.tsx',
      'src/features/admin/orderUi.ts',
    ],
  },
  {
    id: 'operaciones',
    name: 'Operaciones: inventario, mermas y stock',
    patterns: [
      'src/features/admin/repositories/adminInventoryRepository.ts',
      'src/features/admin/repositories/adminOperationsRepository.ts',
      'src/features/admin/hooks/useAdminInventory.ts',
      'src/features/admin/hooks/useAdminOperations.ts',
      'src/features/admin/inventoryTypes.ts',
      'src/features/admin/operationsTypes.ts',
      'src/features/admin/components/InventoryPanel.tsx',
      'src/features/admin/components/OperationsPanel.tsx',
      'src/features/admin/components/CashPanel.tsx',
      'src/lib/stockSync.ts',
    ],
  },
{
    id: 'compras-bodega',
    name: 'Compras y bodega',
    patterns: [
      'src/features/admin/repositories/adminWarehousePurchasingRepository.ts',
      'src/features/admin/hooks/useWarehousePurchasing.ts',
      'src/features/admin/warehousePurchasingTypes.ts',
      'src/features/admin/components/WarehousePurchasingPanel.tsx',
    ],
  },
  { id: 'caja-ventas', name: 'Caja y ventas', patterns: ['src/features/cash-terminal/', 'apps/api/src/cash/'] },
  {
    id: 'reportes',
    name: 'Reportes (superadmin)',
    patterns: [
      'src/features/admin/repositories/adminReportsRepository.ts',
      'src/features/admin/hooks/useAdminReports.ts',
      'src/features/admin/reportsTypes.ts',
      'src/features/admin/components/ReportsPanel.tsx',
    ],
  },
  { id: 'tracking', name: 'Tracking y pantallas', patterns: ['src/features/tracking/'] },
  { id: 'recibos', name: 'Recibos e impresión', patterns: ['src/features/receipt/'] },
  {
    id: 'integraciones',
    name: 'Integraciones externas',
    patterns: [
      'src/features/integrations/',
      'src/features/admin/repositories/adminIntegrationRepository.ts',
      'src/features/admin/hooks/useAdminIntegrations.ts',
      'src/features/admin/components/IntegrationsPanel.tsx',
    ],
  },
  { id: 'api-core', name: 'API NestJS (núcleo)', patterns: ['apps/api/src/'] },
  {
    id: 'shared-infra',
    name: 'Infra compartida (lib/services/app/components/admin shell)',
    patterns: [
      'src/lib/',
      'src/services/',
      'src/app/',
      'src/components/',
      'src/features/admin/AdminApp.tsx',
      'src/features/admin/types.ts',
      'src/features/admin/repositories/adminMockRepository.ts',
      'src/features/integrations/didiFood/',
    ],
  },
]

// Specs E2E (BDD) por proceso.
const SPECS_BY_PROCESS = {
  'public-menu.spec.ts': 'menu-publico',
  'whatsapp.spec.ts': 'pedido-whatsapp',
  'admin.spec.ts': 'admin-auth',
  'admin-auth.spec.ts': 'admin-auth',
  'admin-menu.spec.ts': 'admin-menu',
  'admin-orders.spec.ts': 'admin-pedidos',
  'admin-operations.spec.ts': 'operaciones',
  'admin-integrations.spec.ts': 'integraciones',
  'reports.spec.ts': 'reportes',
  'cash-terminal.spec.ts': 'caja-ventas',
  'tracking-display.spec.ts': 'tracking',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeRel(filePath) {
  return relative(root, filePath).split(sep).join('/')
}

function toPosix(value) {
  return String(value).replace(/\\/g, '/')
}

function matchProcess(rel) {
  const p = toPosix(rel)
  for (const process of PROCESSES) {
    for (const pattern of process.patterns) {
      if (pattern.endsWith('/') && p.startsWith(pattern)) return process.id
      const withoutExt = pattern.replace(/\.(ts|tsx)$/, '')
      if (p === pattern || p === withoutExt) return process.id
    }
  }
  return 'shared-infra'
}

function pct(covered, total) {
  return total > 0 ? Math.round((covered / total) * 1000) / 10 : null
}

function readJson(file) {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Lectura de cobertura TDD (istanbul / v8)
// ---------------------------------------------------------------------------
function computeMetrics(metrics) {
  const statementMap = metrics.statementMap ?? {}
  const s = metrics.s ?? {}
  const lineTotal = new Set()
  const lineHit = new Set()

  for (const [key, entry] of Object.entries(statementMap)) {
    const line = entry?.start?.line
    if (line == null) continue
    lineTotal.add(line)
    if ((s[key] ?? 0) > 0) lineHit.add(line)
  }

  const fnMap = metrics.fnMap ?? {}
  const f = metrics.f ?? {}
  const branchMap = metrics.branchMap ?? {}
  const b = metrics.b ?? {}

  return {
    lines: { total: lineTotal.size, covered: lineHit.size },
    funcs: {
      total: Object.keys(fnMap).length,
      covered: Object.entries(fnMap).filter(([key]) => (f[key] ?? 0) > 0).length,
    },
    stmts: {
      total: Object.keys(statementMap).length,
      covered: Object.entries(statementMap).filter(([key]) => (s[key] ?? 0) > 0).length,
    },
    branches: {
      total: Object.keys(branchMap).length,
      covered: Object.entries(branchMap).filter(([key]) => (b[key] ?? []).some((value) => (value ?? 0) > 0)).length,
    },
  }
}

function readUnitCoverage() {
  const raw = readJson(join(root, 'coverage', 'unit', 'coverage-final.json'))
  if (!raw) return { byFile: {}, available: false }
  const byFile = {}
  for (const [absPath, metrics] of Object.entries(raw)) {
    let rel = absPath
    try {
      rel = relative(root, absPath)
    } catch {
      rel = absPath
    }
    const key = rel.split(sep).join('/')
    if (!key.startsWith('src/') && !key.startsWith('apps/')) continue
    byFile[key] = computeMetrics(metrics)
  }
  return { byFile, available: true }
}

// Lectura de cobertura BDD (funciones por archivo, scripts/coverage-e2e-convert.mjs)
function readE2eCoverage() {
  const raw = readJson(join(root, 'coverage', 'e2e', 'coverage-final.json'))
  return raw ? { byFile: raw, available: true } : { byFile: {}, available: false }
}

// Tests unitarios (TDD) por proceso: resuelve los imports de cada test file.
function listUnitTestFiles() {
  const dir = join(root, 'tests', 'unit')
  if (!existsSync(dir)) return []
  const out = []
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      const isDir = statSync(full).isDirectory()
      if (isDir) walk(full)
      else if (entry.endsWith('.test.ts')) out.push(full)
    }
  }
  walk(dir)
  return out
}

function unitTestsByProcess() {
  const testsByProcess = Object.fromEntries(PROCESSES.map((p) => [p.id, new Set()]))
  for (const testFile of listUnitTestFiles()) {
    const content = readFileSync(testFile, 'utf8')
    const importPattern = /from\s+['"]([^'"]+)['"]/g
    const matches = []
    let match
    while ((match = importPattern.exec(content)) !== null) {
      const spec = match[1]
      if (!spec.startsWith('.')) continue
      try {
        matches.push(matchProcess(normalizeRel(resolve(dirname(testFile), spec))))
      } catch {
        // import irresoluble: ignorar
      }
    }
    const bucket = matches.find((processId) => processId !== 'shared-infra') ?? matches[0] ?? 'shared-infra'
    testsByProcess[bucket].add(normalizeRel(testFile))
  }
  return Object.fromEntries(Object.entries(testsByProcess).map(([id, set]) => [id, [...set].sort()]))
}

// Escenarios BDD por proceso.
function countTestsIn(file) {
  if (!existsSync(file)) return 0
  return (readFileSync(file, 'utf8').match(/\btest\(/g) ?? []).length
}

function bddByProcess() {
  const counts = Object.fromEntries(PROCESSES.map((p) => [p.id, { specs: 0, scenarios: 0 }]))
  const dirs = [join(root, 'tests', 'e2e'), join(root, 'tests', 'e2e-admin')]
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir)) {
      const processId = SPECS_BY_PROCESS[entry]
      if (!processId) continue
      counts[processId].specs += 1
      counts[processId].scenarios += countTestsIn(join(dir, entry))
    }
  }
  return counts
}

// ---------------------------------------------------------------------------
// Agregación por proceso
// ---------------------------------------------------------------------------
function buildRows() {
  const unit = readUnitCoverage()
  const e2e = readE2eCoverage()
  const unitTests = unitTestsByProcess()
  const bdd = bddByProcess()

  const rows = PROCESSES.map((process) => {
    const files = new Set([...Object.keys(unit.byFile), ...Object.keys(e2e.byFile)])
    const state = {
      id: process.id,
      name: process.name,
      files: 0,
      linesTotal: 0,
      linesCovered: 0,
      funcsE2eTotal: 0,
      funcsE2eCovered: 0,
      filesCoveredByUnit: 0,
      filesWithE2e: 0,
      unitTests: unitTests[process.id] ?? [],
      bdd: bdd[process.id] ?? { specs: 0, scenarios: 0 },
    }

    for (const rel of files) {
      if (matchProcess(rel) !== process.id) continue
      state.files += 1

      const unitMetrics = unit.byFile[rel]
      if (unitMetrics) {
        state.linesTotal += unitMetrics.lines.total ?? 0
        state.linesCovered += unitMetrics.lines.covered ?? 0
        if ((unitMetrics.lines.total ?? 0) > 0) state.filesCoveredByUnit += 1
      }

      const e2eMetrics = e2e.byFile[rel]
      if (e2eMetrics) {
        state.funcsE2eTotal += e2eMetrics.funcsTotal ?? 0
        state.funcsE2eCovered += e2eMetrics.funcsCovered ?? 0
        if ((e2eMetrics.funcsTotal ?? 0) > 0) state.filesWithE2e += 1
      }
    }

    return state
  })

  return { rows, unitAvailable: unit.available, e2eAvailable: e2e.available }
}

function coverageStatus(row) {
  const linePct = pct(row.linesCovered, row.linesTotal)
  if (linePct == null || row.linesTotal === 0) return 'sin datos de cobertura'
  if (linePct >= 60) return 'cubierto'
  if (linePct >= 30) return 'parcial'
  return 'critico'
}

function fmtPct(value) {
  return value == null ? '—' : `${value}%`
}

// ---------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------
function main() {
  const { rows, unitAvailable, e2eAvailable } = buildRows()
  const sorted = [...rows].sort((a, b) => {
    const aPct = pct(a.linesCovered, a.linesTotal) ?? -1
    const bPct = pct(b.linesCovered, b.linesTotal) ?? -1
    return aPct - bPct
  })

  console.log('')
  console.log('Cobertura por proceso de CartaMago (TDD + BDD)')
  console.log('='.repeat(86))
  console.log('proceso          | %TDD lint | TDD tst | BDD sp/sc | func %BDD | estado')
  console.log('-'.repeat(86))
  for (const row of sorted) {
    const linePct = pct(row.linesCovered, row.linesTotal)
    const e2ePct = pct(row.funcsE2eCovered, row.funcsE2eTotal)
    const line = [
      row.id.padEnd(16),
      String(fmtPct(linePct)).padStart(9),
      String(row.unitTests.length).padStart(8),
      `${row.bdd.specs}/${row.bdd.scenarios}`.padStart(9),
      String(fmtPct(e2ePct)).padStart(10),
      ` ${coverageStatus(row)}`,
    ].join('|')
    console.log(line)
  }
  console.log('-'.repeat(86))
  console.log(`TDD (unit) disponible: ${unitAvailable} | BDD (e2e) disponible: ${e2eAvailable}`)

  // ----------------------------------------------------------------------
  // Documento markdown
  // ----------------------------------------------------------------------
  const lines = []
  const now = new Date().toISOString()
  lines.push('# Cobertura por Proceso (TDD + BDD)')
  lines.push('')
  lines.push(`Generado automáticamente el ${now} — no editar a mano.`)
  lines.push('')
  lines.push('## Cómo se mide')
  lines.push('')
  lines.push('- **TDD (unit)**: cobertura de líneas por archivo mediante `@vitest/coverage-v8` (`npm run test:coverage`).')
  lines.push('- **BDD (e2e)**: cobertura de funciones ejecutadas en escenarios Playwright (`page.coverage` en Chromium), capturada por los specs y convertida con `npm run coverage:e2e:convert`.')
  lines.push('- **Proceso**: cada archivo de `src/` o `apps/api/src/` se asigna a un único proceso de negocio (ver mapa en `scripts/coverage-report.mjs`).')
  lines.push('')
  lines.push('## Comandos')
  lines.push('')
  lines.push('```text')
  lines.push('npm run test:coverage          # TDD: vitest + coverage v8 -> coverage/unit')
  lines.push('npm run test:e2e               # BDD público (captura coverage en Chromium)')
  lines.push('npm run test:e2e:admin         # BDD admin (captura coverage en Chromium)')
  lines.push('npm run coverage:e2e:convert   # convierte capturas -> coverage/e2e/coverage-final.json')
  lines.push('npm run coverage:report        # genera docs/coverage-by-process.md')
  lines.push('npm run test:coverage:all      # todo el pipeline en un comando')
  lines.push('```')
  lines.push('')
  lines.push('## Resumen por proceso')
  lines.push('')
  lines.push('| Proceso | Archivos | Líneas TDD | % TDD | Funciones BDD | % BDD | Tests unit | Specs/scenarios BDD | Estado |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const row of rows) {
    const linePct = fmtPct(pct(row.linesCovered, row.linesTotal))
    const e2ePct = fmtPct(pct(row.funcsE2eCovered, row.funcsE2eTotal))
    lines.push(
      `| ${row.name} | ${row.files} | ${row.linesCovered}/${row.linesTotal} | ${linePct} | ${row.funcsE2eCovered}/${row.funcsE2eTotal} | ${e2ePct} | ${row.unitTests.length} | ${row.bdd.specs}/${row.bdd.scenarios} | ${coverageStatus(row)} |`,
    )
  }
  lines.push('')
  lines.push('## Detalle por proceso')
  lines.push('')
  for (const row of sorted) {
    lines.push(`### ${row.name} (\`${row.id}\`)`)
    lines.push('')
    lines.push(`- Estado: ${coverageStatus(row)}`)
    lines.push(`- Líneas TDD: ${row.linesCovered}/${row.linesTotal} (${fmtPct(pct(row.linesCovered, row.linesTotal))})`)
    lines.push(`- Funciones BDD: ${row.funcsE2eCovered}/${row.funcsE2eTotal} (${fmtPct(pct(row.funcsE2eCovered, row.funcsE2eTotal))})`)
    lines.push(`- Tests unit: ${row.unitTests.length > 0 ? row.unitTests.map((t) => `\`${t}\``).join(', ') : 'ninguno directo'}`)
    lines.push(`- BDD: ${row.bdd.specs} spec(s), ${row.bdd.scenarios} escenario(s)`)
    lines.push('')
    lines.push('_Detalle por archivo: consultar `coverage/unit/` (HTML) y `coverage/e2e/` (JSON)._')
    lines.push('')
  }
  lines.push('## Prioridades sugeridas (menor cobertura TDD primero)')
  lines.push('')
  for (const row of sorted) {
    lines.push(
      `1. **${row.name}** — ${fmtPct(pct(row.linesCovered, row.linesTotal))} líneas TDD, ${fmtPct(pct(row.funcsE2eCovered, row.funcsE2eTotal))} funciones BDD`,
    )
  }
  lines.push('')

  writeFileSync(join(root, 'docs', 'coverage-by-process.md'), lines.join('\n'))
  console.log('')
  console.log('Reporte escrito en docs/coverage-by-process.md')
}

main()