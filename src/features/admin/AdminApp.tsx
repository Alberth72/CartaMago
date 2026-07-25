import { useState } from 'react'
import { isSupabaseConfigured } from '../../services/menuRepository'
import { AdminSetupNotice } from './components/AdminSetupNotice'
import { AdminShell } from './components/AdminShell'
import { CategoryPanel } from './components/CategoryPanel'
import { LoginForm } from './components/LoginForm'
import { OrdersPanel } from './components/OrdersPanel'
import { ProductEditor } from './components/ProductEditor'
import { ProductGrid } from './components/ProductGrid'
import { RestaurantPanel } from './components/RestaurantPanel'
import { useAdminAuth } from './hooks/useAdminAuth'
import { useAdminMenu } from './hooks/useAdminMenu'

type AdminTab = 'menu' | 'orders'

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders')
  const configured = isSupabaseConfigured()
  const menu = useAdminMenu()
  const auth = useAdminAuth({
    configured,
    onAuthenticated: menu.loadMenu,
    onSignedOut: menu.clearMenu,
    setStatus: menu.setStatus,
  })

  if (!configured) {
    return <AdminSetupNotice />
  }

  if (!auth.sessionReady) {
    return <AdminShell title="Admin" subtitle="Cargando sesion..." />
  }

  if (!auth.isLoggedIn) {
    return (
      <AdminShell title="Admin" subtitle="Ingresa para editar el menu publico">
        <LoginForm
          email={auth.email}
          password={auth.password}
          status={menu.status}
          onEmailChange={auth.setEmail}
          onPasswordChange={auth.setPassword}
          onSubmit={auth.login}
        />
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title="Admin"
      subtitle={activeTab === 'orders' ? 'Gestion de pedidos recibidos' : 'Edita productos, precios, disponibilidad e imagenes'}
    >
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex gap-1 rounded-lg border border-stone-200 bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-black transition-colors ${
              activeTab === 'orders' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Pedidos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-black transition-colors ${
              activeTab === 'menu' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Menu
          </button>
        </div>

        {activeTab === 'orders' ? (
          <OrdersPanel />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[320px_1fr_420px]">
            <aside className="grid content-start gap-5">
              <RestaurantPanel
                form={menu.restaurantForm}
                isSaving={menu.isSaving}
                onChange={menu.updateRestaurantForm}
                onLogout={auth.logout}
                onSubmit={menu.saveRestaurant}
              />
              <CategoryPanel
                categories={menu.categories}
                selectedCategoryId={menu.productForm.categoryId}
                categoryName={menu.categoryName}
                categoryDescription={menu.categoryDescription}
                onNameChange={menu.setCategoryName}
                onDescriptionChange={menu.setCategoryDescription}
                onSelectCategory={(categoryId) => menu.updateProductForm({ categoryId })}
                onSubmit={menu.createCategory}
              />
            </aside>

            <ProductGrid
              products={menu.products}
              getProductImage={menu.getProductAdminImage}
              getProductImageLabel={menu.getProductImageLabel}
              onEditProduct={menu.editProduct}
              onNewProduct={menu.newProduct}
            />

            <ProductEditor
              categories={menu.categories}
              form={menu.productForm}
              isSaving={menu.isSaving}
              selectedCategory={menu.selectedCategory}
              status={menu.status}
              onChange={menu.updateProductForm}
              onSubmit={menu.saveProduct}
              onUploadImage={(file) => void menu.uploadImage(file)}
            />
          </div>
        )}
      </div>
    </AdminShell>
  )
}
