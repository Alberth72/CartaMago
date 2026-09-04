import type { RealtimeChannel } from '@supabase/supabase-js'
import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { postApiJson, shouldFallbackToSupabase } from '../../../services/apiClient'
import { getSupabaseClient, isSupabaseConfigured } from '../../../services/menuRepository'
import type {
  CloseCashSessionInput,
  CreateDispatchRequestInput,
  CreateProductFormulaInput,
  CreateSaleInput,
  CashSession,
  Dispatch,
  DispatchRequest,
  DispatchRequestStatus,
  DispatchStatus,
  OperationsData,
  OpenCashSessionInput,
  ProductFormulaIngredientInput,
  SalePaymentMethod,
  SalePaymentStatus,
  SaleSummary,
} from '../operationsTypes'
import type { OrderItemRow, OrderRow } from '../../order/types'
import { fetchAdminScope } from './adminScopeRepository'
import { fetchMockOrders } from './adminMockRepository'

const now = Date.now()

let mockData: OperationsData = {
  profile: {
    userId: 'mock-superadmin',
    email: 'owner@cartamago.test',
    role: 'superadmin',
    branchIds: ['brasas-sazon', 'brasas-sazon-norte'],
    warehouseIds: ['brasas-central'],
    primaryBranchId: 'brasas-sazon',
    primaryWarehouseId: 'brasas-central',
    canManageWarehouse: true,
  },
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
    { id: 'pollo-entero', branchId: 'brasas-sazon', name: '1 Pollo asado al carbon', priceCop: 26000 },
    { id: 'limonada-natural', branchId: 'brasas-sazon', name: 'Limonada natural', priceCop: 7000 },
    { id: 'gaseosa-personal', branchId: 'brasas-sazon', name: 'Gaseosa personal', priceCop: 5000 },
    { id: 'pollo-entero-norte', branchId: 'brasas-sazon-norte', name: '1 Pollo asado al carbon', priceCop: 26000 },
    { id: 'limonada-natural-norte', branchId: 'brasas-sazon-norte', name: 'Limonada natural', priceCop: 7000 },
  ],
  formulas: [
    {
      id: 'formula_demo_pollo',
      branchId: 'brasas-sazon',
      productId: 'pollo-entero',
      active: true,
      ingredients: [
        { id: 'fi_demo_1', formulaId: 'formula_demo_pollo', itemId: 'pollo-entero', quantityPerUnit: 1, mermaPercent: 0 },
        { id: 'fi_demo_2', formulaId: 'formula_demo_pollo', itemId: 'limon', quantityPerUnit: 0.5, mermaPercent: 10 },
      ],
    },
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
  cashSessions: [
    {
      id: 'cash_demo_001',
      branchId: 'brasas-sazon',
      name: 'Caja principal',
      accessToken: 'cs_mock_cash_demo_001',
      status: 'open',
      openingCashCop: 100000,
      closingCashCop: null,
      expectedCashCop: null,
      openedAt: new Date(now - 2 * 60 * 60_000).toISOString(),
      closedAt: null,
    },
  ],
  sales: [],
}

function cloneOperationsData(): OperationsData {
  return {
    profile: {
      ...mockData.profile,
      branchIds: [...mockData.profile.branchIds],
      warehouseIds: [...mockData.profile.warehouseIds],
    },
    warehouses: mockData.warehouses.map((warehouse) => ({ ...warehouse })),
    branches: mockData.branches.map((branch) => ({ ...branch })),
    items: mockData.items.map((item) => ({ ...item })),
    warehouseStock: mockData.warehouseStock.map((stock) => ({ ...stock })),
    branchStock: mockData.branchStock.map((stock) => ({ ...stock })),
    products: mockData.products.map((product) => ({ ...product })),
    formulas: mockData.formulas.map((formula) => ({
      ...formula,
      ingredients: formula.ingredients.map((ingredient) => ({ ...ingredient })),
    })),
    requests: mockData.requests.map((request) => ({
      ...request,
      items: request.items.map((item) => ({ ...item })),
    })),
    dispatches: mockData.dispatches.map((dispatch) => ({ ...dispatch })),
    cashSessions: mockData.cashSessions.map((session) => ({ ...session })),
    sales: mockData.sales.map((sale) => ({ ...sale, itemNames: [...sale.itemNames] })),
  }
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
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

function mapCashSession(row: Record<string, unknown>): CashSession {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    name: typeof row.name === 'string' ? row.name : 'Caja principal',
    status: row.status === 'closed' ? 'closed' : 'open',
    accessToken: typeof row.access_token === 'string' ? row.access_token : null,
    openingCashCop: Number(row.opening_cash_cop ?? 0),
    closingCashCop: row.closing_cash_cop == null ? null : Number(row.closing_cash_cop),
    expectedCashCop: row.expected_cash_cop == null ? null : Number(row.expected_cash_cop),
    openedAt: String(row.opened_at),
    closedAt: typeof row.closed_at === 'string' ? row.closed_at : null,
  }
}

