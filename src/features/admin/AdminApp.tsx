import { useState } from 'react'
import { Boxes, PlugZap, ReceiptText, type LucideIcon } from 'lucide-react'
import { isSupabaseConfigured } from '../../services/menuRepository'
import { AdminSetupNotice } from './components/AdminSetupNotice'
import { AdminShell } from './components/AdminShell'
import { CategoryPanel } from './components/CategoryPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { IntegrationsPanel } from './components/IntegrationsPanel'
import { LoginForm } from './components/LoginForm'
import { OrdersPanel } from './components/OrdersPanel'
import { ProductEditor } from './components/ProductEditor'
import { ProductGrid } from './components/ProductGrid'
import { RestaurantPanel } from './components/RestaurantPanel'
import { useAdminAuth } from './hooks/useAdminAuth'
import { useAdminMenu } from './hooks/useAdminMenu'

type AdminTab = 'orders' | 'menu' | 'integrations'

const adminTabs: Array<{
  id: AdminTab
  label: string
  description: string
  badge: string
  icon: LucideIcon
}> = [
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Bandeja, pagos y estados',
    badge: 'Operativo',
    icon: ReceiptText,
  },
  {
    id: 'menu',
    label: 'Menu',
    description: 'Productos, categorias y precios',
    badge: 'Carta',
    icon: Boxes,
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    description: 'DiDiFood, pagos y canales',
    badge: 'Setup',
    icon: PlugZap,
  },
]

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
      documentTitle={`${adminTabs.find((tab) => tab.id === activeTab)?.label ?? 'Admin'} | Admin CartaMago`}
      subtitle={
        activeTab === 'orders'
          ? 'Gestion de pedidos recibidos'
          : activeTab === 'integrations'
            ? 'Canales externos y proveedores'
            : 'Edita productos, precios, disponibilidad e imagenes'
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-4">
        <nav className="mb-4 grid gap-2 rounded-xl border border-amber-200 bg-white/80 p-2 shadow-lg shadow-amber-900/10 sm:grid-cols-3">
          {adminTabs.map((tab) => {
            const TabIcon = tab.icon
            const selected = activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={selected}
                className={`group relative overflow-hidden rounded-lg border p-3 text-left transition duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                  selected
                    ? 'border-red-900 bg-red-50 text-red-950 shadow-lg shadow-red-900/10 ring-1 ring-red-900/10'
                    : 'border-transparent bg-white text-stone-600 hover:border-amber-200 hover:bg-amber-50/60 hover:shadow-md hover:shadow-amber-900/10'
                }`}
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${selected ? 'bg-red-900' : 'bg-transparent'}`} />
                <span className="flex items-start justify-between gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg transition group-hover:scale-105 ${
                    selected ? 'bg-red-900 text-white shadow-md shadow-red-900/20' : 'bg-stone-100 text-stone-500'
                  }`}>
                    <TabIcon size={19} aria-hidden="true" />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                    selected ? 'bg-white text-red-900' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {tab.badge}
                  </span>
                </span>
                <span className="mt-3 block text-sm font-black">{tab.label}</span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">{tab.description}</span>
              </button>
            )
          })}
        </nav>

        {activeTab === 'orders' ? (
          <OrdersPanel />
        ) : activeTab === 'integrations' ? (
          <IntegrationsPanel />
        ) : (
          <div className="grid gap-5">
            <RestaurantPanel
              form={menu.restaurantForm}
              isSaving={menu.isSaving}
              onChange={menu.updateRestaurantForm}
              onLogout={auth.logout}
              onSubmit={menu.saveRestaurant}
            />

            <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
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

              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <ProductGrid
                  products={menu.selectedCategoryProducts}
                  selectedCategoryName={menu.selectedCategory?.name ?? 'Sin categoria'}
                  getProductImage={menu.getProductAdminImage}
                  getProductImageLabel={menu.getProductImageLabel}
                  onEditProduct={menu.editProduct}
                  onDeleteProduct={menu.requestDeleteProduct}
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
            </div>
          </div>
        )}
        {menu.confirm ? (
          <ConfirmDialog
            message={
              menu.confirm.type === 'delete-product'
                ? `Eliminar producto "${menu.confirm.productName}". Esta accion no se puede deshacer.`
                : `Eliminar categoria "${menu.confirm.categoryName}". Esta accion no se puede deshacer.`
            }
            buttonLabel="Eliminar"
            isWorking={menu.isSaving}
            onCancel={menu.cancelConfirm}
            onConfirm={() => void menu.executeConfirm()}
          />
        ) : null}
      </div>
    </AdminShell>
  )
}
