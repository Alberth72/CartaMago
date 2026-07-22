import type { MenuItem } from '../../../data/brasasSazonMenu'
import { formatMenuPrice } from '../../../lib/format'

type ProductGridProps = {
  products: MenuItem[]
  getProductImage: (product: MenuItem) => string | undefined
  getProductImageLabel: (product: MenuItem) => string
  onEditProduct: (product: MenuItem) => void
  onNewProduct: () => void
}

export function ProductGrid({
  products,
  getProductImage,
  getProductImageLabel,
  onEditProduct,
  onNewProduct,
}: ProductGridProps) {
  return (
    <section className="rounded-lg border border-amber-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Productos</h2>
          <p className="text-sm text-stone-500">{products.length} productos guardados</p>
        </div>
        <button onClick={onNewProduct} className="rounded-md bg-red-900 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-red-950">
          Nuevo
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => {
          const productImage = getProductImage(product)

          return (
            <button
              key={product.id}
              onClick={() => onEditProduct(product)}
              className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50 text-left transition hover:border-red-700 hover:shadow-sm"
            >
              <div className="relative aspect-[16/9] bg-stone-200">
                {productImage ? (
                  <>
                    <img src={productImage} alt={product.name} className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-black text-stone-700 shadow-sm">
                      {getProductImageLabel(product)}
                    </span>
                  </>
                ) : (
                  <div className="grid h-full place-items-center text-sm font-bold text-stone-400">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black">{product.name}</p>
                  <span className={product.available ? 'text-xs font-black text-emerald-700' : 'text-xs font-black text-red-600'}>
                    {product.available ? 'Disponible' : 'Oculto'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-500">{formatMenuPrice(product.price)}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
