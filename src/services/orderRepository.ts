import { getSupabaseClient, isSupabaseConfigured } from './menuRepository'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export type OrderRow = {
  id: string
  restaurant_id: string
  status: OrderStatus
  customer_name: string
  customer_note: string
  fulfillment_mode: string
  delivery_address: string
  table_number: string
  total_items: number
  total_cop: number
  whatsapp_message: string
  whatsapp_link: string
  created_at: string
  updated_at: string
}

export type OrderItemRow = {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price_cop: number | null
  line_note: string
  sort_order: number
}

export type OrderWithItems = OrderRow & { items: OrderItemRow[] }

export type SaveOrderInput = {
  restaurantId: string
  customerName: string
  customerNote: string
  fulfillmentMode: string
  deliveryAddress: string
  tableNumber: string
  totalItems: number
  totalCop: number
  whatsappMessage: string
  whatsappLink: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPriceCop: number | null
    lineNote: string
  }>
}

function makeId(prefix = 'ord') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${ts}_${rand}`
}

export async function saveOrder(input: SaveOrderInput): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, order not saved')
    return null
  }

  try {
    const supabase = getSupabaseClient()
    const orderId = makeId()

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      restaurant_id: input.restaurantId,
      status: 'pending',
      customer_name: input.customerName,
      customer_note: input.customerNote,
      fulfillment_mode: input.fulfillmentMode,
      delivery_address: input.deliveryAddress,
      table_number: input.tableNumber,
      total_items: input.totalItems,
      total_cop: input.totalCop,
      whatsapp_message: input.whatsappMessage,
      whatsapp_link: input.whatsappLink,
    })

    if (orderError) {
      console.error('Failed to save order:', orderError)
      return null
    }

    const items = input.items.map((item, index) => ({
      id: makeId('itm'),
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price_cop: item.unitPriceCop,
      line_note: item.lineNote,
      sort_order: (index + 1) * 10,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(items)

    if (itemsError) {
      console.error('Failed to save order items:', itemsError)
      return null
    }

    return orderId
  } catch (error) {
    console.error('Failed to save order:', error)
    return null
  }
}

export async function fetchOrders(restaurantId: string): Promise<OrderWithItems[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = getSupabaseClient()

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Failed to fetch orders:', ordersError)
      return []
    }

    const orderIds = (orders as OrderRow[]).map((o) => o.id)

    if (orderIds.length === 0) return []

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)
      .order('sort_order', { ascending: true })

    if (itemsError) {
      console.error('Failed to fetch order items:', itemsError)
      return []
    }

    const itemsByOrderId = new Map<string, OrderItemRow[]>()
    for (const item of items as OrderItemRow[]) {
      const list = itemsByOrderId.get(item.order_id) ?? []
      list.push(item)
      itemsByOrderId.set(item.order_id, list)
    }

    return (orders as OrderRow[]).map((order) => ({
      ...order,
      items: itemsByOrderId.get(order.id) ?? [],
    }))
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return []
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    return !error
  } catch {
    return false
  }
}