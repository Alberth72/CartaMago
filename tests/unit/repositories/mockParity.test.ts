import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import { fetchMockOrders, fetchMockBrandReports } from '../../../src/features/admin/repositories/adminMockRepository'
import { fetchOrders } from '../../../src/features/admin/repositories/adminOrderRepository'
import { fetchBrandReports } from '../../../src/features/admin/repositories/adminReportsRepository'

function keysOf(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  return Object.keys(value as Record<string, unknown>).sort()
}

function builder(result: () => { data: unknown; error: unknown }) {
  const target: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'in', 'limit', 'single', 'update', 'insert', 'upsert']
  for (const method of methods) target[method] = () => target
  ;(target as { then: unknown }).then = (resolve: (value: unknown) => void) => {
    resolve(result())
    return undefined
  }
  return target
}

function makeOrderClient(orderRows: unknown[], itemRows: unknown[]) {
  return {
    from: (table: string) =>
      table === 'orders'
        ? builder(() => ({ data: orderRows, error: null }))
        : builder(() => ({ data: itemRows, error: null })),
    rpc: () => ({ data: null, error: null }),
    auth: {},
  }
}

// El mock es la fuente canonica del contrato; el repo real con la misma data debe
// devolver exactamente las mismas claves. Si el repo real deja caer un campo o el
// mock se queda atras al agregar uno nuevo, este test lo detecta.
describe('paridad mock vs repositorios reales', () => {
  it('fetchOrders: misma estructura de claves entre repo real y mock', async () => {
    const mockOrders = await fetchMockOrders()
    expect(mockOrders.length).toBeGreaterThan(0)

    const canonicalOrder = { ...mockOrders[0] } as Record<string, unknown>
    delete canonicalOrder.items
    const canonicalItems = (mockOrders[0] as { items: unknown[] }).items

    h.client = makeOrderClient([canonicalOrder], canonicalItems)
    const real = await fetchOrders('brasas-sazon')

    expect(real.length).toBe(1)
    expect(keysOf(real[0])).toEqual(keysOf(mockOrders[0]))
    expect(keysOf(real[0].items[0])).toEqual(keysOf(canonicalItems[0]))
  })

  it('fetchBrandReports: misma estructura de claves entre repo real y mock', async () => {
    const mock = await fetchMockBrandReports()

    h.client = {
      rpc: () => ({
        data: [
          {
            report_brand_overview: {
              branch_count: mock.branchCount,
              total_orders: mock.totalOrders,
              total_delivered_cop: mock.totalDeliveredCop,
              sales_count: mock.salesCount,
              sales_total_cop: mock.salesTotalCop,
              public_orders_count: mock.publicOrdersCount,
              public_orders_total_cop: mock.publicOrdersTotalCop,
              revenue_total_cop: mock.revenueTotalCop,
              open_cash_sessions: mock.openCashSessions,
              branch_sales: mock.branchSales.map((entry) => ({
                branch_id: entry.branchId,
                branch_name: entry.branchName,
                sales_count: entry.salesCount,
                sales_total_cop: entry.salesTotalCop,
                public_orders_count: entry.publicOrdersCount,
                public_orders_total_cop: entry.publicOrdersTotalCop,
                revenue_total_cop: entry.revenueTotalCop,
              })),
              orders_by_status: mock.ordersByStatus,
              critical_stock_count: mock.criticalStockCount,
              purchases_total: mock.purchasesTotal,
              dispatches_open: mock.dispatchesOpen,
              generated_at: mock.generatedAt,
            },
          },
        ],
        error: null,
      }),
    }

    const real = await fetchBrandReports()

    expect(keysOf(real)).toEqual(keysOf(mock))
  })
})