function mapSale(row: Record<string, unknown>): SaleSummary {
  const items = Array.isArray(row.sale_items) ? row.sale_items : []
  const payments = Array.isArray(row.sale_payments) ? row.sale_payments : []
  const firstPayment = (payments[0] ?? {}) as Record<string, unknown>

  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    cashSessionId: typeof row.cash_session_id === 'string' ? row.cash_session_id : null,
    orderId: typeof row.order_id === 'string' ? row.order_id : null,
    source: row.source === 'cash_terminal' || row.source === 'qr_order' || row.source === 'manual' ? row.source : 'admin_pos',
    receiptNumber: String(row.receipt_number),
    totalCop: Number(row.total_cop ?? 0),
    paymentMethod: String(firstPayment.payment_method ?? 'cash') as SalePaymentMethod,
    paymentStatus: String(row.payment_status ?? firstPayment.payment_status ?? 'paid') as SalePaymentStatus,
    soldAt: String(row.sold_at),
    itemNames: items.map((item) => String((item as Record<string, unknown>).product_name ?? '')).filter(Boolean),
  }
}

function makePublicOrderReceiptNumber(orderId: string) {
  return `PED-${orderId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10)}`
}

function normalizeSalePaymentStatus(status: string | undefined): SalePaymentStatus {
  if (status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'refunded') return status
  return 'pending'
}

function mapPublicOrderSale(order: OrderRow & { items: OrderItemRow[] }): SaleSummary {
  return {
    id: `public_${order.id}`,
    branchId: order.branch_id,
    cashSessionId: null,
    orderId: order.id,
    source: 'qr_order',
    receiptNumber: makePublicOrderReceiptNumber(order.id),
    totalCop: Number(order.total_cop ?? 0),
    paymentMethod: (order.payment_method ?? 'cash') as SalePaymentMethod,
    paymentStatus: normalizeSalePaymentStatus(order.payment_status),
    soldAt: order.created_at,
    itemNames: order.items.map((item) => `${item.quantity} x ${item.product_name}`),
  }
}

function mergePublicOrderSales(sales: SaleSummary[], publicOrders: Array<OrderRow & { items: OrderItemRow[] }>) {
  const existingOrderIds = new Set(sales.map((sale) => sale.orderId).filter(Boolean))
  const publicOrderSales = publicOrders
    .filter((order) => !existingOrderIds.has(order.id))
    .filter((order) => order.status !== 'cancelled')
    .filter((order) => {
      const channel = order.order_channel ?? 'cartamago'
      return channel === 'cartamago' || channel === 'whatsapp' || channel === 'didi_food'
    })
    .map(mapPublicOrderSale)

  return [...sales, ...publicOrderSales].sort(
    (left, right) => new Date(right.soldAt).getTime() - new Date(left.soldAt).getTime(),
  )
}

