import React from 'react'
import { ExternalLink, Package, RefreshCw, Send, Truck, User, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { fetchOrders, updateOrderStatus, type OrderStatus, type OrderWithItems } from '../../../services/orderRepository'
import { getSupabaseConfig } from '../../../services/menuRepository'

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-purple-100 text-purple-800 border-purple-300',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  delivered: 'bg-stone-100 text-stone-500 border-stone-200',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

const statusActions: Array<{ from: OrderStatus[]; to: OrderStatus; label: string; color: string }> = [
  { from: ['pending'], to: 'confirmed', label: 'Confirmar', color: 'bg-blue-600 hover:bg-blue-700' },
  { from: ['confirmed'], to: 'preparing', label: 'Preparando', color: 'bg-purple-600 hover:bg-purple-700' },
  { from: ['preparing'], to: 'ready', label: 'Listo', color: 'bg-emerald-600 hover:bg-emerald-700' },
  { from: ['pending', 'confirmed', 'preparing'], to: 'cancelled', label: 'Cancelar', color: 'bg-red-600 hover:bg-red-700' },
  { from: ['ready'], to: 'delivered', label: 'Entregado', color: 'bg-stone-600 hover:bg-stone-700' },
]

function getNextActions(status: OrderStatus) {
  return statusActions.filter((a) => a.from.includes(status))
}

const fulfillmentIcons: Record<string, typeof Truck> = {
  pickup: Package,
  delivery: Truck,
  table: User,
}

const fulfillmentLabels: Record<string, string> = {
  pickup: 'Recoger',
  delivery: 'Domicilio',
  table: 'Mesa',
}

type OrdersPanelProps = {
  statusFilter?: OrderStatus
}

export function OrdersPanel({ statusFilter }: OrdersPanelProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const { restaurantId } = getSupabaseConfig()
    const data = await fetchOrders(restaurantId)
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id)
      if (updated) setSelectedOrder(updated)
    }
  }, [orders, selectedOrder?.id])

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    const ok = await updateOrderStatus(orderId, newStatus)
    if (ok) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o)),
      )
    }
  }

  const visibleOrders = statusFilter ? orders.filter((o) => o.status === statusFilter) : orders

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-500">
          <RefreshCw size={24} className="animate-spin" />
          <span className="ml-3 text-sm font-bold">Cargando pedidos...</span>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Package size={48} strokeWidth={1} />
          <p className="mt-4 text-sm font-bold">No hay pedidos {statusFilter ? 'en este estado' : 'aun'}.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleOrders.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="w-full rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-stone-400">{order.id.slice(-8)}</span>
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-black ${statusColors[order.status as OrderStatus]}`}
                      >
                        {statusLabels[order.status as OrderStatus]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-black">
                      {order.customer_name || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {order.total_items} productos &middot; {new Date(order.created_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {React.createElement(fulfillmentIcons[order.fulfillment_mode] ?? Package, {
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
          ))}
        </ul>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-20">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <p className="text-xs font-mono text-stone-400">#{selectedOrder.id.slice(-8)}</p>
                <p className="text-lg font-black">Detalle del pedido</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="grid size-9 place-items-center rounded-md text-stone-500 hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-3 py-1 text-sm font-black ${statusColors[selectedOrder.status as OrderStatus]}`}>
                  {statusLabels[selectedOrder.status as OrderStatus]}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(selectedOrder.created_at).toLocaleString('es-CO')}
                </span>
              </div>

              <div className="rounded-md bg-stone-50 p-4 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-stone-400" />
                  <span className="font-black">{selectedOrder.customer_name || 'Sin nombre'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {React.createElement(fulfillmentIcons[selectedOrder.fulfillment_mode] ?? Package, {
                    size: 14,
                    className: 'text-stone-400',
                  })}
                  <span className="font-medium">{fulfillmentLabels[selectedOrder.fulfillment_mode]}</span>
                  {selectedOrder.fulfillment_mode === 'delivery' && selectedOrder.delivery_address && (
                    <span className="text-stone-500">- {selectedOrder.delivery_address}</span>
                  )}
                  {selectedOrder.fulfillment_mode === 'table' && selectedOrder.table_number && (
                    <span className="text-stone-500">- Mesa {selectedOrder.table_number}</span>
                  )}
                </div>
                {selectedOrder.customer_note && (
                  <div className="flex items-start gap-2">
                    <span className="text-stone-400">Nota:</span>
                    <span className="text-stone-600">{selectedOrder.customer_note}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-black text-stone-700">Productos</p>
                <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {item.quantity} x {item.product_name}
                        </p>
                        {item.line_note && (
                          <p className="text-xs text-stone-500">{item.line_note}</p>
                        )}
                      </div>
                      {item.unit_price_cop != null && (
                        <span className="text-stone-600">
                          ${(item.unit_price_cop * item.quantity).toLocaleString('es-CO')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-stone-200 pt-3">
                <span className="text-sm font-bold text-stone-500">Total items</span>
                <span className="font-black">{selectedOrder.total_items}</span>
              </div>
              {selectedOrder.total_cop > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-500">Total estimado</span>
                  <span className="text-lg font-black">${selectedOrder.total_cop.toLocaleString('es-CO')}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {getNextActions(selectedOrder.status as OrderStatus).map((action) => (
                  <button
                    key={action.to}
                    type="button"
                    onClick={() => handleStatusChange(selectedOrder.id, action.to)}
                    className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-black text-white shadow-sm ${action.color}`}
                  >
                    <Send size={14} />
                    {action.label}
                  </button>
                ))}
                {selectedOrder.whatsapp_link && (
                  <a
                    href={selectedOrder.whatsapp_link}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto flex items-center gap-1.5 rounded-md border border-emerald-600 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                  >
                    <ExternalLink size={14} />
                    WhatsApp
                  </a>
                )}
              </div>

              <div className="rounded-md bg-stone-50 p-3">
                <p className="mb-1 text-xs font-bold text-stone-500">Mensaje enviado al WhatsApp:</p>
                <pre className="whitespace-pre-wrap text-xs text-stone-700 leading-relaxed">
                  {selectedOrder.whatsapp_message || '—'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
