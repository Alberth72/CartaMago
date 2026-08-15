import { useEffect, useMemo, useState } from 'react'
import { Boxes, LogOut, Package, PlugZap, ReceiptText, Truck, Warehouse, type LucideIcon } from 'lucide-react'
import { isSupabaseConfigured } from '../../services/menuRepository'
import { AdminSetupNotice } from './components/AdminSetupNotice'
import { AdminShell } from './components/AdminShell'
import { CategoryPanel } from './components/CategoryPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { IntegrationsPanel } from './components/IntegrationsPanel'
import { InventoryPanel } from './components/InventoryPanel'
import { LoginForm } from './components/LoginForm'
import { OperationsPanel } from './components/OperationsPanel'
import { OrdersPanel } from './components/OrdersPanel'
import { ProductEditor } from './components/ProductEditor'
import { ProductGrid } from './components/ProductGrid'
import { RestaurantPanel } from './components/RestaurantPanel'
import { WarehousePurchasingPanel } from './components/WarehousePurchasingPanel'
import { useAdminAuth } from './hooks/useAdminAuth'
import { useAdminMenu } from './hooks/useAdminMenu'
import { fetchAdminScopeSummary } from './repositories/adminScopeRepository'
import type { OperationsRole } from './operationsTypes'

type AdminTab = 'orders' | 'menu' | 'operations' | 'inventory' | 'integrations'

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
    id: 'inventory',
    label: 'Inventario',
    description: 'Stock, insumos y mermas',
    badge: 'Merma',
    icon: Package,
  },
  {
    id: 'operations',
    label: 'Operacion',
    description: 'Bodega, sedes y despachos',
    badge: 'Bodega',
    icon: Warehouse,
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    description: 'DiDiFood, pagos y canales',
    badge: 'Setup',
    icon: PlugZap,
  },
]

const roleLabels: Record<OperationsRole, string> = {
  superadmin: 'Superadmin',
  warehouse_admin: 'Admin de bodega',
  branch_admin: 'Admin de sede',
  cashier: 'Cajero',
}

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders')
  const [adminSummary, setAdminSummary] = useState<{
    role: OperationsRole
    email: string
    branchName: string | null
    warehouseName: string | null
  } | null>(null)
  const [adminSummaryStatus, setAdminSummaryStatus] = useState('')
  const configured = isSupabaseConfigured()
  const menu = useAdminMenu()
  const auth = useAdminAuth({
    configured,
    onAuthenticated: menu.loadMenu,
    onSignedOut: menu.clearMenu,
    setStatus: menu.setStatus,
  })
  const isWarehouseAdmin = adminSummary?.role === 'warehouse_admin'
  const visibleTabs = useMemo(
    () =>
      isWarehouseAdmin
        ? adminTabs
            .filter((tab) => tab.id !== 'menu' && tab.id !== 'inventory')
            .map((tab) =>
              tab.id === 'orders'
                ? {
                    ...tab,
                    label: 'Compras',
                    description: 'Proveedores y ordenes',
                    badge: 'Proveedor',
                    icon: Truck,
                  }
                : tab,
            )
        : adminTabs,
    [isWarehouseAdmin],
  )
  const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab)

  useEffect(() => {
    if (!auth.isLoggedIn) {
      setAdminSummary(null)
      setAdminSummaryStatus('')
      return
    }

    let cancelled = false
    fetchAdminScopeSummary()
      .then((summary) => {
        if (cancelled) return
        setAdminSummary({
          role: summary.profile.role,
          email: summary.profile.email,
          branchName: summary.branchName,
          warehouseName: summary.warehouseName,
        })
        setAdminSummaryStatus('')
      })
      .catch((error) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'No se pudo cargar el perfil del admin.'
        if (message.includes('User from sub claim') || message.includes('JWT')) {
          setAdminSummary(null)
          setAdminSummaryStatus('Sesion local vencida. Cierra sesion e ingresa de nuevo.')
          return
        }
        setAdminSummary(null)
        setAdminSummaryStatus(message)
      })

    return () => {
      cancelled = true
    }
  }, [auth.isLoggedIn])

  useEffect(() => {
    if (!auth.isLoggedIn) return
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'orders')
    }
  }, [activeTab, auth.isLoggedIn, visibleTabs])

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
      documentTitle={`${activeTabMeta?.label ?? 'Admin'} | Admin CartaMago`}
      actions={
        <button
          type="button"
          onClick={() => void auth.logout()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white px-3 py-2 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-50 active:translate-y-0"
        >
          <LogOut size={16} aria-hidden="true" />
          Cerrar sesion
        </button>
      }
      subtitle={
        activeTab === 'orders'
          ? isWarehouseAdmin
            ? 'Compras, proveedores y reabastecimiento central'
            : 'Gestion de pedidos recibidos'
          : activeTab === 'inventory'
            ? 'Stock de insumos y registro de mermas'
            : activeTab === 'operations'
              ? 'Bodega central, sedes y reabastecimiento'
            : activeTab === 'integrations'
              ? 'Canales externos y proveedores'
              : 'Edita productos, precios, disponibilidad e imagenes'
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-4">
        <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-lg shadow-amber-900/10">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-stone-500">Sesion activa</p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                {adminSummary ? `Estas operando como ${roleLabels[adminSummary.role]}` : 'Cargando perfil operativo'}
              </h2>
              <p className="text-sm font-bold text-stone-500">
                {adminSummary?.email ?? adminSummaryStatus ?? 'Validando permisos del usuario'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Sede asignada</p>
                <p className="mt-1 text-sm font-black text-emerald-950">
                  {adminSummary?.branchName ?? 'Sin sede asignada'}
                </p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-sky-700">Bodega asignada</p>
                <p className="mt-1 text-sm font-black text-sky-950">
                  {adminSummary?.warehouseName ?? 'Sin bodega asignada'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <nav
          className={`mb-4 grid gap-2 rounded-xl border border-amber-200 bg-white/80 p-2 shadow-lg shadow-amber-900/10 sm:grid-cols-2 ${
            isWarehouseAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-5'
          }`}
        >
          {visibleTabs.map((tab) => {
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
          isWarehouseAdmin ? <WarehousePurchasingPanel /> : <OrdersPanel />
        ) : activeTab === 'operations' ? (
          <OperationsPanel />
        ) : activeTab === 'inventory' ? (
          <InventoryPanel />
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
