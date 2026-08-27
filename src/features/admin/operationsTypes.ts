import type { InventoryItem, InventoryStock } from './inventoryTypes'

export type OperationsWarehouse = {
  id: string
  name: string
}

export type OperationsBranch = {
  id: string
  name: string
  warehouseId: string | null
}

// Insumo maestro (fuente unica en inventoryTypes).
export type OperationsItem = InventoryItem

// Stock de bodega o sede: base de inventoryTypes + scope opcional.
export type OperationsStock = InventoryStock & {
  warehouseId?: string
  branchId?: string
}

export type OperationsProduct = {
  id: string
  branchId: string
  name: string
  priceCop: number | null
}

export type DispatchRequestStatus = 'pending' | 'approved' | 'dispatched' | 'received' | 'rejected'
export type DispatchStatus = 'preparing' | 'shipped' | 'received' | 'cancelled'
export type OperationsRole = 'superadmin' | 'warehouse_admin' | 'branch_admin' | 'cashier'
export type SalePaymentMethod = 'cash' | 'card_at_counter' | 'card_at_table' | 'bank_transfer' | 'wompi' | 'didi_food'
export type SalePaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

export type OperationsProfile = {
  userId: string
  email: string
  role: OperationsRole
  branchIds: string[]
  warehouseIds: string[]
  primaryBranchId: string | null
  primaryWarehouseId: string | null
  canManageWarehouse: boolean
}

export type DispatchRequestItem = {
  id: string
  itemId: string
  quantity: number
}

export type DispatchRequest = {
  id: string
  branchId: string
  warehouseId: string
  status: DispatchRequestStatus
  notes: string | null
  createdAt: string
  items: DispatchRequestItem[]
}

export type Dispatch = {
  id: string
  branchId: string
  warehouseId: string
  dispatchRequestId: string | null
  status: DispatchStatus
  createdAt: string
}

export type CashSession = {
  id: string
  branchId: string
  name: string
  accessToken: string | null
  status: 'open' | 'closed'
  openingCashCop: number
  closingCashCop: number | null
  expectedCashCop: number | null
  openedAt: string
  closedAt: string | null
}

export type SaleSummary = {
  id: string
  branchId: string
  cashSessionId: string | null
  receiptNumber: string
  totalCop: number
  paymentMethod: SalePaymentMethod
  paymentStatus: SalePaymentStatus
  soldAt: string
  itemNames: string[]
}

export type OperationsData = {
  profile: OperationsProfile
  warehouses: OperationsWarehouse[]
  branches: OperationsBranch[]
  items: OperationsItem[]
  warehouseStock: OperationsStock[]
  branchStock: OperationsStock[]
  products: OperationsProduct[]
  requests: DispatchRequest[]
  dispatches: Dispatch[]
  cashSessions: CashSession[]
  sales: SaleSummary[]
}

export type CreateDispatchRequestInput = {
  branchId: string
  warehouseId: string
  itemId: string
  quantity: number
  notes: string
}

export type SaleCartItemInput = {
  productId: string
  quantity: number
}

export type CreateSaleInput = {
  branchId: string
  items: SaleCartItemInput[]
  paymentMethod: SalePaymentMethod
  paymentReference: string
  cashSessionId?: string | null
}

export type OpenCashSessionInput = {
  branchId: string
  name: string
  openingCashCop: number
  notes: string
}

export type CloseCashSessionInput = {
  cashSessionId: string
  closingCashCop: number
  notes: string
}
