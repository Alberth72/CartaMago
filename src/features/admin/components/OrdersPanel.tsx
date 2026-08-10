import { useCallback, useEffect, useState } from 'react'
import { getSupabaseConfig } from '../../../services/menuRepository'
import {
  fetchOrders,
  subscribeToOrderChanges,
  updateOrderStatus,
} from '../repositories/adminOrderRepository'
import type { OrderStatus, OrderWithItems } from '../../order/types'
import { OrderDetailModal } from './OrderDetailModal'
import { OrdersList } from './OrdersList'

type OrdersPanelProps = {
  statusFilter?: OrderStatus
}

export function OrdersPanel({ statusFilter }: OrdersPanelProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const selectedOrderId = selectedOrder?.id

  const loadOrders = useCallback(async (showInitialLoading = false) => {
    if (showInitialLoading) setLoading(true)
    setRefreshing(true)
    const { branchId } = getSupabaseConfig()
    const data = await fetchOrders(branchId)
    setOrders(data)
    setLastSyncedAt(new Date().toISOString())
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadOrders(true)
  }, [loadOrders])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadOrders()
    }, 15000)

    const handleFocus = () => void loadOrders()
    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadOrders])

  useEffect(() => {
    const { branchId } = getSupabaseConfig()
    const unsubscribe = subscribeToOrderChanges(branchId, () => void loadOrders())
    if (!unsubscribe) return

    return unsubscribe
  }, [loadOrders])

  useEffect(() => {
    if (!selectedOrderId) return

    const updated = orders.find((order) => order.id === selectedOrderId)
    if (updated) setSelectedOrder(updated)
  }, [orders, selectedOrderId])

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    const ok = await updateOrderStatus(orderId, newStatus)
    if (ok) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus, updated_at: new Date().toISOString() } : order,
        ),
      )
    }
  }

  const visibleOrders = statusFilter ? orders.filter((order) => order.status === statusFilter) : orders

  return (
    <div>
      <OrdersList
        orders={visibleOrders}
        loading={loading}
        refreshing={refreshing}
        lastSyncedAt={lastSyncedAt}
        statusFilter={statusFilter}
        onRefresh={() => void loadOrders()}
        onSelectOrder={setSelectedOrder}
      />

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
