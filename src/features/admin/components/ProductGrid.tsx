import { Pencil, Plus, Soup, Trash2 } from 'lucide-react'
import type { MenuItem } from '../../../data/restaurantSeed'
import { formatMenuPrice } from '../../../lib/format'

type ProductGridProps = {
  products: MenuItem[]
  selectedCategoryName: string
  getProductImage: (product: MenuItem) => string | undefined
  getProductImageLabel: (product: MenuItem) => string
  onEditProduct: (product: MenuItem) => void
  onDeleteProduct: (productId: string, productName: string) => void
  onNewProduct: () => void
}

export function ProductGrid({
  products,
  selectedCategoryName,
  getProductImage,
  getProductImageLabel,
  onEditProduct,
  onDeleteProduct,
  onNewProduct,
}: ProductGridProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10">
      <div className="border-b border-amber-100 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-red-950">
              <Soup size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-stone-950">Productos</h2>
              <p className="text-sm font-bold text-stone-500">
            {products.length} productos en {selectedCategoryName}
              </p>
            </div>
          </div>
          <button onClick={onNewProduct} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-900 px-4 py-2 text-sm font-black text-white shadow-md shadow-red-900/15 transition hover:-translate-y-0.5 hover:bg-red-950 active:translate-y-0">
            <Plus size={16} />
            Nuevo
          </button>
        </div>
      </div>

      <div className="p-4">
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm font-bold leading-6 text-stone-500">
            Esta categoria aun no tiene productos. Usa Nuevo para crear el primero.
          </div>
        ) : null}
        <div className="grid gap-3">
          {products.map((product) => {
            const productImage = getProductImage(product)

            return (
              <article
                key={product.id}
                className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/30 hover:shadow-md hover:shadow-red-900/10 md:grid-cols-[112px_minmax(0,1fr)_150px]"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100 md:aspect-auto md:h-full">
                  {productImage ? (
                    <>
                      <img src={productImage} alt={product.name} className="h-full w-full object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-black text-stone-700 shadow-sm">
                        {getProductImageLabel(product)}
                      </span>
                    </>
                  ) : (
                    <div className="grid h-full min-h-[84px] place-items-center text-sm font-bold text-stone-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="min-w-0 self-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 text-base font-black text-stone-950">{product.name}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-black ${
                      product.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.available ? 'Disponible' : 'Oculto'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-black text-stone-700">{formatMenuPrice(product.price)}</p>
                  {product.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-500">{product.description}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 self-center md:grid-cols-1">
                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white text-xs font-black text-stone-700 shadow-sm transition hover:border-red-200 hover:bg-red-50"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProduct(product.id, product.name)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white text-xs font-black text-red-700 shadow-sm transition hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
