import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ClipboardList, Clock, ExternalLink, Flame, MapPin, Package, RefreshCw, StickyNote, Timer, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { formatCurrency } from '../../lib/format'
import { getSupabaseConfig } from '../../services/menuRepository'
import { fulfillmentIcons, fulfillmentLabels, statusColors, statusLabels } from '../admin/orderUi'
import { paymentMethodLabels, type PaymentMethod } from '../order/payment'
import type { OrderStatus, OrderWithItems } from '../order/types'
import { fetchTrackableOrders, subscribeToTrackableOrderChanges } from './orderTrackingRepository'
import { formatLiveTime, formatShortOrderId, isActiveKitchenOrder, trackingStatusCopy } from './trackingUi'

const displayColumns: Array<{ status: OrderStatus; title: string; tone: string }> = [
  { status: 'pending', title: 'Recibidos', tone: 'border-amber-200 bg-amber-50/70' },
  { status: 'confirmed', title: 'Confirmados', tone: 'border-blue-200 bg-blue-50/70' },
  { status: 'preparing', title: 'En cocina', tone: 'border-purple-200 bg-purple-50/70' },
  { status: 'ready', title: 'Listos', tone: 'border-emerald-200 bg-emerald-50/70' },
]

export function KitchenDisplayPage() {
  const { branchId } = getSupabaseConfig()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    const nextOrders = await fetchTrackableOrders(branchId)
    setOrders(nextOrders.filter(isActiveKitchenOrder))
    setLastSyncedAt(new Date().toISOString())
    setLoading(false)
  }, [branchId])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const intervalId = window.setInterval(() => void loadOrders(), 10000)
    const unsubscribe = subscribeToTrackableOrderChanges(branchId, () => void loadOrders())

    return () => {
      window.clearInterval(intervalId)
      unsubscribe?.()
    }
  }, [loadOrders, branchId])

  const groupedOrders = useMemo(() => {
    const groups = new Map<OrderStatus, OrderWithItems[]>()
    for (const column of displayColumns) groups.set(column.status, [])

    for (const order of orders) {
      const list = groups.get(order.status) ?? []
      list.push(order)
      groups.set(order.status, list)
    }

    return groups
  }, [orders])

  return (
    <main className="min-h-screen bg-[#fff8ed] p-4 text-stone-950">
      <Helmet>
        <title>Cocina en vivo | CartaMago</title>
      </Helmet>
      <div className="mx-auto grid max-w-[1600px] gap-4">
        <header className="overflow-hidden rounded-xl border border-amber-200 bg-stone-950 text-white shadow-xl shadow-red-950/10">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-red-950">
                <ClipboardList size={23} />
              </span>
              <div>
                <p className="text-sm font-black uppercase text-amber-100">Operacion de cocina</p>
                <h1 className="text-3xl font-black tracking-normal">Cocina en vivo</h1>
                <p className="mt-1 text-sm font-bold text-stone-300">
                  {lastSyncedAt ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString('es-CO')}` : 'Esperando sincronizacion'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-black">
                <Flame size={16} className="text-amber-200" />
                {orders.length} activos
              </span>
              <Link
                to="/admin"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-black transition hover:-translate-y-0.5 hover:bg-white/15 active:translate-y-0"
              >
                <ExternalLink size={16} />
                Admin
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid min-h-[55vh] place-items-center rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10">
            <div className="flex items-center gap-3 text-sm font-black text-stone-600">
              <RefreshCw size={22} className="animate-spin text-red-900" />
              Cargando pantalla...
            </div>
          </div>
        ) : (
          <section className="grid gap-3 xl:grid-cols-4">
            {displayColumns.map((column) => {
              const columnOrders = groupedOrders.get(column.status) ?? []

              return (
                <div key={column.status} className={`rounded-xl border p-3 shadow-lg shadow-amber-900/5 ${column.tone}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{column.title}</h2>
                      <p className="text-sm font-bold text-stone-500">{columnOrders.length} pedidos</p>
                    </div>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-black ${statusColors[column.status]}`}>
                      {statusLabels[column.status]}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {columnOrders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-5 text-center text-sm font-bold leading-6 text-stone-400">
                        Sin pedidos en este estado.
                      </div>
                    ) : null}
                    {columnOrders.map((order) => (
                      <KitchenOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}

function KitchenOrderCard({ order }: { order: OrderWithItems }) {
  const FulfillmentIcon = fulfillmentIcons[order.fulfillment_mode] ?? Package
  const paymentMethod = (order.payment_method ?? 'cash') as PaymentMethod
  const firstItems = order.items.slice(0, 3).map((item) => `${item.quantity}x ${item.product_name}`)
  const extraItems = Math.max(0, order.items.length - firstItems.length)

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-md shadow-stone-900/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-stone-400">Pedido {formatShortOrderId(order.id)}</p>
          <h3 className="mt-1 text-xl font-black text-stone-950">{order.customer_name || trackingStatusCopy[order.status].label}</h3>
        </div>
        <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-sm font-black text-stone-700">
          {formatLiveTime(order.created_at)}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 p-3">
        <p className="flex items-center gap-2 text-xs font-black uppercase text-amber-900">
          <StickyNote size={13} />
          Notas de preparacion
        </p>
        <p className="mt-1 text-sm font-bold leading-6 text-stone-700">
          {getKitchenNote(order)}
        </p>
      </div>

      <ul className="mt-3 grid gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-black text-stone-900">{item.quantity}x {item.product_name}</p>
              <span className="text-xs font-black text-stone-500">
                {item.unit_price_cop != null ? formatCurrency(item.unit_price_cop * item.quantity) : '--'}
              </span>
            </div>
            {item.line_note ? (
              <p className="mt-1 text-xs font-bold leading-5 text-red-900">Nota: {item.line_note}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {extraItems > 0 ? (
        <p className="mt-2 text-xs font-bold text-stone-400">{firstItems.join(' / ')} / +{extraItems} mas</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <DisplayMetric icon={FulfillmentIcon} label="Entrega" value={fulfillmentLabels[order.fulfillment_mode] ?? order.fulfillment_mode} />
        <DisplayMetric icon={Wallet} label="Pago" value={paymentMethodLabels[paymentMethod] ?? 'Por definir'} />
        <DisplayMetric icon={Timer} label="Tiempo" value={formatLiveTime(order.created_at)} />
        <DisplayMetric icon={Package} label="Total" value={formatCurrency(order.total_cop)} />
        {getFulfillmentDetail(order) ? (
          <DisplayMetric icon={MapPin} label="Detalle" value={getFulfillmentDetail(order)} />
        ) : null}
        <DisplayMetric icon={Clock} label="Hora" value={new Date(order.created_at).toLocaleTimeString('es-CO')} />
      </div>
    </article>
  )
}

function getKitchenNote(order: OrderWithItems) {
  if (order.customer_note?.trim()) return order.customer_note
  const lineNotes = order.items
    .filter((item) => item.line_note?.trim())
    .map((item) => `${item.product_name}: ${item.line_note}`)

  return lineNotes.length > 0 ? lineNotes.join(' / ') : 'Sin notas especiales.'
}

function getFulfillmentDetail(order: OrderWithItems) {
  if (order.fulfillment_mode === 'table' && order.table_number) return `Mesa ${order.table_number}`
  if ((order.fulfillment_mode === 'local_delivery' || order.fulfillment_mode === 'delivery') && order.delivery_address) {
    return order.delivery_address
  }
  if (order.fulfillment_mode === 'pickup') return 'Mostrador'
  return ''
}

type DisplayMetricProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}

function DisplayMetric({ icon: Icon, label, value }: DisplayMetricProps) {
  return (
    <div className="rounded-lg bg-stone-50 p-2">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase text-stone-400">
        <Icon size={12} />
        {label}
      </p>
      <p className="mt-1 truncate font-black text-stone-800">{value}</p>
    </div>
  )
}
