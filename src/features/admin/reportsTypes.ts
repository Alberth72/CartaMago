export type ReportOrdersByStatus = {
  status: string
  count: number
}

export type ReportBranchSales = {
  branchId: string
  branchName: string
  salesCount: number
  salesTotalCop: number
}

export type BrandReports = {
  branchCount: number
  totalOrders: number
  totalDeliveredCop: number
  salesCount: number
  salesTotalCop: number
  openCashSessions: number
  branchSales: ReportBranchSales[]
  ordersByStatus: ReportOrdersByStatus[]
  criticalStockCount: number
  purchasesTotal: number
  dispatchesOpen: number
  generatedAt: string
}
