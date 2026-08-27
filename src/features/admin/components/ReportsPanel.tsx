import { AlertTriangle, BarChart3, CreditCard, RefreshCw, ReceiptText, ShoppingCart, Store, Truck } from 'lucide-react'
import { formatCurrency } from '../../../lib/format'
import { useAdminReports } from '../hooks/useAdminReports'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Recibido',
  confirmed: 'Confirmado',
  preparing: 'En cocina',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export function ReportsPanel() {
  const { data, isLoading, status, reload } = useAdminReports()

  if (isLoading) {
    return (
      <section className="rounded-xl border border-amber-200 bg-white/80 p-5 shadow-lg shadow-amber-900/10">
        <p className="text-sm font-black text-stone-500">Cargando reportes...</p>
      </section>
    )
  }

  if (status) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-lg shadow-red-900/10">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-black text-red-900">No se pudieron cargar los reportes</h3>
            <p className="mt-1 text-sm font-bold leading-5 text-red-800">{status}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!data) return null

  const cards = [
    { label: 'Sedes', value: String(data.branchCount), icon: Store },
    { label: 'Pedidos totales', value: String(data.totalOrders), icon: ReceiptText },
    { label: 'Ventas entregadas', value: formatCurrency(data.totalDeliveredCop), icon: BarChart3 },
    { label: 'Ventas POS', value: formatCurrency(data.salesTotalCop), icon: CreditCard },
    { label: 'Comprobantes', value: String(data.salesCount), icon: ReceiptText },
    { label: 'Compras', value: formatCurrency(data.purchasesTotal), icon: ShoppingCart },
    { label: 'Stock critico', value: String(data.criticalStockCount), icon: AlertTriangle },
    { label: 'Despachos abiertos', value: String(data.dispatchesOpen), icon: Truck },
    { label: 'Cajas abiertas', value: String(data.openCashSessions), icon: Store },
  ]

  return (
    <section className="rounded-xl border border-amber-200 bg-white/80 p-5 shadow-lg shadow-amber-900/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-stone-950">Reportes consolidados</h2>
          <p className="text-sm font-bold leading-5 text-stone-500">
            Resumen de la marca · solo lectura · {new Date(data.generatedAt).toLocaleString('es-CO')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-red-900 transition hover:bg-amber-100"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const CardIcon = card.icon
          return (
            <div key={card.label} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-900 text-white">
                <CardIcon size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-stone-500">{card.label}</p>
                <p className="truncate text-lg font-black text-stone-950">{card.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-stone-500">Ventas por sede</h3>
        {data.branchSales.length === 0 ? (
          <p className="mt-2 text-sm font-bold text-stone-500">Sin ventas operativas registradas.</p>
        ) : (
          <ul className="mt-3 grid gap-2 lg:grid-cols-2">
            {data.branchSales.map((entry) => (
              <li key={entry.branchId} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-stone-700">{entry.branchName}</span>
                  <span className="text-xs font-bold text-stone-500">{entry.salesCount} comprobantes internos</span>
                </span>
                <span className="text-sm font-black text-red-900">{formatCurrency(entry.salesTotalCop)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-stone-500">Embudo de pedidos</h3>
        {data.ordersByStatus.length === 0 ? (
          <p className="mt-2 text-sm font-bold text-stone-500">Sin pedidos registrados.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.ordersByStatus.map((entry) => (
              <li key={entry.status} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2">
                <span className="text-sm font-black text-stone-700">{STATUS_LABELS[entry.status] ?? entry.status}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-black text-red-900">{entry.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
