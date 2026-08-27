import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { getSupabaseClient } from '../../../services/menuRepository'
import { fetchMockBrandReports } from './adminMockRepository'
import type { BrandReports } from '../reportsTypes'

type ReportRow = {
  branch_count?: number
  total_orders?: number
  total_delivered_cop?: number
  sales_count?: number
  sales_total_cop?: number
  open_cash_sessions?: number
  branch_sales?: Array<{ branch_id: string; branch_name: string; sales_count: number; sales_total_cop: number }>
  orders_by_status?: Array<{ status: string; count: number }>
  critical_stock_count?: number
  purchases_total?: number
  dispatches_open?: number
  generated_at?: string
  error?: string
}

function mapRow(row: unknown): BrandReports {
  if (!row || typeof row !== 'object') throw new Error('Respuesta de reportes vacia.')
  const source = (
    (row as Record<string, unknown>).report_brand_overview as ReportRow | undefined
  ) ?? (row as unknown as ReportRow)

  if (source.error === 'forbidden') {
    throw new Error('Sin permisos para consultar reportes de esta marca.')
  }

  return {
    branchCount: Number(source.branch_count ?? 0),
    totalOrders: Number(source.total_orders ?? 0),
    totalDeliveredCop: Number(source.total_delivered_cop ?? 0),
    salesCount: Number(source.sales_count ?? 0),
    salesTotalCop: Number(source.sales_total_cop ?? 0),
    openCashSessions: Number(source.open_cash_sessions ?? 0),
    branchSales: (source.branch_sales ?? []).map((entry) => ({
      branchId: entry.branch_id,
      branchName: entry.branch_name,
      salesCount: Number(entry.sales_count),
      salesTotalCop: Number(entry.sales_total_cop),
    })),
    ordersByStatus: (source.orders_by_status ?? []).map((entry) => ({
      status: entry.status,
      count: Number(entry.count),
    })),
    criticalStockCount: Number(source.critical_stock_count ?? 0),
    purchasesTotal: Number(source.purchases_total ?? 0),
    dispatchesOpen: Number(source.dispatches_open ?? 0),
    generatedAt: source.generated_at ?? new Date().toISOString(),
  }
}

export async function fetchBrandReports(): Promise<BrandReports> {
  if (isE2EAdminMockEnabled()) return fetchMockBrandReports()

  const { data, error } = await getSupabaseClient().rpc('report_brand_overview')
  if (error) throw new Error(error.message)

  const first = Array.isArray(data) ? data[0] : data
  return mapRow(first)
}
