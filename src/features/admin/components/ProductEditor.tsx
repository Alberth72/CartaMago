import { ImagePlus, Save, SlidersHorizontal } from 'lucide-react'
import type { FormEvent } from 'react'
import type { MenuCategory } from '../../../data/restaurantSeed'
import type { AdminProductForm } from '../types'

const defaultProductImage = '/client-assets/brasas-sazon/processed/product-placeholder-preparing.png'

type ProductEditorProps = {
  categories: MenuCategory[]
  form: AdminProductForm
  isSaving: boolean
  selectedCategory?: MenuCategory
  status: string
  onChange: (partial: Partial<AdminProductForm>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUploadImage: (file: File) => void
}

export function ProductEditor({
  categories,
  form,
  isSaving,
  selectedCategory,
  status,
  onChange,
  onSubmit,
  onUploadImage,
}: ProductEditorProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10 2xl:sticky 2xl:top-4 2xl:self-start">
      <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-900 text-white">
            <SlidersHorizontal size={18} />
          </span>
          <div>
            <h2 className="text-lg font-black text-stone-950">Editor de producto</h2>
            <p className="text-sm font-bold text-stone-500">
              {selectedCategory ? `Categoria: ${selectedCategory.name}` : 'Selecciona una categoria'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 p-4">
        <input
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Nombre del producto"
          className="h-11 rounded-lg border border-stone-200 px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
        />
        <select
          value={form.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
          className="h-11 rounded-lg border border-stone-200 px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
        >
          <option value="">Selecciona categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <textarea
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Descripcion corta"
          rows={4}
          className="resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
        />
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
          <input
            value={form.price}
            onChange={(event) => onChange({ price: event.target.value })}
            type="number"
            min="0"
            placeholder="Precio COP"
            className="h-11 rounded-lg border border-stone-200 px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
          />
          <input
            value={form.badge}
            onChange={(event) => onChange({ badge: event.target.value })}
            placeholder="Etiqueta opcional: Mas vendido"
            className="h-11 rounded-lg border border-stone-200 px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(event) => onChange({ available: event.target.checked })}
          />
          Disponible para pedir
        </label>
        <label className="grid cursor-pointer gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-center transition hover:border-red-200 hover:bg-red-50/40">
          <ImagePlus className="mx-auto text-stone-500" />
          <span className="text-sm font-black">Subir imagen del producto</span>
          <span className="text-xs text-stone-500">JPG o PNG. Se guarda en Supabase Storage.</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onUploadImage(file)
            }}
          />
        </label>
        <figure className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
          <div className="relative">
            <img
              src={form.imageUrl || defaultProductImage}
              alt="Vista previa"
              className="aspect-[16/9] w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-black text-stone-700 shadow-sm">
              {form.imageUrl ? 'Imagen propia' : 'Imagen por defecto'}
            </span>
          </div>
          <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-bold text-stone-500">
            <span>{form.imageUrl ? 'Foto subida para este producto.' : 'El menu publico usa esta imagen mientras subes una foto propia.'}</span>
            {form.imageUrl ? (
              <button
                type="button"
                onClick={() => onChange({ imageUrl: '' })}
                className="shrink-0 rounded-md border border-stone-200 bg-white px-2 py-1 font-black text-stone-700 hover:bg-stone-100"
              >
                Usar defecto
              </button>
            ) : null}
          </figcaption>
        </figure>
        <button
          disabled={isSaving}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0 disabled:translate-y-0 disabled:bg-stone-300 disabled:shadow-none"
        >
          <Save size={18} />
          {isSaving ? 'Guardando...' : 'Guardar producto'}
        </button>
        {status ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{status}</p> : null}
      </form>
    </section>
  )
}
