import type { MenuCategory } from '../../../data/brasasSazonMenu'

type CategoryNavProps = {
  categories: MenuCategory[]
  activeCategory: string
  onSelectCategory: (categoryId: string) => void
}

export function CategoryNav({ categories, activeCategory, onSelectCategory }: CategoryNavProps) {
  return (
    <nav className="scrollbar-hide sticky top-0 z-10 -mx-4 mb-5 flex gap-2 overflow-x-auto bg-[#fff8ed]/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelectCategory(category.id)}
          aria-current={activeCategory === category.id ? 'page' : undefined}
          className={`shrink-0 rounded-md border px-4 py-2 text-sm font-black transition ${
            activeCategory === category.id
              ? 'border-red-900 bg-red-900 text-white shadow-sm'
              : 'border-amber-200 bg-white text-stone-700 hover:border-red-200 hover:bg-red-50'
          }`}
        >
          {category.name}
        </button>
      ))}
    </nav>
  )
}