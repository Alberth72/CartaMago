import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { BarChart3, Boxes, LogOut, Package, PlugZap, ReceiptText, Truck, Warehouse, type LucideIcon } from 'lucide-react'
import { isSupabaseConfigured } from '../../services/menuRepository'
import { isE2EAdminMockEnabled } from '../../lib/runtimeFlags'
import { AdminSetupNotice } from './components/AdminSetupNotice'
import { AdminShell } from './components/AdminShell'
import { ConfirmDialog } from './components/ConfirmDialog'
import { LoginForm } from './components/LoginForm'
import { useAdminAuth } from './hooks/useAdminAuth'
import { useAdminMenu } from './hooks/useAdminMenu'
import { fetchAdminScopeSummary } from './repositories/adminScopeRepository'
import { getAdminTabs, type AdminTabId } from './roleAccess'
import type { OperationsRole } from './operationsTypes'

// Paneles pesados: se cargan bajo demanda por rol (code-split del admin).
const CategoryPanel = lazy(() => import('./components/CategoryPanel').then((module) => ({ default: module.CategoryPanel })))
const IntegrationsPanel = lazy(() => import('./components/IntegrationsPanel').then((module) => ({ default: module.IntegrationsPanel })))
const InventoryPanel = lazy(() => import('./components/InventoryPanel').then((module) => ({ default: module.InventoryPanel })))
const OperationsPanel = lazy(() => import('./components/OperationsPanel').then((module) => ({ default: module.OperationsPanel })))
const OrdersPanel = lazy(() => import('./components/OrdersPanel').then((module) => ({ default: module.OrdersPanel })))
const ProductEditor = lazy(() => import('./components/ProductEditor').then((module) => ({ default: module.ProductEditor })))
const ProductGrid = lazy(() => import('./components/ProductGrid').then((module) => ({ default: module.ProductGrid })))
const ReportsPanel = lazy(() => import('./components/ReportsPanel').then((module) => ({ default: module.ReportsPanel })))
const RestaurantPanel = lazy(() => import('./components/RestaurantPanel').then((module) => ({ default: module.RestaurantPanel })))
const WarehousePurchasingPanel = lazy(() =>
  import('./components/WarehousePurchasingPanel').then((module) => ({ default: module.WarehousePurchasingPanel })),
)

const tabIcons: Record<AdminTabId, LucideIcon> = {
  orders: ReceiptText,
  menu: Boxes,
  inventory: Package,
  operations: Warehouse,
  integrations: PlugZap,
  reports: BarChart3,
}

const roleLabels: Record<OperationsRole, string> = {
  superadmin: 'Superadmin',
  warehouse_admin: 'Admin de bodega',
  branch_admin: 'Admin de sede',
  cashier: 'Cajero',
}

type ScopeCardTone = 'emerald' | 'sky' | 'stone'

const scopeCardStyles: Record<ScopeCardTone, { box: string; label: string; value: string }> = {
  emerald: {
    box: 'border-emerald-100 bg-emerald-50',
    label: 'text-emerald-700',
    value: 'text-emerald-950',
  },
  sky: {
    box: 'border-sky-100 bg-sky-50',
    label: 'text-sky-700',
    value: 'text-sky-950',
  },
  stone: {
    box: 'border-stone-200 bg-stone-50',
    label: 'text-stone-500',
    value: 'text-stone-950',
  },
}

function PanelFallback() {
  return (
    <div className="rounded-xl border border-amber-200 bg-white/80 p-5 shadow-lg shadow-amber-900/10">
      <p className="text-sm font-black text-stone-500">Cargando panel...</p>
    </div>
  )
}

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('orders')
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
  // En produccion/localdb, superadmin es SOLO REPORTES. El mock (dev:mock/e2e)
  // conserva el CRUD para poder probar el resto de los paneles con la e2e.
  const isReportOnly = adminSummary?.role === 'superadmin' && !isE2EAdminMockEnabled()
  const visibleTabs = useMemo(
    () =>
      getAdminTabs(adminSummary?.role ?? 'cashier', isReportOnly).map((tab) => ({
        ...tab,
        icon: tab.id === 'orders' && isWarehouseAdmin ? Truck : tabIcons[tab.id],
      })),
    [adminSummary?.role, isReportOnly, isWarehouseAdmin],
  )
  const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab)
  const scopeCards = useMemo(() => {
    if (!adminSummary) {
      return [
        { label: 'Perfil operativo', value: 'Validando permisos', tone: 'stone' as const },
        { label: 'Alcance', value: 'Cargando acceso', tone: 'sky' as const },
      ]
    }

    if (adminSummary.role === 'superadmin') {
      return [
        {
          label: 'Acceso',
          value: isE2EAdminMockEnabled() ? 'Panel completo (mock/test)' : 'Reportes consolidados',
          tone: 'sky' as const,
        },
        {
          label: 'Permisos',
          value: isE2EAdminMockEnabled() ? 'CRUD completo' : 'Solo lectura / informes',
          tone: 'stone' as const,
        },
      ]
    }

    if (adminSummary.role === 'warehouse_admin') {
      return [
        {
          label: 'Bodega operativa',
          value: adminSummary.warehouseName ?? 'Sin bodega asignada',
          tone: 'sky' as const,
        },
        {
          label: 'Alcance',
          value: 'Compras, proveedores y despachos',
          tone: 'stone' as const,
        },
      ]
    }

    return [
      {
        label: 'Sede asignada',
        value: adminSummary.branchName ?? 'Sin sede asignada',
        tone: 'emerald' as const,
      },
      {
        label: 'Bodega conectada',
        value: adminSummary.warehouseName ?? 'Sin bodega conectada',
        tone: 'sky' as const,
      },
    ]
  }, [adminSummary])

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
              {scopeCards.map((card) => {
                const styles = scopeCardStyles[card.tone]

                return (
                  <div key={card.label} className={`rounded-lg border px-3 py-2 ${styles.box}`}>
                    <p className={`text-[11px] font-black uppercase tracking-wide ${styles.label}`}>{card.label}</p>
                    <p className={`mt-1 text-sm font-black ${styles.value}`}>{card.value}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <nav
          className={`mb-4 grid gap-2 rounded-xl border border-amber-200 bg-white/80 p-2 shadow-lg shadow-amber-900/10 sm:grid-cols-2 ${
            isReportOnly ? 'lg:grid-cols-1' : isWarehouseAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-5'
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

        <Suspense fallback={<PanelFallback />}>
          {activeTab === 'orders' ? (
            isWarehouseAdmin ? <WarehousePurchasingPanel /> : <OrdersPanel />
          ) : activeTab === 'reports' ? (
            <ReportsPanel />
          ) : activeTab === 'operations' ? (
            <OperationsPanel />
          ) : activeTab === 'inventory' ? (
            <InventoryPanel />
          ) : activeTab === 'integrations' ? (
            <IntegrationsPanel />
          ) : (
            <div className="grid gap-5">
              <RestaurantPanel
                branchId={menu.branchId}
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
        </Suspense>
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
