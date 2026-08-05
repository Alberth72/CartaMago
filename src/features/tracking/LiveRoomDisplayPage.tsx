import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { CheckCircle2, Clock, Flame, PackageCheck, RefreshCw, ScreenShare } from 'lucide-react'
import { getSupabaseConfig } from '../../services/menuRepository'
import { fulfillmentIcons, fulfillmentLabels, statusLabels } from '../admin/orderUi'
import type { OrderStatus, OrderWithItems } from '../order/types'
import { fetchTrackableOrders, subscribeToTrackableOrderChanges } from './orderTrackingRepository'
import { formatLiveTime, formatShortOrderId, isActiveKitchenOrder } from './trackingUi'

const roomStatuses: OrderStatus[] = ['confirmed', 'preparing', 'ready']

export function LiveRoomDisplayPage() {
  const { restaurantId } = getSupabaseConfig()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    const nextOrders = await fetchTrackableOrders(restaurantId)
    setOrders(nextOrders.filter((order) => isActiveKitchenOrder(order) && roomStatuses.includes(order.status)))
    setLastSyncedAt(new Date().toISOString())
    setLoading(false)
  }, [restaurantId])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const intervalId = window.setInterval(() => void loadOrders(), 10000)
    const unsubscribe = subscribeToTrackableOrderChanges(restaurantId, () => void loadOrders())

    return () => {
      window.clearInterval(intervalId)
      unsubscribe?.()
    }
  }, [loadOrders, restaurantId])

  const readyOrders = useMemo(() => orders.filter((order) => order.status === 'ready'), [orders])
  const workingOrders = useMemo(() => orders.filter((order) => order.status !== 'ready'), [orders])

  return (
    <main className="min-h-screen bg-[#fff8ed] p-5 text-stone-950">
      <Helmet>
        <title>Sala en vivo | CartaMago</title>
      </Helmet>
      <div className="mx-auto grid max-w-[1500px] gap-5">
        <header className="overflow-hidden rounded-2xl border border-amber-200 bg-stone-950 text-white shadow-xl shadow-red-950/10">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-100 text-red-950">
                <ScreenShare size={26} />
              </span>
              <div>
                <p className="text-sm font-black uppercase text-amber-100">Sala en vivo</p>
                <h1 className="text-4xl font-black tracking-normal">Pedidos en preparacion</h1>
                <p className="mt-1 text-sm font-bold text-stone-300">
                  {lastSyncedAt ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString('es-CO')}` : 'Esperando sincronizacion'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-right">
              <p className="text-3xl font-black">{orders.length}</p>
              <p className="text-xs font-black uppercase text-amber-100">Pedidos visibles</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid min-h-[55vh] place-items-center rounded-2xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10">
            <div className="flex items-center gap-3 text-sm font-black text-stone-600">
              <RefreshCw size={22} className="animate-spin text-red-900" />
              Cargando sala...
            </div>
          </div>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xl shadow-amber-900/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">En proceso</h2>
                  <p className="text-sm font-bold text-stone-500">Pedidos confirmados y en cocina</p>
                </div>
                <Flame className="text-red-900" size={28} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {workingOrders.length === 0 ? (
                  <EmptyRoomState label="No hay pedidos en preparacion." />
                ) : null}
                {workingOrders.map((order) => (
                  <RoomOrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xl shadow-emerald-900/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-emerald-950">Listos</h2>
                  <p className="text-sm font-bold text-emerald-800">Recoge, sirve o entrega</p>
                </div>
                <PackageCheck className="text-emerald-800" size={28} />
              </div>
              <div className="grid gap-3">
                {readyOrders.length === 0 ? (
                  <EmptyRoomState label="Aun no hay pedidos listos." />
                ) : null}
                {readyOrders.map((order) => (
                  <RoomOrderCard key={order.id} order={order} prominent />
                ))}
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  )
}

function RoomOrderCard({ order, prominent = false }: { order: OrderWithItems; prominent?: boolean }) {
  const FulfillmentIcon = fulfillmentIcons[order.fulfillment_mode] ?? Clock
  const displayName = getPublicOrderName(order)

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-md shadow-stone-900/5 ${
      prominent ? 'border-emerald-300' : 'border-stone-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-stone-400">Pedido {formatShortOrderId(order.id)}</p>
          <h3 className="mt-1 text-2xl font-black text-stone-950">{displayName}</h3>
        </div>
        {order.status === 'ready' ? (
          <CheckCircle2 className="shrink-0 text-emerald-700" size={28} />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <RoomMetric icon={FulfillmentIcon} label="Entrega" value={fulfillmentLabels[order.fulfillment_mode] ?? order.fulfillment_mode} />
        <RoomMetric icon={Clock} label="Tiempo" value={formatLiveTime(order.created_at)} />
      </div>

      <div className={`mt-4 rounded-xl border px-3 py-2 text-sm font-black ${
        order.status === 'ready'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}>
        {statusLabels[order.status]}
      </div>
    </article>
  )
}

function getPublicOrderName(order: OrderWithItems) {
  if (order.fulfillment_mode === 'table' && order.table_number) return `Mesa ${order.table_number}`
  if (order.fulfillment_mode === 'pickup') return order.customer_name || `Pedido ${formatShortOrderId(order.id)}`
  return `Pedido ${formatShortOrderId(order.id)}`
}

type RoomMetricProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}

function RoomMetric({ icon: Icon, label, value }: RoomMetricProps) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase text-stone-400">
        <Icon size={13} />
        {label}
      </p>
      <p className="mt-1 truncate font-black text-stone-800">{value}</p>
    </div>
  )
}

function EmptyRoomState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-6 text-center text-sm font-bold leading-6 text-stone-400 md:col-span-2">
      {label}
    </div>
  )
}
