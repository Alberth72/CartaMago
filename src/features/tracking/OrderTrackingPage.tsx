import React, { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Package, RefreshCw, User, Wallet } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { formatCurrency } from '../../lib/format'
import { getSupabaseConfig } from '../../services/menuRepository'
import { fulfillmentIcons, fulfillmentLabels } from '../admin/orderUi'
import { paymentMethodLabels, paymentStatusLabels, type PaymentMethod, type PaymentStatus } from '../order/payment'
import type { OrderWithItems } from '../order/types'
import { fetchTrackableOrder, subscribeToTrackableOrderChanges } from './orderTrackingRepository'
import {
  formatLiveTime,
  formatShortOrderId,
  getStepState,
  trackingStatusCopy,
  trackingStatusIcon,
  trackingStatusTone,
  trackingSteps,
} from './trackingUi'

export function OrderTrackingPage() {
  const { orderId = '' } = useParams()
  const { branchId } = getSupabaseConfig()
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false)
      return
    }

    const nextOrder = await fetchTrackableOrder(branchId, orderId)
    setOrder(nextOrder)
    setLastSyncedAt(new Date().toISOString())
    setLoading(false)
  }, [orderId, branchId])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  useEffect(() => {
    const intervalId = window.setInterval(() => void loadOrder(), 10000)
    const unsubscribe = subscribeToTrackableOrderChanges(branchId, () => void loadOrder())

    return () => {
      window.clearInterval(intervalId)
      unsubscribe?.()
    }
  }, [loadOrder, branchId])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ed] px-4 text-stone-950">
        <Helmet>
          <title>Rastrear pedido | CartaMago</title>
        </Helmet>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white p-5 shadow-lg shadow-amber-900/10">
          <RefreshCw className="animate-spin text-red-900" size={22} />
          <span className="text-sm font-black text-stone-700">Cargando estado del pedido...</span>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ed] px-4 text-stone-950">
        <Helmet>
          <title>Pedido no encontrado | CartaMago</title>
        </Helmet>
        <section className="w-full max-w-lg rounded-xl border border-amber-200 bg-white p-5 text-center shadow-xl shadow-amber-900/10">
          <Package className="mx-auto text-stone-400" size={42} />
          <h1 className="mt-4 text-2xl font-black">Pedido no encontrado</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Revisa el enlace de rastreo o pide al local que te comparta nuevamente el estado del pedido.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-900 px-4 py-2 text-sm font-black text-white"
          >
            <ArrowLeft size={16} />
            Volver al menu
          </Link>
        </section>
      </main>
    )
  }

  const statusCopy = trackingStatusCopy[order.status]
  const StatusIcon = trackingStatusIcon[order.status]
  const FulfillmentIcon = fulfillmentIcons[order.fulfillment_mode] ?? Package
  const paymentMethod = (order.payment_method ?? 'cash') as PaymentMethod
  const paymentStatus = (order.payment_status ?? 'pending') as PaymentStatus

  return (
    <main className="min-h-screen bg-[#fff8ed] px-4 py-5 text-stone-950">
      <Helmet>
        <title>{`Rastreo ${formatShortOrderId(order.id)} | CartaMago`}</title>
      </Helmet>
      <div className="mx-auto grid max-w-5xl gap-4">
        <header className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-xl shadow-amber-900/10">
          <div className="border-b border-amber-100 bg-stone-950 px-5 py-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-amber-100">Rastreo en vivo</p>
                <h1 className="mt-1 text-3xl font-black tracking-normal">Pedido {formatShortOrderId(order.id)}</h1>
                <p className="mt-2 text-sm font-bold text-stone-300">
                  {lastSyncedAt ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString('es-CO')}` : 'Esperando actualizacion'}
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15 active:translate-y-0"
              >
                <ArrowLeft size={16} />
                Menu
              </Link>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className={`rounded-xl border p-4 ${trackingStatusTone[order.status]}`}>
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/80">
                  <StatusIcon size={23} />
                </span>
                <div>
                  <h2 className="text-2xl font-black">{statusCopy.label}</h2>
                  <p className="mt-1 text-sm font-bold leading-6">{statusCopy.description}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <InfoLine icon={User} label="Cliente" value={order.customer_name || 'Sin nombre'} />
              <InfoLine icon={Clock} label="Tiempo" value={formatLiveTime(order.created_at)} />
              <InfoLine
                icon={FulfillmentIcon}
                label="Entrega"
                value={fulfillmentLabels[order.fulfillment_mode] ?? order.fulfillment_mode}
              />
              <InfoLine
                icon={Wallet}
                label="Pago"
                value={`${paymentMethodLabels[paymentMethod] ?? 'Por definir'} / ${paymentStatusLabels[paymentStatus] ?? 'Pendiente'}`}
              />
            </section>
          </div>
        </header>

        <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-lg shadow-amber-900/10">
          <h2 className="text-lg font-black">Progreso del pedido</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {trackingSteps.map((step) => {
              const stepState = getStepState(order, step.status)

              return (
                <div
                  key={step.status}
                  className={`rounded-xl border p-3 transition ${
                    stepState === 'active'
                      ? 'border-red-900 bg-red-50 text-red-950 shadow-lg shadow-red-900/10'
                      : stepState === 'done'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-stone-200 bg-stone-50 text-stone-400'
                  }`}
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-white">
                    {stepState === 'done' ? <CheckCircle2 size={18} className="text-emerald-700" /> : <span className="text-sm font-black">{trackingSteps.indexOf(step) + 1}</span>}
                  </span>
                  <p className="mt-3 text-sm font-black">{step.label}</p>
                  <p className="mt-1 text-xs leading-5">{step.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-lg shadow-amber-900/10">
            <h2 className="text-lg font-black">Productos</h2>
            <ul className="mt-3 divide-y divide-stone-100">
              {order.items.map((item) => (
                <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm">
                  <div>
                    <p className="font-black text-stone-900">{item.quantity} x {item.product_name}</p>
                    {item.line_note ? <p className="mt-1 text-xs text-stone-500">{item.line_note}</p> : null}
                  </div>
                  <span className="font-black text-stone-700">
                    {item.unit_price_cop != null ? formatCurrency(item.unit_price_cop * item.quantity) : '--'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-xl border border-amber-200 bg-white p-5 shadow-lg shadow-amber-900/10">
            <p className="text-xs font-bold uppercase text-stone-400">Total</p>
            <p className="mt-1 text-3xl font-black text-stone-950">{formatCurrency(order.total_cop)}</p>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Esta pantalla se actualiza automaticamente cuando cocina cambia el estado.
            </p>
            {order.whatsapp_link ? (
              <a
                href={order.whatsapp_link}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-black text-emerald-700"
              >
                <ExternalLink size={16} />
                Contactar local
              </a>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  )
}

type InfoLineProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}

function InfoLine({ icon: Icon, label, value }: InfoLineProps) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase text-stone-400">
        <Icon size={13} />
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-stone-800">{value}</p>
    </div>
  )
}
