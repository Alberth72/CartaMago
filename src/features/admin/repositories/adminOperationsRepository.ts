import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { getSupabaseClient } from '../../../services/menuRepository'
import type {
  CreateDispatchRequestInput,
  Dispatch,
  DispatchRequest,
  DispatchRequestStatus,
  DispatchStatus,
  OperationsData,
} from '../operationsTypes'

const now = Date.now()

let mockData: OperationsData = {
  warehouses: [{ id: 'brasas-central', name: 'Bodega Central Brasas' }],
  branches: [
    { id: 'brasas-sazon', name: 'Brasas & Sazon Principal', warehouseId: 'brasas-central' },
    { id: 'brasas-sazon-norte', name: 'Brasas & Sazon Norte', warehouseId: 'brasas-central' },
  ],
  items: [
    { id: 'pollo-entero', name: 'Pollo entero', unit: 'unidad', category: 'Carnes' },
    { id: 'papa-criolla', name: 'Papa criolla', unit: 'kg', category: 'Verduras' },
    { id: 'arroz', name: 'Arroz', unit: 'kg', category: 'Granos' },
    { id: 'limon', name: 'Limon', unit: 'kg', category: 'Frutas' },
    { id: 'carbon', name: 'Carbon', unit: 'bolsa', category: 'Insumos' },
  ],
  warehouseStock: [
    { id: 'wstk_pollo', warehouseId: 'brasas-central', itemId: 'pollo-entero', quantity: 120 },
    { id: 'wstk_papa', warehouseId: 'brasas-central', itemId: 'papa-criolla', quantity: 180 },
    { id: 'wstk_arroz', warehouseId: 'brasas-central', itemId: 'arroz', quantity: 240 },
    { id: 'wstk_limon', warehouseId: 'brasas-central', itemId: 'limon', quantity: 90 },
    { id: 'wstk_carbon', warehouseId: 'brasas-central', itemId: 'carbon', quantity: 40 },
  ],
  branchStock: [
    { id: 'bstk_principal_pollo', branchId: 'brasas-sazon', itemId: 'pollo-entero', quantity: 28 },
    { id: 'bstk_principal_papa', branchId: 'brasas-sazon', itemId: 'papa-criolla', quantity: 45 },
    { id: 'bstk_principal_arroz', branchId: 'brasas-sazon', itemId: 'arroz', quantity: 70 },
    { id: 'bstk_norte_pollo', branchId: 'brasas-sazon-norte', itemId: 'pollo-entero', quantity: 12 },
    { id: 'bstk_norte_papa', branchId: 'brasas-sazon-norte', itemId: 'papa-criolla', quantity: 25 },
    { id: 'bstk_norte_arroz', branchId: 'brasas-sazon-norte', itemId: 'arroz', quantity: 32 },
  ],
  products: [
    { id: 'pollo-entero', branchId: 'brasas-sazon', name: '1 Pollo asado al carbon' },
    { id: 'pollo-entero-norte', branchId: 'brasas-sazon-norte', name: '1 Pollo asado al carbon' },
  ],
  requests: [
    {
      id: 'drq_demo_001',
      branchId: 'brasas-sazon-norte',
      warehouseId: 'brasas-central',
      status: 'pending',
      notes: 'Reponer para turno de la tarde',
      createdAt: new Date(now - 25 * 60_000).toISOString(),
      items: [{ id: 'dri_demo_001', itemId: 'pollo-entero', quantity: 10 }],
    },
  ],
  dispatches: [],
}

function cloneOperationsData(): OperationsData {
  return {
    warehouses: mockData.warehouses.map((warehouse) => ({ ...warehouse })),
    branches: mockData.branches.map((branch) => ({ ...branch })),
    items: mockData.items.map((item) => ({ ...item })),
    warehouseStock: mockData.warehouseStock.map((stock) => ({ ...stock })),
    branchStock: mockData.branchStock.map((stock) => ({ ...stock })),
    products: mockData.products.map((product) => ({ ...product })),
    requests: mockData.requests.map((request) => ({
      ...request,
      items: request.items.map((item) => ({ ...item })),
    })),
    dispatches: mockData.dispatches.map((dispatch) => ({ ...dispatch })),
  }
}

function mapDispatchRequest(row: Record<string, unknown>): DispatchRequest {
  const items = Array.isArray(row.dispatch_request_items) ? row.dispatch_request_items : []

  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    warehouseId: String(row.warehouse_id),
    status: String(row.status) as DispatchRequestStatus,
    notes: typeof row.notes === 'string' ? row.notes : null,
    createdAt: String(row.created_at),
    items: items.map((item) => {
      const entry = item as Record<string, unknown>
      return {
        id: String(entry.id),
        itemId: String(entry.item_id),
        quantity: Number(entry.quantity),
      }
    }),
  }
}

function mapDispatch(row: Record<string, unknown>): Dispatch {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    warehouseId: String(row.warehouse_id),
    dispatchRequestId: typeof row.dispatch_request_id === 'string' ? row.dispatch_request_id : null,
    status: String(row.status) as DispatchStatus,
    createdAt: String(row.created_at),
  }
}

