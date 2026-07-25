import { ImagePlus, Save } from 'lucide-react'
import type { FormEvent } from 'react'
import type { MenuCategory } from '../../../data/restaurantSeed'
import type { AdminProductForm } from '../types'

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
    <section className="rounded-lg border border-amber-100 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black">Editor de producto</h2>
      <p className="mt-1 text-sm text-stone-500">
        {selectedCategory ? `Categoria: ${selectedCategory.name}` : 'Selecciona una categoria'}
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <input
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Nombre del producto"
          className="h-11 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
        />
        <select
          value={form.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
          className="h-11 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
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
          className="resize-none rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-red-800"
        />
        <input
          value={form.price}
          onChange={(event) => onChange({ price: event.target.value })}
          type="number"
          min="0"
          placeholder="Precio COP"
          className="h-11 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
        />
        <input
          value={form.badge}
          onChange={(event) => onChange({ badge: event.target.value })}
          placeholder="Etiqueta opcional: Mas vendido"
          className="h-11 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
        />
        <label className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(event) => onChange({ available: event.target.checked })}
          />
          Disponible para pedir
        </label>
        <label className="grid cursor-pointer gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
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
        {form.imageUrl || selectedCategory?.image ? (
          <figure className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
            <div className="relative">
              <img
                src={form.imageUrl || selectedCategory?.image}
                alt="Vista previa"
                className="aspect-[16/9] w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-black text-stone-700 shadow-sm">
                {form.imageUrl ? 'Imagen propia' : 'Referencia de categoria'}
              </span>
            </div>
            {!form.imageUrl ? (
              <figcaption className="px-3 py-2 text-xs font-bold text-stone-500">
                El menu publico usa esta referencia mientras subes una foto propia del producto.
              </figcaption>
            ) : null}
          </figure>
        ) : null}
        <button
          disabled={isSaving}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:bg-stone-300"
        >
          <Save size={18} />
          {isSaving ? 'Guardando...' : 'Guardar producto'}
        </button>
        {status ? <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{status}</p> : null}
      </form>
    </section>
  )
}
