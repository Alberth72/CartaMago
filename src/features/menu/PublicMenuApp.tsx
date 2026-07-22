import { Flame, Minus, Plus, Send, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { type FulfillmentMode, type MenuItem } from '../../data/brasasSazonMenu'
import { buildWhatsAppUrl, type CustomerDetails } from '../order/orderMessage'
import { formatCurrency, formatMenuPrice } from '../../lib/format'
import { fetchPublicMenu, getSeedMenuData, type MenuData } from '../../services/menuRepository'

type CartState = Record<string, number>

const fulfillmentLabels: Record<FulfillmentMode, string> = {
  pickup: 'Recoger',
  delivery: 'Domicilio',
  table: 'Mesa',
}

export function PublicMenuApp() {
  const [menuData, setMenuData] = useState<MenuData>(() => getSeedMenuData())
  const [activeCategory, setActiveCategory] = useState(menuData.categories[0]?.id ?? '')
  const [cart, setCart] = useState<CartState>({})
  const orderPanelRef = useRef<HTMLElement | null>(null)
  const [details, setDetails] = useState<CustomerDetails>({
    name: '',
    note: '',
    address: '',
    table: '',
    fulfillmentMode: 'pickup',
  })
  useEffect(() => {
    fetchPublicMenu().then((nextMenuData) => {
      setMenuData(nextMenuData)
      setActiveCategory((current) => current || nextMenuData.categories[0]?.id || '')
    })
  }, [])

  const { categories, menuItems, menuPhotos, restaurant } = menuData
  const visibleItems = menuItems.filter((item) => item.categoryId === activeCategory)
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([itemId, quantity]) => ({
          item: menuItems.find((item) => item.id === itemId),
          quantity,
        }))
        .filter((line): line is { item: MenuItem; quantity: number } => Boolean(line.item) && line.quantity > 0),
    [cart, menuItems],
  )
  const total = cartLines.reduce((sum, line) => sum + (line.item.price ?? 0) * line.quantity, 0)
  const hasUnknownPrices = cartLines.some((line) => line.item.price == null)
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const whatsappUrl = buildWhatsAppUrl(restaurant, cartLines, details)
  const activeCategoryData = categories.find((category) => category.id === activeCategory)

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

  function reviewOrder() {
    orderPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    orderPanelRef.current?.focus({ preventScroll: true })
  }

  function getCategoryImage(item: MenuItem) {
    const category = categories.find((candidate) => candidate.id === item.categoryId)
    return item.imageUrl ?? category?.image
  }

  function getItemQuantity(itemId: string) {
    return cart[itemId] ?? 0
  }

  return (
    <main className="min-h-screen bg-[#fff8ed] text-stone-950">
      <section className="relative overflow-hidden bg-stone-950 text-white">
        <img
          src={restaurant.heroImage}
          alt="Logo de Brasas & Sazon en la carta fisica"
          className="absolute inset-0 h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,10,9,0.88),rgba(12,10,9,0.55),rgba(127,29,29,0.3))]" />
        <div className="relative mx-auto flex min-h-[390px] max-w-6xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-full bg-amber-400 text-stone-950">
                <Flame size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">{restaurant.shortName}</p>
                <p className="text-xs text-stone-200">{restaurant.location}</p>
              </div>
            </div>
            <div className="rounded-full bg-white/14 px-3 py-2 text-sm font-semibold backdrop-blur">
              Menu QR
            </div>
          </header>

          <div className="max-w-2xl pb-5 pt-14">
            <p className="text-sm font-semibold text-amber-200">{restaurant.location}</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{restaurant.name}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-100 sm:text-lg">{restaurant.description}</p>
            <div className="mt-5 grid max-w-xl grid-cols-3 gap-2">
              <div className="rounded-md border border-white/12 bg-white/12 px-3 py-2 backdrop-blur">
                <p className="text-xs font-bold text-amber-100">Ordena</p>
                <p className="text-sm font-black">En 1 minuto</p>
              </div>
              <div className="rounded-md border border-white/12 bg-white/12 px-3 py-2 backdrop-blur">
                <p className="text-xs font-bold text-amber-100">Canal</p>
                <p className="text-sm font-black">WhatsApp</p>
              </div>
              <div className="rounded-md border border-white/12 bg-white/12 px-3 py-2 backdrop-blur">
                <p className="text-xs font-bold text-amber-100">Redes</p>
                <p className="truncate text-sm font-black">{restaurant.socialHandle}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-36 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8 lg:pb-10">
        <div className="min-w-0">
          <div className="mb-5 rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
            <BrandMark title={restaurant.shortName} subtitle={restaurant.location} />
            <h2 className="mt-4 text-2xl font-black">{restaurant.headline}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Selecciona tus favoritos y enviaremos el pedido listo por WhatsApp.
            </p>
          </div>

          <nav className="scrollbar-hide sticky top-0 z-10 -mx-4 mb-5 flex gap-2 overflow-x-auto bg-[#fff8ed]/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
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

          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{activeCategoryData?.name ?? 'Menu'}</h2>
              <p className="text-sm text-stone-500">{visibleItems.length} opciones disponibles en esta seccion.</p>
            </div>
            {itemCount > 0 ? (
              <button type="button" onClick={reviewOrder} className="hidden rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-black text-red-900 sm:block">
                Ver pedido
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleItems.map((item) => {
              const quantity = getItemQuantity(item.id)

              return (
              <article key={item.id} className="overflow-hidden rounded-lg border border-amber-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-[16/9] bg-stone-200">
                  {getCategoryImage(item) ? (
                    <img src={getCategoryImage(item)} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center bg-stone-100 text-sm font-bold text-stone-400">
                      Brasas & Sazon
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
                    <p className="text-sm leading-6 text-stone-600">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                      {quantity > 0 ? `${quantity} en tu pedido` : item.available ? 'Disponible' : 'Agotado'}
                    </p>
                    {quantity > 0 ? (
                      <div className="grid grid-cols-[44px_36px_44px] overflow-hidden rounded-md border border-emerald-200 bg-emerald-50">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="grid h-11 place-items-center text-emerald-800"
                          aria-label={`Restar ${item.name}`}
                        >
                          <Minus size={18} aria-hidden="true" />
                        </button>
                        <span className="grid h-11 place-items-center text-sm font-black text-emerald-900">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => addItem(item.id)}
                          className="grid h-11 place-items-center text-emerald-800"
                          aria-label={`Sumar ${item.name}`}
                        >
                          <Plus size={18} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addItem(item.id)}
                        disabled={!item.available}
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-stone-300"
                      >
                        <Plus size={18} aria-hidden="true" />
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
              </article>
              )
            })}
          </div>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Carta fisica de referencia</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Fotos procesadas del menu original. La compra se hace desde las tarjetas para que el pedido llegue claro.
                </p>
              </div>
            </div>
            <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {menuPhotos.map((photo) => (
                <figure
                  key={photo.id}
                  className="w-[170px] shrink-0 overflow-hidden rounded-lg border border-amber-100 bg-white shadow-sm sm:w-[190px]"
                >
                  <img src={photo.image} alt={`Foto del menu: ${photo.title}`} className="aspect-[3/4] w-full object-cover" />
                  <figcaption className="px-3 py-2 text-sm font-black">{photo.title}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        </div>

        <aside ref={orderPanelRef} id="pedido" tabIndex={-1} className="scroll-mt-4 outline-none lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-amber-100 bg-white p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Tu pedido</h2>
                <p className="text-sm text-stone-500">{itemCount} productos seleccionados</p>
              </div>
              <span className="grid size-11 place-items-center rounded-md bg-amber-100 text-red-900">
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
                      <p className="text-sm text-stone-500">
                        {line.item.price == null
                          ? (line.item.priceNote ?? 'Precio por confirmar')
                          : formatCurrency(line.item.price * line.quantity)}
                      </p>
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
                      ? 'border-red-900 bg-red-50 text-red-900'
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
              <span className="text-sm font-bold text-stone-500">
                {hasUnknownPrices ? 'Total conocido' : 'Total aprox.'}
              </span>
              <span className="text-2xl font-black">{hasUnknownPrices && total === 0 ? 'Por confirmar' : formatCurrency(total)}</span>
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

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-amber-100 bg-white/95 p-3 shadow-lg backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={reviewOrder}
          disabled={cartLines.length === 0}
          className={`mx-auto flex h-12 max-w-xl items-center justify-between rounded-md px-4 text-sm font-black ${
            cartLines.length > 0 ? 'bg-red-900 text-white' : 'bg-stone-200 text-stone-500'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingBag size={18} aria-hidden="true" />
            Revisar pedido
          </span>
          <span>{hasUnknownPrices && total === 0 ? 'Por confirmar' : formatCurrency(total)}</span>
        </button>
        {cartLines.length > 0 ? (
          <p className="mx-auto mt-1 max-w-xl text-center text-[11px] font-bold text-stone-500">
            Elige recoger, domicilio o mesa antes de enviar por WhatsApp.
          </p>
        ) : null}
      </div>
    </main>
  )
}