export async function fetchAdminOperations(): Promise<OperationsData> {
  if (isE2EAdminMockEnabled()) {
    const data = cloneOperationsData()
    return {
      ...data,
      sales: mergePublicOrderSales(data.sales, await fetchMockOrders()),
    }
  }

  const supabase = getSupabaseClient()
  const profile = await fetchAdminScope()
  const [
    warehousesResult,
    branchesResult,
    itemsResult,
    warehouseStockResult,
    branchStockResult,
    productsResult,
    formulasResult,
    requestsResult,
    dispatchesResult,
    cashSessionsResult,
    salesResult,
    ordersResult,
  ] = await Promise.all([
    supabase.from('warehouses').select('id,name').order('name', { ascending: true }),
    supabase.from('branches').select('id,name,warehouse_id').order('name', { ascending: true }),
    supabase.from('inventory_items').select('id,name,unit,category').order('name', { ascending: true }),
    supabase.from('warehouse_stock').select('id,warehouse_id,item_id,quantity'),
    supabase.from('branch_stock').select('id,branch_id,item_id,quantity'),
    supabase.from('products').select('id,branch_id,name,price_cop').eq('available', true).order('name', { ascending: true }),
    supabase
      .from('formulas')
      .select('id,branch_id,product_id,active,formula_ingredients(*)')
      .order('branch_id', { ascending: true }),
    supabase
      .from('dispatch_requests')
      .select('*,dispatch_request_items(*)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('dispatches').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('cash_sessions').select('*').order('opened_at', { ascending: false }).limit(20),
    supabase
      .from('sales')
      .select('*,sale_items(*),sale_payments(*)')
      .order('sold_at', { ascending: false })
      .limit(20),
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const error =
    warehousesResult.error ??
    branchesResult.error ??
    itemsResult.error ??
    warehouseStockResult.error ??
    branchStockResult.error ??
    productsResult.error ??
    formulasResult.error ??
    requestsResult.error ??
    dispatchesResult.error ??
    cashSessionsResult.error ??
    salesResult.error ??
    ordersResult.error

  if (error) {
    throw new Error(error.message)
  }

  const branches = (branchesResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      warehouseId: row.warehouse_id,
    }))
  const visibleBranchIds = profile.canManageWarehouse
    ? branches
        .filter((branch) => profile.warehouseIds.length === 0 || profile.warehouseIds.includes(branch.warehouseId ?? ''))
        .map((branch) => branch.id)
    : profile.branchIds
  const visibleWarehouseIds = profile.canManageWarehouse
    ? profile.warehouseIds
    : uniq(branches.filter((branch) => visibleBranchIds.includes(branch.id)).map((branch) => branch.warehouseId))
  const visibleOrderRows = ((ordersResult.data ?? []) as OrderRow[])
    .filter((order) => visibleBranchIds.includes(order.branch_id))
  const visibleOrderIds = visibleOrderRows.map((order) => order.id)
  const orderItemsResult = visibleOrderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('*')
        .in('order_id', visibleOrderIds)
        .order('sort_order', { ascending: true })
    : { data: [], error: null }

  if (orderItemsResult.error) {
    throw new Error(orderItemsResult.error.message)
  }

  const orderItemsById = new Map<string, OrderItemRow[]>()
  for (const item of (orderItemsResult.data ?? []) as OrderItemRow[]) {
    const list = orderItemsById.get(item.order_id) ?? []
    list.push(item)
    orderItemsById.set(item.order_id, list)
  }
  const publicOrders = visibleOrderRows.map((order) => ({
    ...order,
    items: orderItemsById.get(order.id) ?? [],
  }))
  const visibleSales = ((salesResult.data ?? []) as Array<Record<string, unknown>>)
    .map(mapSale)
    .filter((sale) => visibleBranchIds.includes(sale.branchId))

  return {
    profile,
    warehouses: (warehousesResult.data ?? [])
      .filter((row) => visibleWarehouseIds.length === 0 || visibleWarehouseIds.includes(row.id))
      .map((row) => ({ id: row.id, name: row.name })),
    branches: branches.filter((branch) => visibleBranchIds.length === 0 || visibleBranchIds.includes(branch.id)),
    items: (itemsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      category: row.category,
    })),
    warehouseStock: (warehouseStockResult.data ?? [])
      .filter((row) => visibleWarehouseIds.length === 0 || visibleWarehouseIds.includes(row.warehouse_id))
      .map((row) => ({
        id: row.id,
        warehouseId: row.warehouse_id,
        itemId: row.item_id,
        quantity: Number(row.quantity),
      })),
    branchStock: (branchStockResult.data ?? [])
      .filter((row) => visibleBranchIds.length === 0 || visibleBranchIds.includes(row.branch_id))
      .map((row) => ({
        id: row.id,
        branchId: row.branch_id,
        itemId: row.item_id,
        quantity: Number(row.quantity),
      })),
    products: (productsResult.data ?? []).map((row) => ({
      id: row.id,
      branchId: row.branch_id,
      name: row.name,
      priceCop: row.price_cop == null ? null : Number(row.price_cop),
    })).filter((product) => visibleBranchIds.length === 0 || visibleBranchIds.includes(product.branchId)),
    formulas: ((formulasResult.data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => visibleBranchIds.length === 0 || visibleBranchIds.includes(String(row.branch_id)))
      .map((row) => ({
        id: String(row.id),
        branchId: String(row.branch_id),
        productId: String(row.product_id),
        active: Boolean(row.active),
        ingredients: (Array.isArray(row.formula_ingredients) ? row.formula_ingredients : []).map((ingredient) => ({
          id: String((ingredient as Record<string, unknown>).id),
          formulaId: String((ingredient as Record<string, unknown>).formula_id),
          itemId: String((ingredient as Record<string, unknown>).item_id),
          quantityPerUnit: Number((ingredient as Record<string, unknown>).quantity_per_unit ?? 0),
          mermaPercent: Number((ingredient as Record<string, unknown>).merma_percent ?? 0),
        })),
      })),
    requests: ((requestsResult.data ?? []) as Array<Record<string, unknown>>)
      .map(mapDispatchRequest)
      .filter(
        (request) =>
          visibleBranchIds.includes(request.branchId) ||
          (profile.canManageWarehouse && visibleWarehouseIds.includes(request.warehouseId)),
      ),
    dispatches: ((dispatchesResult.data ?? []) as Array<Record<string, unknown>>)
      .map(mapDispatch)
      .filter(
        (dispatch) =>
          visibleBranchIds.includes(dispatch.branchId) ||
          (profile.canManageWarehouse && visibleWarehouseIds.includes(dispatch.warehouseId)),
      ),
    cashSessions: ((cashSessionsResult.data ?? []) as Array<Record<string, unknown>>)
      .map(mapCashSession)
      .filter((session) => visibleBranchIds.includes(session.branchId)),
    sales: mergePublicOrderSales(visibleSales, publicOrders),
  }
}

