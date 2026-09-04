import { AlertTriangle, BarChart3, RefreshCw, Store, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '../../../lib/format'
import { useAdminReports } from '../hooks/useAdminReports'

export function ReportsPanel() {
  const { data, isLoading, status, reload } = useAdminReports()

  if (isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-black text-stone-500">Cargando reportes...</p>
      </section>
    )
  }

  if (status) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
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

  const branchSales = [...data.branchSales].sort((left, right) => right.revenueTotalCop - left.revenueTotalCop)
  const topBranch = branchSales[0] ?? null
  const averagePerBranch = data.branchCount > 0 ? Math.round(data.revenueTotalCop / data.branchCount) : 0

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-stone-500">Ventas consolidadas</p>
            <p className="mt-1 text-3xl font-black tracking-normal text-stone-950">
              {formatCurrency(data.revenueTotalCop)}
            </p>
            <p className="mt-1 text-sm font-bold text-stone-500">
              {data.branchCount} sedes - actualizado {new Date(data.generatedAt).toLocaleString('es-CO')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-black text-stone-700 transition hover:bg-stone-50"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric label="Sede lider" value={topBranch?.branchName ?? 'Sin ventas'} icon={Store} />
          <Metric label="Promedio por sede" value={formatCurrency(averagePerBranch)} icon={BarChart3} />
          <Metric label="Venta publica" value={formatCurrency(data.publicOrdersTotalCop)} icon={BarChart3} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-stone-500">Ventas por sede</h2>
        </div>
        {branchSales.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm font-bold text-stone-500">Sin ventas registradas.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {branchSales.map((entry, index) => (
              <li
                key={entry.branchId}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[44px_minmax(0,1fr)_180px] sm:items-center"
              >
                <span className="hidden size-8 place-items-center rounded-md bg-stone-100 text-xs font-black text-stone-500 sm:grid">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-stone-900">{entry.branchName}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-stone-500">
                    <span>Caja {formatCurrency(entry.salesTotalCop)}</span>
                    <span>QR/WhatsApp {formatCurrency(entry.publicOrdersTotalCop)}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-base font-black text-stone-950">{formatCurrency(entry.revenueTotalCop)}</p>
                  <p className="text-xs font-bold text-stone-400">
                    {formatBranchShare(entry.revenueTotalCop, data.revenueTotalCop)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

type MetricProps = {
  label: string
  value: string
  icon: LucideIcon
}

function Metric({ label, value, icon: Icon }: MetricProps) {
  return (
    <div className="grid min-h-20 grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <span className="grid size-8 place-items-center rounded-md bg-white text-stone-500">
        <Icon size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-black uppercase tracking-wide text-stone-500">{label}</span>
        <span className="block truncate text-sm font-black text-stone-900">{value}</span>
      </span>
    </div>
  )
}

function formatBranchShare(value: number, total: number) {
  if (total <= 0) return '0%'
  return `${Math.round((value / total) * 100)}% del total`
}
