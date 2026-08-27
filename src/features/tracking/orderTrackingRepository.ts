import type { RealtimeChannel } from '@supabase/supabase-js'
import { isE2EAdminMockEnabled } from '../../lib/runtimeFlags'
import { getSupabaseClient, isSupabaseConfigured } from '../../services/menuRepository'
import { fetchMockOrders } from '../admin/repositories/adminMockRepository'
import type { OrderItemRow, OrderRow, OrderWithItems, OrderStatus } from '../order/types'
import { loadReceiptTrackingFallback, type ReceiptTrackingFallback } from '../receipt/receiptFallbackStorage'
import type { CustomerTrackingView } from './trackingTypes'

export async function fetchTrackableOrders(branchId: string): Promise<OrderWithItems[]> {
  if (isE2EAdminMockEnabled()) {
    return fetchMockOrders()
  }

  if (!isSupabaseConfigured()) return []

  try {
    const supabase = getSupabaseClient()
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Failed to fetch trackable orders:', ordersError)
      return []
    }

    return hydrateOrders(orders as OrderRow[])
  } catch (error) {
    console.error('Failed to fetch trackable orders:', error)
    return []
  }
}

export async function fetchKitchenDisplayOrders(branchId: string, displayToken?: string): Promise<OrderWithItems[]> {
  if (isE2EAdminMockEnabled()) {
    return fetchMockOrders()
  }

  if (!isSupabaseConfigured() || !displayToken) return []

  try {
    const { data, error } = await getSupabaseClient().rpc('get_kitchen_display_orders', {
      p_branch_id: branchId,
      p_token: displayToken,
    })
    if (error) throw error

    return normalizeDisplayOrders(data)
  } catch (error) {
    console.error('Failed to fetch kitchen display orders:', error)
    return []
  }
}

export async function fetchRoomDisplayOrders(branchId: string, displayToken?: string): Promise<OrderWithItems[]> {
  if (isE2EAdminMockEnabled()) {
    return fetchMockOrders()
  }

  if (!isSupabaseConfigured() || !displayToken) return []

  try {
    const { data, error } = await getSupabaseClient().rpc('get_room_display_orders', {
      p_branch_id: branchId,
      p_token: displayToken,
    })
    if (error) throw error

    return normalizeDisplayOrders(data)
  } catch (error) {
    console.error('Failed to fetch room display orders:', error)
    return []
  }
}

export async function fetchTrackableOrder(branchId: string, orderId: string): Promise<OrderWithItems | null> {
  if (isE2EAdminMockEnabled()) {
    const orders = await fetchMockOrders()
    return orders.find((order) => order.id === orderId) ?? null
  }

  if (!isSupabaseConfigured()) return null

  try {
    const supabase = getSupabaseClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('branch_id', branchId)
      .eq('id', orderId)
      .maybeSingle()

    if (error || !order) {
      if (error) console.error('Failed to fetch trackable order:', error)
      return null
    }

    const [hydrated] = await hydrateOrders([order as OrderRow])
    return hydrated ?? null
  } catch (error) {
    console.error('Failed to fetch trackable order:', error)
    return null
  }
}

