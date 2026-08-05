import { Bike, CheckCircle2, CircleDashed, KeyRound, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { useAdminIntegrations } from '../hooks/useAdminIntegrations'

const sandboxOptions = [
  { value: 'pending', label: 'Sandbox pendiente' },
  { value: 'requested', label: 'Sandbox solicitado' },
  { value: 'available', label: 'Sandbox disponible' },
]

export function IntegrationsPanel() {
  const integrations = useAdminIntegrations()
  const connected = integrations.didiFoodIntegration?.enabled === true
  const hasStoreId = Boolean(integrations.form.externalStoreId.trim())

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-md bg-orange-100 text-orange-700">
                <Bike size={22} />
              </span>
              <div>
                <h2 className="text-lg font-black text-stone-950">DiDi Food</h2>
                <p className="text-sm font-bold text-stone-500">Canal externo de domicilio</p>
              </div>
            </div>
          </div>
          <span
            className={`rounded-md border px-3 py-1 text-sm font-black ${
              connected
                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                : 'border-amber-300 bg-amber-100 text-amber-800'
            }`}
          >
            {connected ? 'Conectado' : 'No conectado'}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ReadinessItem
            icon={hasStoreId ? CheckCircle2 : CircleDashed}
            label="Tienda externa"
            value={hasStoreId ? integrations.form.externalStoreId : 'Pendiente'}
            ready={hasStoreId}
          />
          <ReadinessItem
            icon={integrations.form.sandboxStatus === 'available' ? CheckCircle2 : CircleDashed}
            label="Sandbox"
            value={sandboxOptions.find((option) => option.value === integrations.form.sandboxStatus)?.label ?? 'Pendiente'}
            ready={integrations.form.sandboxStatus === 'available'}
          />
          <ReadinessItem
            icon={ShieldCheck}
            label="Credenciales"
            value="Solo backend"
            ready={false}
          />
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-bold text-stone-700">
            ID de tienda DiDi Food
            <input
              value={integrations.form.externalStoreId}
              onChange={(event) => integrations.updateForm({ externalStoreId: event.target.value })}
              placeholder="Pendiente"
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-orange-500"
            />
          </label>

          <label className="grid gap-1 text-sm font-bold text-stone-700">
            Estado sandbox
            <select
              value={integrations.form.sandboxStatus}
              onChange={(event) => integrations.updateForm({ sandboxStatus: event.target.value })}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-orange-500"
            >
              {sandboxOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-bold text-stone-700">
            Notas internas
            <textarea
              value={integrations.form.notes}
              onChange={(event) => integrations.updateForm({ notes: event.target.value })}
              rows={4}
              placeholder="Contacto, fecha de solicitud, requisitos o bloqueos"
              className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-orange-500"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void integrations.saveDidiFoodDraft()}
            disabled={integrations.saving}
            className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            <Save size={16} />
            {integrations.saving ? 'Guardando' : 'Guardar preparacion'}
          </button>
          <button
            type="button"
            onClick={() => void integrations.reload()}
            disabled={integrations.loading}
            className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          {integrations.status && <p className="text-sm font-bold text-stone-600">{integrations.status}</p>}
        </div>
      </section>

      <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound size={20} className="text-stone-700" />
          <h3 className="text-base font-black text-stone-950">Gate de conexion</h3>
        </div>
        <ul className="mt-4 grid gap-3 text-sm font-bold text-stone-700">
          <li>Cuenta developer o partner aprobada.</li>
          <li>Tienda DiDi Food asociada al restaurante.</li>
          <li>Endpoint backend para webhooks con firma validada.</li>
          <li>Mapeo de productos, precios y disponibilidad.</li>
          <li>WhatsApp activo como respaldo operativo.</li>
        </ul>
      </aside>
    </div>
  )
}

type ReadinessItemProps = {
  icon: typeof CircleDashed
  label: string
  value: string
  ready: boolean
}

function ReadinessItem({ icon: Icon, label, value, ready }: ReadinessItemProps) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center gap-2 text-sm font-black text-stone-500">
        <Icon size={16} className={ready ? 'text-emerald-600' : 'text-amber-600'} />
        {label}
      </div>
      <p className="mt-2 break-words text-base font-black text-stone-950">{value}</p>
    </div>
  )
}
