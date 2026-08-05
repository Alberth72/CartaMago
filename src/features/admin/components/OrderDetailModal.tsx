import React from 'react'
import {
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Send,
  StickyNote,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { formatCurrency } from '../../../lib/format'
import {
  paymentMethodHelp,
  paymentMethodLabels,
  paymentStatusColors,
  paymentStatusLabels,
  type PaymentMethod,
  type PaymentStatus,
} from '../../order/payment'
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
  const paymentMethod = (order.payment_method ?? 'cash') as PaymentMethod
  const paymentStatus = (order.payment_status ?? 'pending') as PaymentStatus
  const customerNotification = buildCustomerNotification(order)
  const customerWhatsAppLink = buildCustomerWhatsAppLink(order.customer_phone, customerNotification)

  return (
    <div
      data-testid="order-detail-modal"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-3 pt-6 pb-16"
    >
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-stone-400">Pedido en operacion</p>
            <p className="text-xl font-black text-stone-950">Detalle del pedido</p>
            <p className="mt-1 text-sm text-stone-500">
              Creado {new Date(order.created_at).toLocaleString('es-CO')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100"
            aria-label="Cerrar detalle del pedido"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <section className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`rounded-md border px-3 py-1.5 text-sm font-black ${statusColors[status]}`}>
                  {statusLabels[status]}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-black ${getOrderAgeColor(order)}`}>
                  <Clock size={13} />
                  {formatElapsedTime(order.created_at)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoLine icon={User} label="Cliente" value={order.customer_name || 'Sin nombre'} />
                <InfoLine icon={Phone} label="Telefono" value={order.customer_phone || 'Sin telefono'} />
                <InfoLine
                  icon={FulfillmentIcon}
                  label="Entrega"
                  value={formatFulfillmentDetail(order)}
                  className="sm:col-span-2"
                />
                <InfoLine
                  icon={Wallet}
                  label="Pago"
                  value={`${paymentMethodLabels[paymentMethod] ?? 'Por definir'} - ${paymentStatusLabels[paymentStatus] ?? 'Pendiente'}`}
                  className="sm:col-span-2"
                />
                {order.delivery_address ? (
                  <InfoLine icon={MapPin} label="Direccion" value={order.delivery_address} className="sm:col-span-2" />
                ) : null}
                {order.customer_note ? (
                  <InfoLine icon={StickyNote} label="Nota" value={order.customer_note} className="sm:col-span-2" />
                ) : null}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-stone-800">Productos</p>
                <span className="text-xs font-bold text-stone-500">{order.total_items} items</span>
              </div>
              <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
                {order.items.map((item) => (
                  <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900">
                        {item.quantity} x {item.product_name}
                      </p>
                      {item.line_note ? <p className="mt-1 text-xs text-stone-500">{item.line_note}</p> : null}
                    </div>
                    <span className="font-black text-stone-700">
                      {item.unit_price_cop != null ? formatCurrency(item.unit_price_cop * item.quantity) : '--'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="text-sm font-black text-stone-800">Mensaje original del pedido</p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-stone-50 p-3 text-xs leading-relaxed text-stone-700">
                {order.whatsapp_message || '--'}
              </pre>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-stone-400">Resumen</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-stone-500">Tipo</span>
                  <span className="inline-flex items-center gap-2 text-sm font-black text-stone-800">
                    {React.createElement(FulfillmentIcon, {
                      size: 15,
                      className: 'text-stone-400',
                    })}
                    {fulfillmentLabels[order.fulfillment_mode] ?? order.fulfillment_mode}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-stone-500">Total</span>
                  <span className="text-xl font-black text-stone-950">{formatCurrency(order.total_cop)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-stone-400">Pago</p>
                <span className={`rounded-md border px-2 py-1 text-xs font-black ${paymentStatusColors[paymentStatus] ?? paymentStatusColors.pending}`}>
                  {paymentStatusLabels[paymentStatus] ?? 'Pendiente'}
                </span>
              </div>
              <p className="mt-2 text-sm font-black text-stone-900">
                {paymentMethodLabels[paymentMethod] ?? 'Por definir'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                {paymentMethodHelp[paymentMethod] ?? 'El local debe confirmar el medio de pago.'}
              </p>
              {paymentMethod === 'wompi' ? (
                <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-900">
                  Camino feliz Wompi: crear referencia unica, generar firma en backend, abrir checkout y confirmar por webhook.
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <p className="font-black">Confirmacion de entrega</p>
              <p className="mt-1 text-xs leading-relaxed">{getDeliveryConfirmationCopy(order)}</p>
            </section>

            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <MessageCircle size={17} className="mt-0.5 text-emerald-700" />
                <div>
                  <p className="font-black text-emerald-950">Notificacion al cliente</p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                    Mensaje sugerido para que el cliente final vea el avance del pedido.
                  </p>
                </div>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-white/80 p-3 text-xs leading-relaxed text-stone-700">
                {customerNotification}
              </pre>
              {customerWhatsAppLink ? (
                <a
                  href={customerWhatsAppLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800"
                >
                  <ExternalLink size={14} />
                  Enviar actualizacion
                </a>
              ) : (
                <p className="mt-3 rounded-md bg-white/80 p-3 text-xs font-bold text-stone-500">
                  Agrega el telefono del cliente para enviar esta actualizacion por WhatsApp.
                </p>
              )}
            </section>

            <section className="space-y-2">
              {getNextActions(status).map((action) => (
                <button
                  key={action.to}
                  type="button"
                  onClick={() => onStatusChange(order.id, action.to)}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-xs font-black text-white shadow-sm ${action.color}`}
                >
                  <Send size={14} />
                  {action.label}
                </button>
              ))}
              {order.whatsapp_link ? (
                <a
                  href={order.whatsapp_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-600 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                >
                  <ExternalLink size={14} />
                  Ver pedido en WhatsApp
                </a>
              ) : null}
              <a
                href={`/tracking/${order.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-stone-300 px-4 py-2.5 text-xs font-black text-stone-700 hover:bg-stone-50"
              >
                <ExternalLink size={14} />
                Ver rastreo cliente
              </a>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

type InfoLineProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  className?: string
}

function InfoLine({ icon: Icon, label, value, className = '' }: InfoLineProps) {
  return (
    <div className={`flex min-w-0 items-start gap-2 rounded-md bg-white p-3 ${className}`}>
      <Icon size={15} className="mt-0.5 shrink-0 text-stone-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase text-stone-400">{label}</p>
        <p className="break-words text-sm font-black text-stone-800">{value}</p>
      </div>
    </div>
  )
}

function formatFulfillmentDetail(order: OrderWithItems) {
  const label = fulfillmentLabels[order.fulfillment_mode] ?? order.fulfillment_mode
  if (order.fulfillment_mode === 'table' && order.table_number) return `${label} ${order.table_number}`
  return label
}

function buildCustomerNotification(order: OrderWithItems) {
  const customer = order.customer_name?.trim() || 'Hola'
  const fulfillment = fulfillmentLabels[order.fulfillment_mode] ?? 'pedido'
  const total = order.total_cop > 0 ? `\nTotal: ${formatCurrency(order.total_cop)}` : ''

  const messages: Record<OrderStatus, string> = {
    pending: `${customer}, recibimos tu pedido para ${fulfillment}. En breve el local lo confirma.${total}`,
    confirmed: `${customer}, tu pedido fue confirmado. Ya estamos coordinando la preparacion.${total}`,
    preparing: `${customer}, tu pedido ya esta en preparacion. Te avisamos cuando este listo.${total}`,
    ready: `${customer}, tu pedido esta listo. ${getReadyDetail(order)}${total}`,
    delivered: `${customer}, tu pedido fue entregado. Gracias por comprar con nosotros.`,
    cancelled: `${customer}, tuvimos que cancelar tu pedido. Por favor comunicate con el local para revisarlo.`,
  }

  return messages[order.status as OrderStatus]
}

function getReadyDetail(order: OrderWithItems) {
  switch (order.fulfillment_mode) {
    case 'pickup':
      return 'Puedes pasar a recogerlo.'
    case 'local_delivery':
    case 'delivery':
      return 'Saldra a domicilio en los proximos minutos.'
    case 'table':
      return order.table_number ? `Lo llevamos a la mesa ${order.table_number}.` : 'Lo llevamos a tu mesa.'
    case 'didi_food':
      return 'Lo entregaremos al repartidor de DiDiFood.'
    default:
      return 'Ya puedes recibirlo.'
  }
}

function buildCustomerWhatsAppLink(phone: string | undefined, message: string) {
  const digits = phone?.replace(/\D/g, '') ?? ''
  const normalizedPhone = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits

  if (normalizedPhone.length < 11 || normalizedPhone.length > 15) return null

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
}
