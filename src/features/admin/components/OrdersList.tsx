import React from 'react'
import { Clock, Package, RefreshCw } from 'lucide-react'
import type { OrderStatus, OrderWithItems } from '../../order/types'
import {
  formatElapsedTime,
  fulfillmentIcons,
  fulfillmentLabels,
  getOrderAgeColor,
  statusColors,
  statusLabels,
} from '../orderUi'

type OrdersListProps = {
  orders: OrderWithItems[]
  loading: boolean
  refreshing: boolean
  lastSyncedAt: string | null
  statusFilter?: OrderStatus
  onRefresh: () => void
  onSelectOrder: (order: OrderWithItems) => void
}

export function OrdersList({
  orders,
  loading,
  refreshing,
  lastSyncedAt,
  statusFilter,
  onRefresh,
  onSelectOrder,
}: OrdersListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-500">
        <RefreshCw size={24} className="animate-spin" />
        <span className="ml-3 text-sm font-bold">Cargando pedidos...</span>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <>
        <OrdersToolbar
          count={orders.length}
          refreshing={refreshing}
          lastSyncedAt={lastSyncedAt}
          onRefresh={onRefresh}
        />
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Package size={48} strokeWidth={1} />
          <p className="mt-4 text-sm font-bold">No hay pedidos {statusFilter ? 'en este estado' : 'aun'}.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <OrdersToolbar
        count={orders.length}
        refreshing={refreshing}
        lastSyncedAt={lastSyncedAt}
        onRefresh={onRefresh}
      />
      <ul className="space-y-3">
        {orders.map((order) => {
          const status = order.status as OrderStatus
          const FulfillmentIcon = fulfillmentIcons[order.fulfillment_mode] ?? Package

          return (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => onSelectOrder(order)}
                className="w-full rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-stone-400">{order.id.slice(-8)}</span>
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-black ${statusColors[status]}`}>
                        {statusLabels[status]}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-black ${getOrderAgeColor(order)}`}>
                        <Clock size={12} />
                        {formatElapsedTime(order.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-black">{order.customer_name || 'Sin nombre'}</p>
                    <p className="text-xs text-stone-500">
                      {order.total_items} productos &middot; {new Date(order.created_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {React.createElement(FulfillmentIcon, {
                      size: 16,
                      className: 'text-stone-400',
                    })}
                    <span className="text-xs font-bold text-stone-500">
                      {fulfillmentLabels[order.fulfillment_mode] ?? order.fulfillment_mode}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

type OrdersToolbarProps = {
  count: number
  refreshing: boolean
  lastSyncedAt: string | null
  onRefresh: () => void
}

function OrdersToolbar({ count, refreshing, lastSyncedAt, onRefresh }: OrdersToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="text-sm font-black text-stone-800">{count} pedidos en bandeja</p>
        <p className="text-xs text-stone-500">
          {lastSyncedAt ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString('es-CO')}` : 'Esperando sincronizacion'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-xs font-black text-stone-700 hover:bg-stone-50"
      >
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        Actualizar
      </button>
    </div>
  )
}
