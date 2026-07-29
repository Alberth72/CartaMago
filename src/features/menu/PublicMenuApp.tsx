import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { fetchPublicMenu, getSeedMenuData, type MenuData } from '../../services/menuRepository'
import { CartSummary } from './components/CartSummary'
import { CategoryNav } from './components/CategoryNav'
import { MenuHero } from './components/MenuHero'
import { MenuPhotos } from './components/MenuPhotos'
import { OrderPanel } from './components/OrderPanel'
import { ProductGrid } from './components/ProductGrid'
import { usePublicMenuOrder } from './hooks/usePublicMenuOrder'

export function PublicMenuApp() {
  const [menuData, setMenuData] = useLocalStorage<MenuData>('menu-data', getSeedMenuData())
  const [activeCategory, setActiveCategory] = useState(menuData.categories[0]?.id ?? '')

  useEffect(() => {
    fetchPublicMenu().then((nextMenuData) => {
      setMenuData(nextMenuData)
      setActiveCategory((current) => current || nextMenuData.categories[0]?.id || '')
    })
  }, [setMenuData])

  const { categories, menuItems, menuPhotos, restaurant } = menuData
  const restaurantId = menuData.restaurantId ?? 'brasas-sazon'
  const visibleItems = menuItems.filter((item) => item.categoryId === activeCategory)
  const activeCategoryData = categories.find((category) => category.id === activeCategory)
  const order = usePublicMenuOrder({ restaurantId, restaurant, menuItems })

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
            itemCount={order.itemCount}
            getItemQuantity={order.getItemQuantity}
            onAddItem={order.addItem}
            onRemoveItem={order.removeItem}
            onUpdateItemNote={order.updateItemNote}
            getItemNote={order.getItemNote}
            onReviewOrder={order.reviewOrder}
          />

          <MenuPhotos photos={menuPhotos} />
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
