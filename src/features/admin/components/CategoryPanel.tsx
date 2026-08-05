import { CheckCircle2, FolderPlus, ListFilter } from 'lucide-react'
import type { FormEvent } from 'react'
import type { MenuCategory } from '../../../data/restaurantSeed'

type CategoryPanelProps = {
  categories: MenuCategory[]
  selectedCategoryId: string
  categoryName: string
  categoryDescription: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onSelectCategory: (categoryId: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CategoryPanel({
  categories,
  selectedCategoryId,
  categoryName,
  categoryDescription,
  onNameChange,
  onDescriptionChange,
  onSelectCategory,
  onSubmit,
}: CategoryPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10 xl:sticky xl:top-4 xl:self-start">
      <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-stone-950 text-white">
            <ListFilter size={18} />
          </span>
          <div>
            <h2 className="text-lg font-black text-stone-950">Categorias</h2>
            <p className="text-sm font-bold text-stone-500">{categories.length} grupos activos</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={onSubmit} className="grid gap-2 rounded-lg border border-stone-100 bg-stone-50 p-3">
          <input
            value={categoryName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Nueva categoria"
            className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
          />
          <textarea
            value={categoryDescription}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Descripcion"
            rows={3}
            className="resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-900/10"
          />
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-900 text-sm font-black text-white shadow-md shadow-red-900/15 transition hover:-translate-y-0.5 hover:bg-red-950 active:translate-y-0">
            <FolderPlus size={16} />
            Crear categoria
          </button>
        </form>

        <div className="mt-4 grid gap-2">
          {categories.map((category) => {
            const selected = selectedCategoryId === category.id

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                aria-pressed={selected}
                className={`group relative overflow-hidden rounded-lg border p-3 text-left transition duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                  selected
                    ? 'border-red-900 bg-red-50 text-red-950 shadow-md shadow-red-900/10'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-amber-200 hover:bg-amber-50/60'
                }`}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${selected ? 'bg-red-900' : 'bg-transparent'}`} />
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{category.name}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-500">
                      {category.description}
                    </span>
                  </span>
                  {selected ? <CheckCircle2 size={16} className="shrink-0 text-red-900" /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
