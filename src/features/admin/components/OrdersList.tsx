import React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  ReceiptText,
  RefreshCw,
  TimerReset,
  Wallet,
} from 'lucide-react'
import { formatCurrency } from '../../../lib/format'
import {
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
  getElapsedMinutes,
  getOrderAgeColor,
  statusColors,
  statusLabels,
} from '../orderUi'

const statusAccent: Record<OrderStatus, string> = {
  pending: 'border-l-amber-500',
  confirmed: 'border-l-blue-500',
  preparing: 'border-l-purple-500',
  ready: 'border-l-emerald-500',
  delivered: 'border-l-stone-300',
  cancelled: 'border-l-red-500',
}

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
          orders={orders}
          refreshing={refreshing}
          lastSyncedAt={lastSyncedAt}
          onRefresh={onRefresh}
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/70 py-20 text-stone-400">
          <Package size={48} strokeWidth={1} />
          <p className="mt-4 text-sm font-bold">No hay pedidos {statusFilter ? 'en este estado' : 'aun'}.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <OrdersToolbar
        orders={orders}
        refreshing={refreshing}
        lastSyncedAt={lastSyncedAt}
        onRefresh={onRefresh}
      />
      <ul className="grid gap-3">
        {orders.map((order) => {
          const status = order.status as OrderStatus
          const paymentStatus = (order.payment_status ?? 'pending') as PaymentStatus
          const FulfillmentIcon = fulfillmentIcons[order.fulfillment_mode] ?? Package
          const firstItems = order.items.slice(0, 2).map((item) => `${item.quantity}x ${item.product_name}`)
          const extraItems = Math.max(0, order.items.length - firstItems.length)

          return (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => onSelectOrder(order)}
                className={`group relative w-full overflow-hidden rounded-xl border border-l-4 border-stone-200 bg-white p-3 text-left shadow-lg shadow-amber-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/20 hover:shadow-xl hover:shadow-red-900/10 active:translate-y-0 ${statusAccent[status]}`}
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-black ${statusColors[status]}`}>
                        {statusLabels[status]}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-black ${getOrderAgeColor(order)}`}>
                        <Clock size={12} />
                        {formatElapsedTime(order.created_at)}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-black ${paymentStatusColors[paymentStatus] ?? paymentStatusColors.pending}`}>
                        <Wallet size={12} />
                        {formatPaymentStatus(order.payment_status)}
                      </span>
                    </div>

                    <div className="grid gap-1">
                      <p className="truncate text-lg font-black text-stone-950">{order.customer_name || 'Sin nombre'}</p>
                      <p className="text-xs font-bold text-stone-400">
                        {new Date(order.created_at).toLocaleString('es-CO')}
                      </p>
                    </div>

                    <p className="line-clamp-2 text-sm leading-6 text-stone-600">
                      {firstItems.join(' / ')}
                      {extraItems > 0 ? ` / +${extraItems} mas` : ''}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 font-black text-stone-600">
                        {React.createElement(FulfillmentIcon, {
                          size: 16,
                          className: 'text-stone-400',
                        })}
                        {fulfillmentLabels[order.fulfillment_mode] ?? order.fulfillment_mode}
                      </span>
                      <span className="font-black text-stone-950">{formatCurrency(order.total_cop)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Metric label="Items" value={String(order.total_items)} />
                      <Metric label="Canal" value={formatOrderChannel(order.order_channel)} />
                      <Metric label="Pago" value={formatPaymentMethod(order.payment_method)} />
                      <Metric label="Accion" value="Abrir" icon={ChevronRight} />
                    </div>
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
  orders: OrderWithItems[]
  refreshing: boolean
  lastSyncedAt: string | null
  onRefresh: () => void
}

function OrdersToolbar({ orders, refreshing, lastSyncedAt, onRefresh }: OrdersToolbarProps) {
  const activeCount = orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled').length
  const urgentCount = orders.filter(
    (order) =>
      order.status !== 'delivered' &&
      order.status !== 'cancelled' &&
      getElapsedMinutes(order.created_at) >= 30,
  ).length
  const pendingPaymentCount = orders.filter((order) => order.payment_status === 'pending').length
  const readyCount = orders.filter((order) => order.status === 'ready').length

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-900 text-white shadow-md shadow-red-900/20">
            <ReceiptText size={20} />
          </span>
          <div>
            <p className="text-lg font-black text-stone-950">{orders.length} pedidos en bandeja</p>
            <p className="text-sm font-bold text-stone-500">
              {lastSyncedAt ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString('es-CO')}` : 'Esperando sincronizacion'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-50 active:translate-y-0"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={TimerReset} label="Activos" value={String(activeCount)} tone="bg-blue-50 text-blue-900 border-blue-100" />
        <SummaryCard icon={AlertTriangle} label="Urgentes" value={String(urgentCount)} tone="bg-red-50 text-red-900 border-red-100" />
        <SummaryCard icon={Wallet} label="Pagos pendientes" value={String(pendingPaymentCount)} tone="bg-amber-50 text-amber-900 border-amber-100" />
        <SummaryCard icon={CheckCircle2} label="Listos" value={String(readyCount)} tone="bg-emerald-50 text-emerald-900 border-emerald-100" />
      </div>
    </div>
  )
}

type SummaryCardProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  tone: string
}

function SummaryCard({ icon: Icon, label, value, tone }: SummaryCardProps) {
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-white/80">
          <Icon size={17} />
        </span>
        <span className="text-2xl font-black">{value}</span>
      </div>
      <p className="mt-2 text-xs font-black uppercase">{label}</p>
    </div>
  )
}

type MetricProps = {
  label: string
  value: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

function Metric({ label, value, icon: Icon }: MetricProps) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5">
      <p className="text-[11px] font-bold uppercase text-stone-400">{label}</p>
      <p className="flex items-center gap-1 truncate text-xs font-black text-stone-700">
        {Icon ? <Icon size={12} className="shrink-0 text-stone-400" /> : null}
        {value}
      </p>
    </div>
  )
}

function formatOrderChannel(channel: string | undefined) {
  if (channel === 'didi_food') return 'DiDi'
  if (channel === 'whatsapp') return 'WhatsApp'
  return 'CartaMago'
}

function formatPaymentMethod(method: string | undefined) {
  return paymentMethodLabels[method as PaymentMethod] ?? 'Por definir'
}

function formatPaymentStatus(status: string | undefined) {
  return paymentStatusLabels[status as PaymentStatus] ?? 'Pendiente'
}