export async function fetchAdminOperations(): Promise<OperationsData> {
  if (isE2EAdminMockEnabled()) {
    return cloneOperationsData()
  }

  const supabase = getSupabaseClient()
  const [
    warehousesResult,
    branchesResult,
    itemsResult,
    warehouseStockResult,
    branchStockResult,
    productsResult,
    requestsResult,
    dispatchesResult,
  ] = await Promise.all([
    supabase.from('warehouses').select('id,name').order('name', { ascending: true }),
    supabase.from('branches').select('id,name,warehouse_id').order('name', { ascending: true }),
    supabase.from('inventory_items').select('id,name,unit,category').order('name', { ascending: true }),
    supabase.from('warehouse_stock').select('id,warehouse_id,item_id,quantity'),
    supabase.from('branch_stock').select('id,branch_id,item_id,quantity'),
    supabase.from('products').select('id,branch_id,name').eq('available', true).order('name', { ascending: true }),
    supabase
      .from('dispatch_requests')
      .select('*,dispatch_request_items(*)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('dispatches').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const error =
    warehousesResult.error ??
    branchesResult.error ??
    itemsResult.error ??
    warehouseStockResult.error ??
    branchStockResult.error ??
    productsResult.error ??
    requestsResult.error ??
    dispatchesResult.error

  if (error) {
    throw new Error(error.message)
  }

  return {
    warehouses: (warehousesResult.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    branches: (branchesResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      warehouseId: row.warehouse_id,
    })),
    items: (itemsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      category: row.category,
    })),
    warehouseStock: (warehouseStockResult.data ?? []).map((row) => ({
      id: row.id,
      warehouseId: row.warehouse_id,
      itemId: row.item_id,
      quantity: Number(row.quantity),
    })),
    branchStock: (branchStockResult.data ?? []).map((row) => ({
      id: row.id,
      branchId: row.branch_id,
      itemId: row.item_id,
      quantity: Number(row.quantity),
    })),
    products: (productsResult.data ?? []).map((row) => ({
      id: row.id,
      branchId: row.branch_id,
      name: row.name,
    })),
    requests: ((requestsResult.data ?? []) as Array<Record<string, unknown>>).map(mapDispatchRequest),
    dispatches: ((dispatchesResult.data ?? []) as Array<Record<string, unknown>>).map(mapDispatch),
  }
}

export async function createAdminDispatchRequest(input: CreateDispatchRequestInput) {
  if (isE2EAdminMockEnabled()) {
    const id = `drq_${Date.now()}`
    mockData.requests = [
      {
        id,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        status: 'pending',
        notes: input.notes.trim() || null,
        createdAt: new Date().toISOString(),
        items: [{ id: `dri_${Date.now()}`, itemId: input.itemId, quantity: input.quantity }],
      },
      ...mockData.requests,
    ]
    return id
  }

  const { data, error } = await getSupabaseClient().rpc('create_dispatch_request', {
    p_branch_id: input.branchId,
    p_warehouse_id: input.warehouseId,
    p_items: [{ item_id: input.itemId, quantity: input.quantity }],
    p_notes: input.notes,
  })

  if (error) throw new Error(error.message)
  return String(data)
}

export async function dispatchAdminRequest(requestId: string) {
  if (isE2EAdminMockEnabled()) {
    const request = mockData.requests.find((entry) => entry.id === requestId)
    if (!request) throw new Error('Solicitud no encontrada.')
    if (request.status !== 'pending' && request.status !== 'approved') {
      throw new Error('La solicitud no esta pendiente.')
    }

    for (const item of request.items) {
      const stock = mockData.warehouseStock.find(
        (entry) => entry.warehouseId === request.warehouseId && entry.itemId === item.itemId,
      )
      if (!stock || stock.quantity < item.quantity) throw new Error('Stock insuficiente en bodega.')
      stock.quantity -= item.quantity
    }

    request.status = 'dispatched'
    const dispatchId = `dsp_${Date.now()}`
    mockData.dispatches = [
      {
        id: dispatchId,
        branchId: request.branchId,
        warehouseId: request.warehouseId,
        dispatchRequestId: request.id,
        status: 'shipped',
        createdAt: new Date().toISOString(),
      },
      ...mockData.dispatches,
    ]
    return dispatchId
  }

  const { data, error } = await getSupabaseClient().rpc('dispatch_request', {
    p_dispatch_request_id: requestId,
  })

  if (error) throw new Error(error.message)
  return String(data)
}

export async function receiveAdminDispatch(dispatchId: string) {
  if (isE2EAdminMockEnabled()) {
    const dispatch = mockData.dispatches.find((entry) => entry.id === dispatchId)
    if (!dispatch) throw new Error('Despacho no encontrado.')
    if (dispatch.status !== 'shipped') throw new Error('El despacho no esta enviado.')

    const request = mockData.requests.find((entry) => entry.id === dispatch.dispatchRequestId)
    for (const item of request?.items ?? []) {
      const stock = mockData.branchStock.find(
        (entry) => entry.branchId === dispatch.branchId && entry.itemId === item.itemId,
      )
      if (stock) {
        stock.quantity += item.quantity
      } else {
        mockData.branchStock.push({
          id: `bstk_${Date.now()}_${item.itemId}`,
          branchId: dispatch.branchId,
          itemId: item.itemId,
          quantity: item.quantity,
        })
      }
    }

    dispatch.status = 'received'
    if (request) request.status = 'received'
    return
  }

  const { error } = await getSupabaseClient().rpc('receive_dispatch', {
    p_dispatch_id: dispatchId,
  })

  if (error) throw new Error(error.message)
}

export async function sellAdminProduct(branchId: string, productId: string, quantity: number) {
  if (isE2EAdminMockEnabled()) {
    const stock = mockData.branchStock.find((entry) => entry.branchId === branchId && entry.itemId === 'pollo-entero')
    if (!stock || stock.quantity < quantity) throw new Error('Stock insuficiente en sede.')
    stock.quantity -= quantity
    return
  }

  const { error } = await getSupabaseClient().rpc('sell_product', {
    p_branch_id: branchId,
    p_product_id: productId,
    p_quantity: quantity,
    p_option_ids: [],
  })

  if (error) throw new Error(error.message)
}
