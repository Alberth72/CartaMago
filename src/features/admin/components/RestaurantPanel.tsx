import { LogOut, MessageCircle } from 'lucide-react'
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
    <section className="rounded-lg border border-amber-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Restaurante</h2>
          <p className="text-sm text-stone-500">Datos que usa el QR publico</p>
        </div>
        <button onClick={onLogout} className="inline-flex items-center gap-2 text-sm font-bold text-stone-500">
          <LogOut size={16} />
          Salir
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid gap-2">
        <input
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Nombre del restaurante"
          className="h-10 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
        />
        <input
          value={form.whatsappNumber}
          onChange={(event) => onChange({ whatsappNumber: event.target.value })}
          inputMode="numeric"
          placeholder="WhatsApp: 573001234567"
          className="h-10 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
        />
        <input
          value={form.headline}
          onChange={(event) => onChange({ headline: event.target.value })}
          placeholder="Frase principal"
          className="h-10 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
        />
        <textarea
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Texto del encabezado del menu"
          rows={4}
          className="resize-none rounded-md border border-stone-200 px-3 py-2 text-sm leading-5 outline-none focus:border-red-800"
        />
        <button
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:bg-stone-300"
        >
          <MessageCircle size={16} />
          Guardar datos
        </button>
      </form>
    </section>
  )
}
