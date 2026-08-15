import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { getSupabaseClient } from '../../../services/menuRepository'
import type {
  CreatePurchaseOrderInput,
  CreateAndLinkSupplierItemInput,
  CreateSupplierInput,
  LinkSupplierItemInput,
  PurchaseOrder,
  WarehousePurchaseStatus,
  WarehousePurchasingData,
} from '../warehousePurchasingTypes'
import { fetchAdminScope } from './adminScopeRepository'

function slugId(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function mapPurchaseOrder(row: Record<string, unknown>): PurchaseOrder {
  const items = Array.isArray(row.purchase_order_items) ? row.purchase_order_items : []

  return {
    id: String(row.id),
    warehouseId: String(row.warehouse_id),
    supplierId: typeof row.supplier_id === 'string' ? row.supplier_id : null,
    status: String(row.status) as WarehousePurchaseStatus,
    totalCost: Number(row.total_cost ?? 0),
    notes: typeof row.notes === 'string' ? row.notes : null,
    createdAt: String(row.created_at),
    items: items.map((item) => {
      const entry = item as Record<string, unknown>
      return {
        id: String(entry.id),
        itemId: String(entry.item_id),
        quantity: Number(entry.quantity),
        unitCost: Number(entry.unit_cost ?? 0),
      }
    }),
  }
}

export async function fetchWarehousePurchasing(): Promise<WarehousePurchasingData> {
  const profile = await fetchAdminScope()

  if (!profile.canManageWarehouse) {
    throw new Error('Este usuario no tiene permisos de bodega.')
  }

  const supabase = getSupabaseClient()
  const [
    warehousesResult,
    suppliersResult,
    supplierItemsResult,
    itemsResult,
    stockResult,
    purchaseOrdersResult,
  ] = await Promise.all([
    supabase.from('warehouses').select('id,brand_id,name').order('name', { ascending: true }),
    supabase.from('suppliers').select('*').eq('active', true).order('name', { ascending: true }),
    supabase.from('supplier_items').select('*').eq('active', true),
    supabase.from('inventory_items').select('id,name,unit,category').order('name', { ascending: true }),
    supabase.from('warehouse_stock').select('id,warehouse_id,item_id,quantity'),
    supabase
      .from('purchase_orders')
      .select('*,purchase_order_items(*)')
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const error =
    warehousesResult.error ??
    suppliersResult.error ??
    supplierItemsResult.error ??
    itemsResult.error ??
    stockResult.error ??
    purchaseOrdersResult.error

  if (error) throw new Error(error.message)

  const visibleWarehouseIds = profile.warehouseIds
  const warehouses = (warehousesResult.data ?? [])
    .filter((row) => visibleWarehouseIds.length === 0 || visibleWarehouseIds.includes(row.id))
    .map((row) => ({ id: row.id, brandId: row.brand_id, name: row.name }))
  const brandIds = [...new Set(warehouses.map((warehouse) => warehouse.brandId))]
  const suppliers = (suppliersResult.data ?? [])
    .filter((row) => brandIds.length === 0 || brandIds.includes(row.brand_id))
    .map((row) => ({
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      contactName: row.contact_name,
      phone: row.phone,
      taxId: row.tax_id,
      terms: row.terms,
      active: Boolean(row.active),
    }))
  const supplierIds = new Set(suppliers.map((supplier) => supplier.id))

  return {
    profile,
    warehouses,
    suppliers,
    supplierItems: (supplierItemsResult.data ?? [])
      .filter((row) => supplierIds.has(row.supplier_id))
      .map((row) => ({
        id: row.id,
        supplierId: row.supplier_id,
        itemId: row.item_id,
        unitCost: Number(row.unit_cost ?? 0),
        leadTimeDays: Number(row.lead_time_days ?? 1),
        active: Boolean(row.active),
      })),
    items: (itemsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      category: row.category,
    })),
    stock: (stockResult.data ?? [])
      .filter((row) => visibleWarehouseIds.length === 0 || visibleWarehouseIds.includes(row.warehouse_id))
      .map((row) => ({
        id: row.id,
        warehouseId: row.warehouse_id,
        itemId: row.item_id,
        quantity: Number(row.quantity),
      })),
    purchaseOrders: ((purchaseOrdersResult.data ?? []) as Array<Record<string, unknown>>)
      .map(mapPurchaseOrder)
      .filter((order) => visibleWarehouseIds.length === 0 || visibleWarehouseIds.includes(order.warehouseId)),
  }
}

export async function createWarehousePurchaseOrder(input: CreatePurchaseOrderInput) {
  if (isE2EAdminMockEnabled()) return `po_mock_${Date.now()}`

  const { data, error } = await getSupabaseClient().rpc('create_purchase_order', {
    p_warehouse_id: input.warehouseId,
    p_supplier_id: input.supplierId,
    p_items: [{ item_id: input.itemId, quantity: input.quantity, unit_cost: input.unitCost }],
    p_notes: input.notes,
  })

  if (error) throw new Error(error.message)
  return String(data)
}

export async function receiveWarehousePurchaseOrder(orderId: string) {
  if (isE2EAdminMockEnabled()) return

  const { error } = await getSupabaseClient().rpc('receive_purchase_order', {
    p_purchase_order_id: orderId,
  })

  if (error) throw new Error(error.message)
}

export async function createWarehouseSupplier(input: CreateSupplierInput) {
  if (isE2EAdminMockEnabled()) return `sup_mock_${Date.now()}`

  const data = await fetchWarehousePurchasing()
  const warehouse = data.warehouses.find((entry) => entry.id === input.warehouseId)
  if (!warehouse) throw new Error('Bodega no encontrada para crear proveedor.')

  const id = `sup_${slugId(input.name)}_${Date.now()}`
  const { error } = await getSupabaseClient().from('suppliers').insert({
    id,
    brand_id: warehouse.brandId,
    name: input.name.trim(),
    contact_name: input.contactName.trim() || null,
    phone: input.phone.trim() || null,
    terms: input.terms.trim() || null,
    active: true,
  })

  if (error) throw new Error(error.message)
  return id
}

export async function linkWarehouseSupplierItem(input: LinkSupplierItemInput) {
  if (isE2EAdminMockEnabled()) return `supi_mock_${Date.now()}`

  const id = `supi_${input.supplierId}_${input.itemId}`
  const { error } = await getSupabaseClient().from('supplier_items').upsert({
    id,
    supplier_id: input.supplierId,
    item_id: input.itemId,
    unit_cost: input.unitCost,
    lead_time_days: input.leadTimeDays,
    active: true,
  }, { onConflict: 'supplier_id,item_id' })

  if (error) throw new Error(error.message)
  return id
}

export async function createAndLinkWarehouseSupplierItem(input: CreateAndLinkSupplierItemInput) {
  if (isE2EAdminMockEnabled()) return `item_mock_${Date.now()}`

  const { data, error } = await getSupabaseClient().rpc('create_inventory_item_for_warehouse', {
    p_warehouse_id: input.warehouseId,
    p_name: input.name,
    p_unit: input.unit,
    p_category: input.category,
  })

  if (error) throw new Error(error.message)

  const itemId = String(data)
  await linkWarehouseSupplierItem({
    supplierId: input.supplierId,
    itemId,
    unitCost: input.unitCost,
    leadTimeDays: input.leadTimeDays,
  })

  return itemId
}
