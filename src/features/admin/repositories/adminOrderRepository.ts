import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../../../services/menuRepository'
import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { fetchMockOrders, updateMockOrderStatus } from './adminMockRepository'
import type { OrderItemRow, OrderRow, OrderStatus, OrderWithItems } from '../../order/types'

export async function fetchOrders(branchId: string): Promise<OrderWithItems[]> {
  if (isE2EAdminMockEnabled()) {
    return fetchMockOrders()
  }

  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = getSupabaseClient()

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Failed to fetch orders:', ordersError)
      return []
    }

    const orderIds = (orders as OrderRow[]).map((order) => order.id)

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

export function subscribeToOrderChanges(
  branchId: string,
  onChange: () => void,
): (() => void) | null {
  if (isE2EAdminMockEnabled() || !isSupabaseConfigured()) {
    return null
  }

  const supabase = getSupabaseClient()
  const channels: RealtimeChannel[] = [
    supabase
      .channel(`orders:${branchId}`)
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
      .channel(`order_status_events:${branchId}`)
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

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<boolean> {
  if (isE2EAdminMockEnabled()) {
    return updateMockOrderStatus(orderId, status)
  }

  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    return !error
  } catch {
    return false
  }
}
