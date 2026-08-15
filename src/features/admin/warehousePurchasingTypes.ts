import type { OperationsItem, OperationsProfile, OperationsStock } from './operationsTypes'

export type WarehousePurchaseStatus = 'draft' | 'sent' | 'received' | 'paid' | 'cancelled'

export type PurchasingWarehouse = {
  id: string
  brandId: string
  name: string
}

export type Supplier = {
  id: string
  brandId: string
  name: string
  contactName: string | null
  phone: string | null
  taxId: string | null
  terms: string | null
  active: boolean
}

export type PurchaseOrderItem = {
  id: string
  itemId: string
  quantity: number
  unitCost: number
}

export type PurchaseOrder = {
  id: string
  warehouseId: string
  supplierId: string | null
  status: WarehousePurchaseStatus
  totalCost: number
  notes: string | null
  createdAt: string
  items: PurchaseOrderItem[]
}

export type WarehousePurchasingData = {
  profile: OperationsProfile
  warehouses: PurchasingWarehouse[]
  suppliers: Supplier[]
  items: OperationsItem[]
  stock: OperationsStock[]
  purchaseOrders: PurchaseOrder[]
}

export type CreatePurchaseOrderInput = {
  warehouseId: string
  supplierId: string
  itemId: string
  quantity: number
  unitCost: number
  notes: string
}

export type CreateSupplierInput = {
  warehouseId: string
  name: string
  contactName: string
  phone: string
  terms: string
}
