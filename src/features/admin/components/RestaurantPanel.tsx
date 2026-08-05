import { LogOut, MessageCircle, Save, Store } from 'lucide-react'
import type { FormEvent } from 'react'
import type { AdminRestaurantForm } from '../types'

type RestaurantPanelProps = {
  form: AdminRestaurantForm
  isSaving: boolean
  onChange: (partial: Partial<AdminRestaurantForm>) => void
  onLogout: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function RestaurantPanel({ form, isSaving, onChange, onLogout, onSubmit }: RestaurantPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10">
      <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-900 text-white shadow-md shadow-red-900/20">
              <Store size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-stone-950">Identidad del restaurante</h2>
              <p className="text-sm font-bold text-stone-500">Nombre, WhatsApp y portada que ve el cliente.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-black text-stone-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-50 active:translate-y-0"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
        <div className="grid gap-3 lg:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Nombre del restaurante"
            className="h-11 rounded-lg border border-stone-200 px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
          />
          <input
            value={form.whatsappNumber}
            onChange={(event) => onChange({ whatsappNumber: event.target.value })}
            inputMode="numeric"
            placeholder="WhatsApp: 573001234567"
            className="h-11 rounded-lg border border-stone-200 px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
          />
          <input
            value={form.headline}
            onChange={(event) => onChange({ headline: event.target.value })}
            placeholder="Frase principal"
            className="h-11 rounded-lg border border-stone-200 px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10 lg:col-span-2"
          />
        </div>

        <textarea
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Texto del encabezado del menu"
          rows={5}
          className="min-h-[132px] resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm leading-5 outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
        />

        <div className="grid content-between gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3">
          <div>
            <p className="text-xs font-bold uppercase text-stone-400">Canal principal</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-black text-stone-800">
              <MessageCircle size={15} className="text-emerald-700" />
              WhatsApp del local
            </p>
          </div>
          <button
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0 disabled:translate-y-0 disabled:bg-stone-300 disabled:shadow-none"
          >
            <Save size={16} />
            Guardar datos
          </button>
        </div>
      </form>
    </section>
  )
}