export function subscribeToAdminOperationsStockChanges(
  input: { branchIds: string[]; warehouseIds: string[] },
  onChange: () => void,
): (() => void) | null {
  if (isE2EAdminMockEnabled() || !isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  const channels: RealtimeChannel[] = [
    ...input.branchIds.map((branchId) =>
      supabase
        .channel(`admin-operations-branch-stock:${branchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'branch_stock',
            filter: `branch_id=eq.${branchId}`,
          },
          onChange,
        )
        .subscribe(),
    ),
    ...input.warehouseIds.map((warehouseId) =>
      supabase
        .channel(`admin-operations-warehouse-stock:${warehouseId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'warehouse_stock',
            filter: `warehouse_id=eq.${warehouseId}`,
          },
          onChange,
        )
        .subscribe(),
    ),
    ...input.branchIds.flatMap((branchId) => [
      supabase
        .channel(`admin-operations-sales:${branchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sales',
            filter: `branch_id=eq.${branchId}`,
          },
          onChange,
        )
        .subscribe(),
      supabase
        .channel(`admin-operations-orders:${branchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `branch_id=eq.${branchId}`,
          },
          onChange,
        )
        .subscribe(),
      supabase
        .channel(`admin-operations-cash-sessions:${branchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cash_sessions',
            filter: `branch_id=eq.${branchId}`,
          },
          onChange,
        )
        .subscribe(),
    ]),
  ]

  if (channels.length === 0) return null

  return () => {
    for (const channel of channels) {
      void supabase.removeChannel(channel)
    }
  }
}

export async function openAdminCashSession(input: OpenCashSessionInput) {
  if (isE2EAdminMockEnabled()) {
    const sessionId = `cash_${Date.now()}`
    mockData.cashSessions = [
      {
        id: sessionId,
        branchId: input.branchId,
        name: input.name.trim() || 'Caja principal',
        accessToken: `cs_mock_${sessionId}`,
        status: 'open',
        openingCashCop: Math.max(input.openingCashCop, 0),
        closingCashCop: null,
        expectedCashCop: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
      },
      ...mockData.cashSessions,
    ]
    return sessionId
  }

  const { data, error } = await getSupabaseClient().rpc('open_cash_session', {
    p_branch_id: input.branchId,
    p_opening_cash_cop: input.openingCashCop,
    p_notes: input.notes,
    p_name: input.name,
  })

  if (error) throw new Error(error.message)
  return String(data)
}

export async function closeAdminCashSession(input: CloseCashSessionInput) {
  if (isE2EAdminMockEnabled()) {
    const session = mockData.cashSessions.find((entry) => entry.id === input.cashSessionId)
    if (!session) throw new Error('Caja no encontrada.')
    if (session.status !== 'open') throw new Error('La caja ya esta cerrada.')

    const cashSales = mockData.sales
      .filter((sale) => sale.cashSessionId === session.id && sale.paymentMethod === 'cash' && sale.paymentStatus === 'paid')
      .reduce((sum, sale) => sum + sale.totalCop, 0)

    session.status = 'closed'
    session.closingCashCop = Math.max(input.closingCashCop, 0)
    session.expectedCashCop = session.openingCashCop + cashSales
    session.closedAt = new Date().toISOString()
    return
  }

  const { error } = await getSupabaseClient().rpc('close_cash_session', {
    p_cash_session_id: input.cashSessionId,
    p_closing_cash_cop: input.closingCashCop,
    p_notes: input.notes,
  })

  if (error) throw new Error(error.message)
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

export async function createAdminProductFormula(input: CreateProductFormulaInput) {
  if (input.ingredients.length === 0) {
    throw new Error('Agrega al menos un insumo a la receta.')
  }

  if (isE2EAdminMockEnabled()) {
    return `formula_${input.branchId}_${input.productId}_${Date.now()}`
  }

  const supabase = getSupabaseClient()
  const existingFormulaResult = await supabase
    .from('formulas')
    .select('id')
    .eq('branch_id', input.branchId)
    .eq('product_id', input.productId)
    .maybeSingle()

  if (existingFormulaResult.error && existingFormulaResult.error.code !== 'PGRST116') {
    throw new Error(existingFormulaResult.error.message)
  }

  const formulaId = existingFormulaResult.data?.id ?? `formula_${input.branchId}_${input.productId}_${Date.now()}`

  const { error: formulaError } = await supabase.from('formulas').upsert({
    id: formulaId,
    branch_id: input.branchId,
    product_id: input.productId,
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'branch_id,product_id' })

  if (formulaError) {
    throw new Error(formulaError.message)
  }

  const { error: deleteError } = await supabase.from('formula_ingredients').delete().eq('formula_id', formulaId)
  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const ingredients = input.ingredients.map((ingredient: ProductFormulaIngredientInput) => ({
    id: `fi_${formulaId}_${ingredient.itemId}_${Date.now()}`,
    formula_id: formulaId,
    item_id: ingredient.itemId,
    quantity_per_unit: ingredient.quantityPerUnit,
    merma_percent: ingredient.mermaPercent,
  }))

  const { error: insertError } = await supabase.from('formula_ingredients').insert(ingredients)
  if (insertError) {
    throw new Error(insertError.message)
  }

  return formulaId
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

export async function createAdminSale(input: CreateSaleInput) {
  if (isE2EAdminMockEnabled()) {
    if (input.items.length === 0) throw new Error('Agrega al menos un producto a la venta.')
    const cashSession =
      input.cashSessionId == null
        ? mockData.cashSessions.find((entry) => entry.branchId === input.branchId && entry.status === 'open') ?? null
        : mockData.cashSessions.find((entry) => entry.id === input.cashSessionId && entry.branchId === input.branchId) ?? null
    if (input.cashSessionId && cashSession?.status !== 'open') throw new Error('La caja seleccionada no esta abierta para esta sede.')
    const lines = input.items.map((item) => {
      const product = mockData.products.find((entry) => entry.branchId === input.branchId && entry.id === item.productId)
      if (!product) throw new Error('Producto no disponible para la sede.')
      if (item.quantity <= 0) throw new Error('La cantidad vendida debe ser mayor a cero.')
      return { product, quantity: item.quantity }
    })

    for (const line of lines) {
      if (!line.product.id.includes('pollo')) continue
      const stock = mockData.branchStock.find((entry) => entry.branchId === input.branchId && entry.itemId === 'pollo-entero')
      if (!stock || stock.quantity < line.quantity) throw new Error('Stock insuficiente en sede.')
      stock.quantity -= line.quantity
    }

    const saleId = `sale_${Date.now()}`
    const receiptNumber = `${input.branchId.replace(/-/g, '').toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-MOCK`
    mockData.sales = [
      {
        id: saleId,
        branchId: input.branchId,
        cashSessionId: cashSession?.id ?? null,
        receiptNumber,
        totalCop: lines.reduce((sum, line) => sum + (line.product.priceCop ?? 0) * line.quantity, 0),
        orderId: null,
        source: 'admin_pos',
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === 'wompi' ? 'pending' : 'paid',
        soldAt: new Date().toISOString(),
        itemNames: lines.map((line) => `${line.quantity} x ${line.product.name}`),
      },
      ...mockData.sales,
    ]
    return
  }

  try {
    const { data: sessionData } = await getSupabaseClient().auth.getSession()
    await postApiJson('cash/sales', {
      branchId: input.branchId,
      items: input.items,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      cashSessionId: input.cashSessionId ?? null,
    }, sessionData.session?.access_token)
    return
  } catch (error) {
    if (!shouldFallbackToSupabase(error)) throw error
  }

  const { error } = await getSupabaseClient().rpc('create_sale', {
    p_branch_id: input.branchId,
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_payment_method: input.paymentMethod,
    p_payment_reference: input.paymentReference,
    p_cash_session_id: input.cashSessionId ?? null,
  })

  if (error) throw new Error(error.message)
}
