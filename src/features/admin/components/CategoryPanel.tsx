import type { FormEvent } from 'react'
import type { MenuCategory } from '../../../data/brasasSazonMenu'

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
    <section className="rounded-lg border border-amber-100 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-black">Categorias</h2>
      <form onSubmit={onSubmit} className="grid gap-2">
        <input
          value={categoryName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Nueva categoria"
          className="h-10 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
        />
        <textarea
          value={categoryDescription}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Descripcion"
          rows={3}
          className="resize-none rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-red-800"
        />
        <button className="h-10 rounded-md bg-red-900 text-sm font-black text-white shadow-sm hover:bg-red-950">Crear categoria</button>
      </form>
      <div className="mt-5 grid gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`rounded-md border p-3 text-left ${
              selectedCategoryId === category.id ? 'border-red-900 bg-red-50' : 'border-stone-200'
            }`}
          >
            <p className="text-sm font-black">{category.name}</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">{category.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
