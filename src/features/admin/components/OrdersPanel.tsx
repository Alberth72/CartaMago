import { useCallback, useEffect, useState } from 'react'
import {
  fetchOrders,
  subscribeToOrderChanges,
  updateOrderStatus,
} from '../repositories/adminOrderRepository'
import { fetchAdminScope } from '../repositories/adminScopeRepository'
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
  const [statusMessage, setStatusMessage] = useState('')
  const selectedOrderId = selectedOrder?.id

  const loadOrders = useCallback(async (showInitialLoading = false) => {
    if (showInitialLoading) setLoading(true)
    setRefreshing(true)
    setStatusMessage('')
    try {
      const scope = await fetchAdminScope()
      if (!scope.primaryBranchId) {
        setOrders([])
        setStatusMessage('Este usuario gestiona bodega y no tiene una sede asignada para pedidos.')
        return
      }

      const data = await fetchOrders(scope.primaryBranchId)
      setOrders(data)
      setLastSyncedAt(new Date().toISOString())
    } catch (error) {
      setOrders([])
      setStatusMessage(error instanceof Error ? error.message : 'No se pudieron cargar los pedidos.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
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
    let unsubscribe: (() => void) | null = null
    let cancelled = false

    fetchAdminScope()
      .then((scope) => {
        if (cancelled || !scope.primaryBranchId) return
        unsubscribe = subscribeToOrderChanges(scope.primaryBranchId, () => void loadOrders())
      })
      .catch((error) => {
        if (cancelled) return
        setStatusMessage(error instanceof Error ? error.message : 'No se pudo activar la sincronizacion de pedidos.')
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
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
      {statusMessage ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {statusMessage}
        </p>
      ) : null}

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
