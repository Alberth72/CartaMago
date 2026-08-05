import type { RealtimeChannel } from '@supabase/supabase-js'
import { isE2EAdminMockEnabled } from '../../lib/runtimeFlags'
import { getSupabaseClient, isSupabaseConfigured } from '../../services/menuRepository'
import { fetchMockOrders } from '../admin/repositories/adminMockRepository'
import type { OrderItemRow, OrderRow, OrderWithItems } from '../order/types'

export async function fetchTrackableOrders(restaurantId: string): Promise<OrderWithItems[]> {
  if (isE2EAdminMockEnabled()) {
    return fetchMockOrders()
  }

  if (!isSupabaseConfigured()) return []

  try {
    const supabase = getSupabaseClient()
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
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

export async function fetchTrackableOrder(restaurantId: string, orderId: string): Promise<OrderWithItems | null> {
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
      .eq('restaurant_id', restaurantId)
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
  restaurantId: string,
  onChange: () => void,
): (() => void) | null {
  if (isE2EAdminMockEnabled() || !isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  const channels: RealtimeChannel[] = [
    supabase
      .channel(`public-tracking-orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        onChange,
      )
      .subscribe(),
    supabase
      .channel(`public-tracking-events:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_events',
          filter: `restaurant_id=eq.${restaurantId}`,
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
