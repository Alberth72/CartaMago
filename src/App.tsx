import { Minus, Plus, Send, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { categories, menuItems, restaurant, type FulfillmentMode, type MenuItem } from './data/demoMenu'
import { buildWhatsAppUrl, type CustomerDetails } from './features/order/orderMessage'
import { formatCurrency } from './lib/format'

type CartState = Record<string, number>

const fulfillmentLabels: Record<FulfillmentMode, string> = {
  pickup: 'Recoger',
  delivery: 'Domicilio',
  table: 'Mesa',
}

function App() {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')
  const [cart, setCart] = useState<CartState>({})
  const [details, setDetails] = useState<CustomerDetails>({
    name: '',
    note: '',
    address: '',
    table: '',
    fulfillmentMode: 'pickup',
  })

  const visibleItems = menuItems.filter((item) => item.categoryId === activeCategory)
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([itemId, quantity]) => ({
          item: menuItems.find((item) => item.id === itemId),
          quantity,
        }))
        .filter((line): line is { item: MenuItem; quantity: number } => Boolean(line.item) && line.quantity > 0),
    [cart],
  )
  const total = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const whatsappUrl = buildWhatsAppUrl(restaurant, cartLines, details)

  function addItem(itemId: string) {
    setCart((current) => ({
      ...current,
      [itemId]: (current[itemId] ?? 0) + 1,
    }))
  }

  function removeItem(itemId: string) {
    setCart((current) => {
      const nextQuantity = (current[itemId] ?? 0) - 1
      if (nextQuantity <= 0) {
        const { [itemId]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [itemId]: nextQuantity,
      }
    })
  }

  function clearItem(itemId: string) {
    setCart((current) => {
      const { [itemId]: _removed, ...rest } = current
      return rest
    })
  }

  function updateDetails(partial: Partial<CustomerDetails>) {
    setDetails((current) => ({ ...current, ...partial }))
  }

  return (
    <main className="min-h-screen bg-[#f8f5ee] text-stone-950">
      <section className="relative min-h-[430px] overflow-hidden bg-stone-950 text-white">
        <img
          src="/assets/roast-chicken-hero.png"
          alt="Pollo asado dorado con acompanamientos"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-stone-950/55" />
        <div className="relative mx-auto flex min-h-[430px] max-w-6xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-full bg-amber-400 text-stone-950">
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">CartaMago</p>
                <p className="text-xs text-stone-200">Tu carta cobra vida</p>
              </div>
            </div>
            <div className="rounded-full bg-white/14 px-3 py-2 text-sm font-semibold backdrop-blur">
              QR menu
            </div>
          </header>

          <div className="max-w-2xl pb-5 pt-14">
            <p className="text-sm font-semibold text-amber-200">{restaurant.location}</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{restaurant.name}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-100 sm:text-lg">{restaurant.description}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-36 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8 lg:pb-10">
        <div className="min-w-0">
          <div className="mb-5">
            <h2 className="text-2xl font-black">{restaurant.headline}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Selecciona tus favoritos y enviaremos el pedido listo por WhatsApp.
            </p>
          </div>

          <nav className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  activeCategory === category.id
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-300 bg-white text-stone-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <article key={item.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex min-h-[148px] flex-col justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black leading-snug">{item.name}</h3>
                      {item.badge ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-stone-600">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-black">{formatCurrency(item.price)}</p>
                    <button
                      type="button"
                      onClick={() => addItem(item.id)}
                      disabled={!item.available}
                      className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-stone-300"
                    >
                      <Plus size={18} aria-hidden="true" />
                      Agregar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Tu pedido</h2>
                <p className="text-sm text-stone-500">{itemCount} productos seleccionados</p>
              </div>
              <span className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-900">
                <ShoppingBag size={20} aria-hidden="true" />
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {cartLines.length === 0 ? (
                <p className="rounded-md bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                  Agrega productos del menu para armar el mensaje de WhatsApp.
                </p>
              ) : (
                cartLines.map((line) => (
                  <div key={line.item.id} className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{line.item.name}</p>
                      <p className="text-sm text-stone-500">{formatCurrency(line.item.price * line.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => removeItem(line.item.id)}
                        className="grid size-9 place-items-center rounded-md border border-stone-200 text-stone-700"
                        aria-label={`Restar ${line.item.name}`}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <span className="w-7 text-center text-sm font-black">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => addItem(line.item.id)}
                        className="grid size-9 place-items-center rounded-md border border-stone-200 text-stone-700"
                        aria-label={`Sumar ${line.item.name}`}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => clearItem(line.item.id)}
                        className="grid size-9 place-items-center rounded-md border border-stone-200 text-red-600"
                        aria-label={`Quitar ${line.item.name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {restaurant.fulfillmentModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateDetails({ fulfillmentMode: mode })}
                  className={`rounded-md border px-2 py-2 text-sm font-black ${
                    details.fulfillmentMode === mode
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  {fulfillmentLabels[mode]}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={details.name}
                onChange={(event) => updateDetails({ name: event.target.value })}
                placeholder="Tu nombre"
                className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
              />
              {details.fulfillmentMode === 'delivery' ? (
                <input
                  value={details.address}
                  onChange={(event) => updateDetails({ address: event.target.value })}
                  placeholder="Direccion para domicilio"
                  className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
                />
              ) : null}
              {details.fulfillmentMode === 'table' ? (
                <input
                  value={details.table}
                  onChange={(event) => updateDetails({ table: event.target.value })}
                  placeholder="Numero de mesa"
                  className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
                />
              ) : null}
              <textarea
                value={details.note}
                onChange={(event) => updateDetails({ note: event.target.value })}
                placeholder="Notas: presa, salsas, punto de entrega..."
                rows={3}
                className="w-full resize-none rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
              <span className="text-sm font-bold text-stone-500">Total aprox.</span>
              <span className="text-2xl font-black">{formatCurrency(total)}</span>
            </div>

            <a
              href={cartLines.length > 0 ? whatsappUrl : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={cartLines.length === 0}
              className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-black shadow-sm ${
                cartLines.length > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'pointer-events-none bg-stone-200 text-stone-500'
              }`}
            >
              <Send size={18} aria-hidden="true" />
              Pedir por WhatsApp
            </a>
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:hidden">
        <a
          href={cartLines.length > 0 ? whatsappUrl : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={cartLines.length === 0}
          className={`mx-auto flex h-12 max-w-xl items-center justify-between rounded-md px-4 text-sm font-black ${
            cartLines.length > 0 ? 'bg-emerald-600 text-white' : 'pointer-events-none bg-stone-200 text-stone-500'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Send size={18} aria-hidden="true" />
            WhatsApp
          </span>
          <span>{formatCurrency(total)}</span>
        </a>
      </div>
    </main>
  )
}

export default App
