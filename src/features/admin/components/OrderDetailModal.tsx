import React from 'react'
import { Clock, ExternalLink, Package, Send, User, X } from 'lucide-react'
import type { OrderStatus, OrderWithItems } from '../../order/types'
import {
  formatElapsedTime,
  fulfillmentIcons,
  fulfillmentLabels,
  getDeliveryConfirmationCopy,
  getOrderAgeColor,
  getNextActions,
  statusColors,
  statusLabels,
} from '../orderUi'

type OrderDetailModalProps = {
  order: OrderWithItems
  onClose: () => void
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
}

export function OrderDetailModal({ order, onClose, onStatusChange }: OrderDetailModalProps) {
  const status = order.status as OrderStatus
  const FulfillmentIcon = fulfillmentIcons[order.fulfillment_mode] ?? Package

  return (
    <div
      data-testid="order-detail-modal"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-20"
    >
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs font-mono text-stone-400">#{order.id.slice(-8)}</p>
            <p className="text-lg font-black">Detalle del pedido</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-md text-stone-500 hover:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center justify-between">
            <span className={`rounded-full border px-3 py-1 text-sm font-black ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${getOrderAgeColor(order)}`}>
              <Clock size={13} />
              {formatElapsedTime(order.created_at)}
            </span>
          </div>
          <p className="text-right text-xs text-stone-400">
            Creado {new Date(order.created_at).toLocaleString('es-CO')}
          </p>

          <div className="space-y-2 rounded-md bg-stone-50 p-4 text-sm">
            <div className="flex items-center gap-2">
              <User size={14} className="text-stone-400" />
              <span className="font-black">{order.customer_name || 'Sin nombre'}</span>
            </div>
            <div className="flex items-center gap-2">
              {React.createElement(FulfillmentIcon, {
                size: 14,
                className: 'text-stone-400',
              })}
              <span className="font-medium">{fulfillmentLabels[order.fulfillment_mode]}</span>
              {(order.fulfillment_mode === 'delivery' || order.fulfillment_mode === 'local_delivery' || order.fulfillment_mode === 'didi_food') && order.delivery_address && (
                <span className="text-stone-500">- {order.delivery_address}</span>
              )}
              {order.fulfillment_mode === 'table' && order.table_number && (
                <span className="text-stone-500">- Mesa {order.table_number}</span>
              )}
            </div>
            {order.customer_note && (
              <div className="flex items-start gap-2">
                <span className="text-stone-400">Nota:</span>
                <span className="text-stone-600">{order.customer_note}</span>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-stone-700">Productos</p>
            <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {item.quantity} x {item.product_name}
                    </p>
                    {item.line_note && <p className="text-xs text-stone-500">{item.line_note}</p>}
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
            <span className="font-black">{order.total_items}</span>
          </div>
          {order.total_cop > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-stone-500">Total estimado</span>
              <span className="text-lg font-black">${order.total_cop.toLocaleString('es-CO')}</span>
            </div>
          )}

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-black">Confirmacion de entrega</p>
            <p className="mt-1 text-xs leading-relaxed">{getDeliveryConfirmationCopy(order)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {getNextActions(status).map((action) => (
              <button
                key={action.to}
                type="button"
                onClick={() => onStatusChange(order.id, action.to)}
                className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-black text-white shadow-sm ${action.color}`}
              >
                <Send size={14} />
                {action.label}
              </button>
            ))}
            {order.whatsapp_link && (
              <a
                href={order.whatsapp_link}
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
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-stone-700">
              {order.whatsapp_message || '--'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
