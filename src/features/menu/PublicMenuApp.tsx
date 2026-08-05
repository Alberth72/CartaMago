import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { fetchPublicMenu, getSeedMenuData, type MenuData } from '../../services/menuRepository'
import { CartSummary } from './components/CartSummary'
import { CategoryNav } from './components/CategoryNav'
import { MenuHero } from './components/MenuHero'
import { OrderPanel } from './components/OrderPanel'
import { ProductGrid } from './components/ProductGrid'
import { usePublicMenuOrder } from './hooks/usePublicMenuOrder'

export function PublicMenuApp() {
  const seedMenuData = getSeedMenuData()
  const [storedMenuData, setMenuData] = useLocalStorage<unknown>('menu-data', seedMenuData)
  const menuData = normalizeMenuData(storedMenuData, seedMenuData)
  const [activeCategory, setActiveCategory] = useState(menuData.categories[0]?.id ?? '')

  useEffect(() => {
    fetchPublicMenu().then((nextMenuData) => {
      setMenuData(nextMenuData)
      setActiveCategory((current) => current || nextMenuData.categories[0]?.id || '')
    })
  }, [setMenuData])

  const { categories, menuItems, restaurant } = menuData
  const restaurantId = menuData.restaurantId ?? 'brasas-sazon'
  const visibleItems = menuItems.filter((item) => item.categoryId === activeCategory)
  const activeCategoryData = categories.find((category) => category.id === activeCategory)
  const order = usePublicMenuOrder({ restaurantId, restaurant, menuItems })
  const menuTitle = `Menu ${restaurant.shortName} | CartaMago`

  const ogImage = restaurant.heroImage.startsWith('http')
    ? restaurant.heroImage
    : `${window.location.origin}${restaurant.heroImage}`

  return (
    <main className="min-h-screen bg-[#fff8ed] text-stone-950">
      <Helmet>
        <title>{menuTitle}</title>
        <meta name="description" content={restaurant.description} />
        <meta property="og:title" content={menuTitle} />
        <meta property="og:description" content={restaurant.description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={menuTitle} />
        <meta name="twitter:description" content={restaurant.description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <MenuHero restaurant={restaurant} />

      <section id="menu" className="mx-auto grid scroll-mt-4 max-w-6xl gap-6 px-4 py-6 pb-36 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8 lg:pb-10">
        <div className="min-w-0">
          <div className="mb-5 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg shadow-amber-900/10">
            <div className="grid md:grid-cols-[1fr_230px]">
              <div className="p-4 sm:p-5">
                <BrandMark title={restaurant.shortName} subtitle={restaurant.location} />
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">Carta activa</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">Pedido por WhatsApp</span>
                </div>
                <h2 className="mt-4 text-2xl font-black">{restaurant.headline}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-700">
                  Escoge productos, define recogida, domicilio o mesa, y deja el pedido listo para confirmar.
                </p>
              </div>
              <div className="relative min-h-36 overflow-hidden border-t border-amber-100 md:border-l md:border-t-0">
                <img
                  src={restaurant.heroImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.05),rgba(12,10,9,0.6))]" />
                <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/15 bg-white/16 px-3 py-2 text-sm font-black text-white shadow-sm backdrop-blur">
                  Cocina preparando tu proxima orden
                </div>
              </div>
            </div>
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
            itemCount={order.itemCount}
            getItemQuantity={order.getItemQuantity}
            onAddItem={order.addItem}
            onRemoveItem={order.removeItem}
            onUpdateItemNote={order.updateItemNote}
            getItemNote={order.getItemNote}
            onReviewOrder={order.reviewOrder}
          />

        </div>

        <OrderPanel
          cartLines={order.cartLines}
          details={order.details}
          restaurant={restaurant}
          total={order.total}
          hasUnknownPrices={order.hasUnknownPrices}
          itemCount={order.itemCount}
          whatsappUrl={order.whatsappUrl}
          orderPanelRef={order.orderPanelRef}
          onUpdateDetails={order.updateDetails}
          onAddItem={order.addItem}
          onRemoveItem={order.removeItem}
          onClearItem={order.clearItem}
          onUpdateItemNote={order.updateItemNote}
          onWhatsAppClick={order.handleWhatsAppClick}
        />
      </section>

      <CartSummary
        cartLinesCount={order.cartLines.length}
        total={order.total}
        hasUnknownPrices={order.hasUnknownPrices}
        onReviewOrder={order.reviewOrder}
      />
    </main>
  )
}

function normalizeMenuData(menuData: unknown, fallback: MenuData): MenuData {
  if (!menuData || typeof menuData !== 'object') {
    return fallback
  }

  const candidate = menuData as Partial<MenuData>

  if (!Array.isArray(candidate.categories) || !Array.isArray(candidate.menuItems) || !candidate.restaurant) {
    return fallback
  }

  if (candidate.categories.length === 0 || candidate.menuItems.length === 0) {
    return fallback
  }

  return {
    ...fallback,
    ...candidate,
    restaurant: {
      ...fallback.restaurant,
      ...candidate.restaurant,
    },
    categories: candidate.categories,
    menuItems: candidate.menuItems,
    menuPhotos: Array.isArray(candidate.menuPhotos) ? candidate.menuPhotos : fallback.menuPhotos,
  }
}
