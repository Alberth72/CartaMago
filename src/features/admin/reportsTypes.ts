export type ReportOrdersByStatus = {
  status: string
  count: number
}

export type BrandReports = {
  branchCount: number
  totalOrders: number
  totalDeliveredCop: number
  ordersByStatus: ReportOrdersByStatus[]
  criticalStockCount: number
  purchasesTotal: number
  dispatchesOpen: number
  generatedAt: string
}