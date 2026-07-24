import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { type MenuItem } from '../../data/brasasSazonMenu'
import { buildWhatsAppUrl, type CustomerDetails } from '../order/orderMessage'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { fetchPublicMenu, getSeedMenuData, type MenuData } from '../../services/menuRepository'
import { CartSummary } from './components/CartSummary'
import { CategoryNav } from './components/CategoryNav'
import { MenuHero } from './components/MenuHero'
import { MenuPhotos } from './components/MenuPhotos'
import { OrderPanel } from './components/OrderPanel'
import { ProductGrid } from './components/ProductGrid'

type CartState = Record<string, number>
type CartNotes = Record<string, string>

export function PublicMenuApp() {
  const [menuData, setMenuData] = useLocalStorage<MenuData>('menu-data', getSeedMenuData())
  const [activeCategory, setActiveCategory] = useState(menuData.categories[0]?.id ?? '')
  const [cart, setCart] = useLocalStorage<CartState>('cart', {})
  const [itemNotes, setItemNotes] = useLocalStorage<CartNotes>('item-notes', {})
  const orderPanelRef = useRef<HTMLElement | null>(null)
  const [details, setDetails] = useLocalStorage<CustomerDetails>('order-details', {
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
          note: itemNotes[itemId] ?? '',
        }))
        .filter((line): line is { item: MenuItem; quantity: number; note: string } => Boolean(line.item) && line.quantity > 0),
    [cart, menuItems, itemNotes],
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

  function updateItemNote(itemId: string, note: string) {
    setItemNotes((current) => ({ ...current, [itemId]: note }))
  }

  function updateDetails(partial: Partial<CustomerDetails>) {
    setDetails((current) => ({ ...current, ...partial }))
  }

  function reviewOrder() {
    orderPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    orderPanelRef.current?.focus({ preventScroll: true })
  }

  function getItemQuantity(itemId: string) {
    return cart[itemId] ?? 0
  }

  const ogImage = restaurant.heroImage.startsWith('http')
    ? restaurant.heroImage
    : `${window.location.origin}${restaurant.heroImage}`

  return (
    <main className="min-h-screen bg-[#fff8ed] text-stone-950">
      <Helmet>
        <title>{restaurant.name} | Menu QR</title>
        <meta name="description" content={restaurant.description} />
        <meta property="og:title" content={`${restaurant.name} | Menu QR`} />
        <meta property="og:description" content={restaurant.description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${restaurant.name} | Menu QR`} />
        <meta name="twitter:description" content={restaurant.description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <MenuHero restaurant={restaurant} />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-36 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8 lg:pb-10">
        <div className="min-w-0">
          <div className="mb-5 rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
            <BrandMark title={restaurant.shortName} subtitle={restaurant.location} />
            <h2 className="mt-4 text-2xl font-black">{restaurant.headline}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Selecciona tus favoritos y enviaremos el pedido listo por WhatsApp.
            </p>
          </div>

          <CategoryNav
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />

          <ProductGrid
            title={activeCategoryData?.name ?? 'Menu'}
            description={`${visibleItems.length} opciones disponibles en esta seccion.`}
            items={visibleItems}
            categories={categories}
            itemCount={itemCount}
            getItemQuantity={getItemQuantity}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItemNote={updateItemNote}
            getItemNote={(id) => itemNotes[id] ?? ''}
            onReviewOrder={reviewOrder}
          />

          <MenuPhotos photos={menuPhotos} />
        </div>

        <OrderPanel
          cartLines={cartLines}
          details={details}
          restaurant={restaurant}
          total={total}
          hasUnknownPrices={hasUnknownPrices}
          itemCount={itemCount}
          whatsappUrl={whatsappUrl}
          orderPanelRef={orderPanelRef}
          onUpdateDetails={updateDetails}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onClearItem={clearItem}
          onUpdateItemNote={updateItemNote}
        />
      </section>

      <CartSummary
        cartLinesCount={cartLines.length}
        total={total}
        hasUnknownPrices={hasUnknownPrices}
        onReviewOrder={reviewOrder}
      />
    </main>
  )
}