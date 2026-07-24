import type { MenuCategory, MenuItem } from '../../../data/brasasSazonMenu'
import { ProductCard } from './ProductCard'

type ProductGridProps = {
  title: string
  description: string
  items: MenuItem[]
  categories: MenuCategory[]
  itemCount: number
  getItemQuantity: (itemId: string) => number
  getItemNote: (itemId: string) => string
  onAddItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
  onUpdateItemNote: (itemId: string, note: string) => void
  onReviewOrder: () => void
}

export function ProductGrid({
  title,
  description,
  items,
  categories,
  itemCount,
  getItemQuantity,
  getItemNote,
  onAddItem,
  onRemoveItem,
  onUpdateItemNote,
  onReviewOrder,
}: ProductGridProps) {
  return (
    <>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm text-stone-500">{description}</p>
        </div>
        {itemCount > 0 ? (
          <button
            type="button"
            onClick={onReviewOrder}
            className="hidden rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-black text-red-900 sm:block"
          >
            Ver pedido
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            quantity={getItemQuantity(item.id)}
            note={getItemNote(item.id)}
            categories={categories}
            onAdd={onAddItem}
            onRemove={onRemoveItem}
            onUpdateNote={onUpdateItemNote}
          />
        ))}
      </div>
    </>
  )
}