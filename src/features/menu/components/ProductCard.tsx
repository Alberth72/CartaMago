import { Minus, Plus } from 'lucide-react'
import type { MenuCategory, MenuItem } from '../../../data/restaurantSeed'
import { formatMenuPrice } from '../../../lib/format'

type ProductCardProps = {
  item: MenuItem
  quantity: number
  categories: MenuCategory[]
  note: string
  onAdd: (itemId: string) => void
  onRemove: (itemId: string) => void
  onUpdateNote: (itemId: string, note: string) => void
}

function getCategoryImage(item: MenuItem, categories: MenuCategory[]) {
  const category = categories.find((candidate) => candidate.id === item.categoryId)
  return item.imageUrl ?? category?.image
}

export function ProductCard({ item, quantity, categories, note, onAdd, onRemove, onUpdateNote }: ProductCardProps) {
  return (
    <article
      data-testid={`product-card-${item.id}`}
      className="overflow-hidden rounded-lg border border-amber-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-stone-200">
        {getCategoryImage(item, categories) ? (
          <img src={getCategoryImage(item, categories)} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center bg-stone-100 text-sm font-bold text-stone-400">
            Menu
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 to-transparent p-3">
          <p className="text-xl font-black text-white">{formatMenuPrice(item.price)}</p>
        </div>
      </div>
      <div className="flex min-h-[176px] flex-col justify-between gap-4 p-4">
        <div>
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="text-lg font-black leading-snug">{item.name}</h3>
            {item.badge ? (
              <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-red-900">
                {item.badge}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-stone-700">{item.description}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
            {quantity > 0 ? `${quantity} en tu pedido` : item.available ? 'Disponible' : 'Agotado'}
          </p>
          {quantity > 0 ? (
            <div className="grid grid-cols-[44px_36px_44px] overflow-hidden rounded-md border border-emerald-200 bg-emerald-50">
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                data-testid={`product-remove-${item.id}`}
                className="grid h-11 place-items-center text-emerald-800"
                aria-label={`Restar ${item.name}`}
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <span data-testid={`product-quantity-${item.id}`} className="grid h-11 place-items-center text-sm font-black text-emerald-900">{quantity}</span>
              <button
                type="button"
                onClick={() => onAdd(item.id)}
                data-testid={`product-add-${item.id}`}
                className="grid h-11 place-items-center text-emerald-800"
                aria-label={`Sumar ${item.name}`}
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(item.id)}
              disabled={!item.available}
              data-testid={`product-add-${item.id}`}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-stone-300"
            >
              <Plus size={18} aria-hidden="true" />
              Agregar
            </button>
          )}
        </div>
        {quantity > 0 ? (
          <input
            value={note}
            onChange={(e) => onUpdateNote(item.id, e.target.value)}
            data-testid={`product-note-${item.id}`}
            placeholder="Nota: punto, salsa, sin cebolla..."
            className="h-9 w-full rounded-md border border-stone-200 px-3 text-xs outline-none focus:border-emerald-600"
          />
        ) : null}
      </div>
    </article>
  )
}
