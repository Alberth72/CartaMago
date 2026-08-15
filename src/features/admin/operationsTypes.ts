export type OperationsWarehouse = {
  id: string
  name: string
}

export type OperationsBranch = {
  id: string
  name: string
  warehouseId: string | null
}

export type OperationsItem = {
  id: string
  name: string
  unit: string
  category: string
}

export type OperationsStock = {
  id: string
  itemId: string
  warehouseId?: string
  branchId?: string
  quantity: number
}

export type OperationsProduct = {
  id: string
  branchId: string
  name: string
}

export type DispatchRequestStatus = 'pending' | 'approved' | 'dispatched' | 'received' | 'rejected'
export type DispatchStatus = 'preparing' | 'shipped' | 'received' | 'cancelled'
export type OperationsRole = 'superadmin' | 'warehouse_admin' | 'branch_admin' | 'cashier'

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
}

export type CreateDispatchRequestInput = {
  branchId: string
  warehouseId: string
  itemId: string
  quantity: number
  notes: string
}
