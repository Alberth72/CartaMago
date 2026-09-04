import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import { fetchBrandReports } from '../../../src/features/admin/repositories/adminReportsRepository'

function makeRpcClient(rpc: ReturnType<typeof vi.fn>) {
  return { rpc }
}

const overview = {
  branch_count: 2,
  total_orders: 8,
  total_delivered_cop: 182000,
  sales_count: 3,
  sales_total_cop: 156000,
  public_orders_count: 5,
  public_orders_total_cop: 182000,
  revenue_total_cop: 338000,
  open_cash_sessions: 1,
  branch_sales: [
    {
      branch_id: 'brasas-sazon',
      branch_name: 'Brasas & Sazon Principal',
      sales_count: 2,
      sales_total_cop: 104000,
      public_orders_count: 3,
      public_orders_total_cop: 104000,
      revenue_total_cop: 208000,
    },
  ],
  orders_by_status: [
    { status: 'pending', count: 1 },
    { status: 'delivered', count: 3 },
  ],
  critical_stock_count: 3,
  purchases_total: 1250000,
  dispatches_open: 2,
  generated_at: new Date().toISOString(),
}

beforeEach(() => {
  h.client = makeRpcClient(vi.fn().mockResolvedValue({ data: null, error: null }))
})

describe('fetchBrandReports', () => {
  it('calls the overview RPC and maps the row to BrandReports', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ report_brand_overview: overview }], error: null })
    h.client = makeRpcClient(rpc)

    const report = await fetchBrandReports()

    expect(rpc).toHaveBeenCalledWith('report_brand_overview')
    expect(report.branchCount).toBe(2)
    expect(report.totalOrders).toBe(8)
    expect(report.totalDeliveredCop).toBe(182000)
    expect(report.salesTotalCop).toBe(156000)
    expect(report.publicOrdersTotalCop).toBe(182000)
    expect(report.revenueTotalCop).toBe(338000)
    expect(report.branchSales).toHaveLength(1)
    expect(report.branchSales[0].publicOrdersCount).toBe(3)
    expect(report.ordersByStatus).toHaveLength(2)
    expect(report.criticalStockCount).toBe(3)
  })

  it('handles a scalar response', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: overview, error: null })
    h.client = makeRpcClient(rpc)

    await expect(fetchBrandReports()).resolves.toMatchObject({ branchCount: 2 })
  })

  it('throws when the scope is forbidden', async () => {
    h.client = makeRpcClient(vi.fn().mockResolvedValue({ data: [{ report_brand_overview: { error: 'forbidden' } }], error: null }))

    await expect(fetchBrandReports()).rejects.toThrow(/permisos/i)
  })

  it('throws when the RPC returns an error', async () => {
    h.client = makeRpcClient(vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }))

    await expect(fetchBrandReports()).rejects.toThrow('boom')
  })

  it('does not reference legacy restaurant_id in the report SQL or demo simulation', async () => {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/202608160001_reports_superadmin.sql')
    const publicSalesMigrationPath = path.resolve(
      __dirname,
      '../../../supabase/migrations/202608300001_public_order_sales_visibility.sql',
    )
    const simulationPath = path.resolve(__dirname, '../../../supabase/dev/production-orders-simulation.sql')

    const migrationSql = fs.readFileSync(migrationPath, 'utf8')
    const publicSalesMigrationSql = fs.readFileSync(publicSalesMigrationPath, 'utf8')
    const simulationSql = fs.readFileSync(simulationPath, 'utf8')

    expect(migrationSql).not.toContain('o.restaurant_id')
    expect(migrationSql).not.toContain('coalesce(o.branch_id, o.restaurant_id)')
    expect(publicSalesMigrationSql).toContain('create or replace function public.confirm_order_payment')
    expect(publicSalesMigrationSql).toContain("and coalesce(s.source, 'admin_pos') <> 'qr_order'")
    expect(publicSalesMigrationSql).toContain("and s.source = 'qr_order'")
    expect(simulationSql).not.toContain('restaurant_id,\n  status')
    expect(simulationSql).toContain('branch_id,\n  status')
  })
})