export function subscribeToTrackableOrderChanges(
  branchId: string,
  onChange: () => void,
): (() => void) | null {
  if (isE2EAdminMockEnabled() || !isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  const channels: RealtimeChannel[] = [
    supabase
      .channel(`public-tracking-orders:${branchId}`)
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
      .channel(`public-tracking-events:${branchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_events',
          filter: `branch_id=eq.${branchId}`,
        },
        onChange,
      )
      .subscribe(),
  ]

  return () => {
    for (const channel of channels) {
      void supabase.removeChannel(channel)
    }
  }
}

async function hydrateOrders(orders: OrderRow[]): Promise<OrderWithItems[]> {
  if (orders.length === 0) return []

  const supabase = getSupabaseClient()
  const orderIds = orders.map((order) => order.id)
  const { data: items, error } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch tracking order items:', error)
    return orders.map((order) => ({ ...order, items: [] }))
  }

  const itemsByOrderId = new Map<string, OrderItemRow[]>()
  for (const item of items as OrderItemRow[]) {
    const list = itemsByOrderId.get(item.order_id) ?? []
    list.push(item)
    itemsByOrderId.set(item.order_id, list)
  }

  return orders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
  }))
}

function toCustomerTrackingView(order: OrderWithItems): CustomerTrackingView {
  return {
    orderId: order.id,
    receiptNumber: `PED-${order.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`,
    businessName: order.branch_id,
    branchName: order.branch_id,
    orderChannel: order.order_channel ?? 'cartamago',
    status: order.status,
    fulfillmentMode: order.fulfillment_mode,
    paymentMethod: order.payment_method ?? 'cash',
    paymentStatus: order.payment_status ?? 'pending',
    totalCop: order.total_cop,
    whatsappLink: order.whatsapp_link,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    customerName: null,
    tableNumber: order.table_number || null,
    items: order.items.map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_cop: item.unit_price_cop,
      line_note: item.line_note,
    })),
  }
}

function toCustomerTrackingFallback(fallback: ReceiptTrackingFallback): CustomerTrackingView {
  return {
    orderId: fallback.receipt.orderId,
    receiptNumber: fallback.receipt.receiptNumber,
    businessName: fallback.receipt.businessName,
    branchName: fallback.receipt.branchName,
    orderChannel: fallback.orderChannel,
    status: fallback.status,
    fulfillmentMode: fallback.fulfillmentMode,
    paymentMethod: fallback.paymentMethod,
    paymentStatus: fallback.paymentStatus,
    totalCop: fallback.receipt.totalCop,
    whatsappLink: fallback.whatsappLink,
    createdAt: fallback.createdAt,
    updatedAt: fallback.updatedAt,
    customerName: null,
    tableNumber: null,
    items: fallback.receipt.items.map((item) => ({
      product_name: item.productName,
      quantity: item.quantity,
      unit_price_cop: item.unitPriceCop,
      line_note: item.lineNote ?? '',
    })),
  }
}

function normalizeDisplayOrders(data: unknown): OrderWithItems[] {
  const rows = Array.isArray(data) ? data : []
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    .map(toDisplayOrder)
}

function toDisplayOrder(row: Record<string, unknown>): OrderWithItems {
  const orderId = String(row.id ?? '')
  const items = Array.isArray(row.items) ? row.items : []

  return {
    id: orderId,
    branch_id: String(row.branch_id ?? ''),
    status: normalizeOrderStatus(row.status),
    order_channel: typeof row.order_channel === 'string' ? row.order_channel : undefined,
    delivery_provider: typeof row.delivery_provider === 'string' ? row.delivery_provider : undefined,
    payment_status: typeof row.payment_status === 'string' ? row.payment_status : undefined,
    payment_method: typeof row.payment_method === 'string' ? row.payment_method : undefined,
    payment_provider: typeof row.payment_provider === 'string' ? row.payment_provider : undefined,
    external_provider: typeof row.external_provider === 'string' ? row.external_provider : null,
    external_order_id: typeof row.external_order_id === 'string' ? row.external_order_id : null,
    external_status: typeof row.external_status === 'string' ? row.external_status : null,
    customer_name: String(row.customer_name ?? ''),
    customer_phone: typeof row.customer_phone === 'string' ? row.customer_phone : '',
    customer_note: String(row.customer_note ?? ''),
    fulfillment_mode: String(row.fulfillment_mode ?? ''),
    delivery_address: String(row.delivery_address ?? ''),
    table_number: String(row.table_number ?? ''),
    total_items: Number(row.total_items ?? 0),
    total_cop: Number(row.total_cop ?? 0),
    whatsapp_message: String(row.whatsapp_message ?? ''),
    whatsapp_link: String(row.whatsapp_link ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    items: items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      .map((item, index) => ({
        id: String(item.id ?? `${orderId}:item:${index}`),
        order_id: String(item.order_id ?? orderId),
        product_id: String(item.product_id ?? ''),
        product_name: String(item.product_name ?? ''),
        quantity: Number(item.quantity ?? 0),
        unit_price_cop: item.unit_price_cop == null ? null : Number(item.unit_price_cop),
        line_note: String(item.line_note ?? ''),
        sort_order: Number(item.sort_order ?? index),
      })),
  }
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  return value === 'pending' ||
    value === 'confirmed' ||
    value === 'preparing' ||
    value === 'ready' ||
    value === 'delivered' ||
    value === 'cancelled'
    ? value
    : 'pending'
}

/**
 * Rastreo publico del cliente SOLO por `tracking_token` (no adivinable).
 * Devuelve unicamente campos seguros via la RPC `get_order_tracking`
 * (security definer). Nunca expone telefono, direccion, notas ni payloads.
 */
export async function fetchOrderTracking(trackingToken: string): Promise<CustomerTrackingView | null> {
  if (!trackingToken) return null
  const fallback = loadReceiptTrackingFallback(trackingToken)

  if (isE2EAdminMockEnabled()) {
    const orders = await fetchMockOrders()
    const order = orders.find((entry) => entry.tracking_token === trackingToken)
    return order ? toCustomerTrackingView(order) : fallback ? toCustomerTrackingFallback(fallback) : null
  }

  if (!isSupabaseConfigured()) return fallback ? toCustomerTrackingFallback(fallback) : null

  try {
    const { data, error } = await getSupabaseClient().rpc('get_order_tracking', { p_token: trackingToken })
    if (error) throw error

    const first = Array.isArray(data) ? data[0] : data
    const value =
      (first as { get_order_tracking?: unknown } | null | undefined)?.get_order_tracking ?? first
    const row = (value ?? {}) as { error?: string } & Partial<CustomerTrackingView>

    if (row.error === 'not_found' || !row.orderId) {
      return fallback ? toCustomerTrackingFallback(fallback) : null
    }

    return {
      orderId: String(row.orderId),
      receiptNumber: String(row.receiptNumber ?? `PED-${String(row.orderId).replace(/-/g, '').slice(0, 10).toUpperCase()}`),
      businessName: String(row.businessName ?? row.branchName ?? ''),
      branchName: String(row.branchName ?? ''),
      orderChannel: String(row.orderChannel ?? 'cartamago'),
      status: row.status as OrderStatus,
      fulfillmentMode: String(row.fulfillmentMode ?? ''),
      paymentMethod: String(row.paymentMethod ?? 'cash'),
      paymentStatus: String(row.paymentStatus ?? 'pending'),
      totalCop: Number(row.totalCop ?? 0),
      whatsappLink: String(row.whatsappLink ?? ''),
      createdAt: String(row.createdAt ?? new Date().toISOString()),
      updatedAt: String(row.updatedAt ?? new Date().toISOString()),
      customerName: null,
      tableNumber: typeof row.tableNumber === 'string' && row.tableNumber ? row.tableNumber : null,
      items: Array.isArray(row.items) ? row.items : [],
    }
  } catch (error) {
    console.error('Failed to fetch order tracking:', error)
    return fallback ? toCustomerTrackingFallback(fallback) : null
  }
}
