import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Boxes,
  Command,
  LogOut,
  Package,
  PlugZap,
  ReceiptText,
  Store,
  Truck,
  UserRoundCheck,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { isSupabaseConfigured } from '../../services/menuRepository'
import { isE2EAdminMockEnabled } from '../../lib/runtimeFlags'
import { AdminSetupNotice } from './components/AdminSetupNotice'
import { AdminShell, type AdminTheme } from './components/AdminShell'
import { ConfirmDialog } from './components/ConfirmDialog'
import { LoginForm } from './components/LoginForm'
import { useAdminAuth } from './hooks/useAdminAuth'
import { useAdminMenu } from './hooks/useAdminMenu'
import { fetchAdminScopeSummary } from './repositories/adminScopeRepository'
import { getAdminTabs, type AdminTabId } from './roleAccess'
import type { OperationsRole } from './operationsTypes'

// Paneles pesados: se cargan bajo demanda por rol (code-split del admin).
const CategoryPanel = lazy(() => import('./components/CategoryPanel').then((module) => ({ default: module.CategoryPanel })))
const CashPanel = lazy(() => import('./components/CashPanel').then((module) => ({ default: module.CashPanel })))
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
  cash: Wallet,
  integrations: PlugZap,
  reports: BarChart3,
}

type ScopeCardTone = 'emerald' | 'sky' | 'stone' | 'amber'

const scopeCardStyles: Record<ScopeCardTone, { lightBox: string; darkBox: string; lightLabel: string; darkLabel: string; lightValue: string; darkValue: string }> = {
  emerald: {
    lightBox: 'border-emerald-100 bg-emerald-50',
    darkBox: 'border-emerald-300/20 bg-emerald-300/10',
    lightLabel: 'text-emerald-700',
    darkLabel: 'text-emerald-200',
    lightValue: 'text-emerald-950',
    darkValue: 'text-emerald-50',
  },
  sky: {
    lightBox: 'border-sky-100 bg-sky-50',
    darkBox: 'border-sky-300/20 bg-sky-300/10',
    lightLabel: 'text-sky-700',
    darkLabel: 'text-sky-200',
    lightValue: 'text-sky-950',
    darkValue: 'text-sky-50',
  },
  stone: {
    lightBox: 'border-stone-200 bg-stone-50',
    darkBox: 'border-stone-700 bg-white/5',
    lightLabel: 'text-stone-500',
    darkLabel: 'text-stone-400',
    lightValue: 'text-stone-950',
    darkValue: 'text-stone-50',
  },
  amber: {
    lightBox: 'border-amber-100 bg-amber-50',
    darkBox: 'border-amber-300/20 bg-amber-300/10',
    lightLabel: 'text-amber-700',
    darkLabel: 'text-amber-200',
    lightValue: 'text-amber-950',
    darkValue: 'text-amber-50',
  },
}

const roleVisuals: Record<OperationsRole, {
  icon: LucideIcon
  label: string
  title: string
  description: string
  accent: ScopeCardTone
}> = {
  superadmin: {
    icon: Command,
    label: 'Torre de control',
    title: 'Vista completa de la cadena',
    description: 'Indicadores, sedes, ventas y decisiones de crecimiento.',
    accent: 'amber',
  },
  warehouse_admin: {
    icon: Warehouse,
    label: 'Centro logistico',
    title: 'Bodega, compras y abastecimiento',
    description: 'Proveedores, inventario central, despachos y continuidad de sedes.',
    accent: 'sky',
  },
  branch_admin: {
    icon: Store,
    label: 'Operacion de sede',
    title: 'Caja, pedidos, inventario y reabastecimiento',
    description: 'Prioridad diaria: vender, preparar, recibir y cuadrar sin friccion.',
    accent: 'emerald',
  },
  cashier: {
    icon: UserRoundCheck,
    label: 'Punto de atencion',
    title: 'Pedidos y cajas de la sede',
    description: 'Acceso liviano para operar ventas y tickets sin ruido administrativo.',
    accent: 'stone',
  },
}

function getInitialAdminTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light'
  return window.localStorage.getItem('cartamago-admin-theme') === 'dark' ? 'dark' : 'light'
}

function PanelFallback({ theme }: { theme: AdminTheme }) {
  const isDark = theme === 'dark'

  return (
    <div className={`rounded-xl border p-5 shadow-lg ${
      isDark ? 'border-stone-700 bg-[#211c18] shadow-black/20' : 'border-amber-200 bg-white/80 shadow-amber-900/10'
    }`}>
      <p className={`text-sm font-black ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Cargando panel...</p>
    </div>
  )
}

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('orders')
  const [adminTheme, setAdminTheme] = useState<AdminTheme>(getInitialAdminTheme)
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
  const isDark = adminTheme === 'dark'
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
  const roleVisual = roleVisuals[adminSummary?.role ?? 'cashier']
  const RoleIcon = roleVisual.icon
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
    window.localStorage.setItem('cartamago-admin-theme', adminTheme)
  }, [adminTheme])

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
    return (
      <AdminShell
        title="Admin"
        subtitle="Cargando sesion..."
        theme={adminTheme}
        onToggleTheme={() => setAdminTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />
    )
  }

  if (!auth.isLoggedIn) {
    return (
      <AdminShell
        title="Operaciones"
        subtitle="Ingresa para operar sedes, bodega, ventas e inventario"
        theme={adminTheme}
        onToggleTheme={() => setAdminTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      >
        <LoginForm
          email={auth.email}
          password={auth.password}
          status={menu.status}
          theme={adminTheme}
          onEmailChange={auth.setEmail}
          onPasswordChange={auth.setPassword}
          onSubmit={auth.login}
        />
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title={getAdminShellTitle(adminSummary?.role)}
      theme={adminTheme}
      documentTitle={`${activeTabMeta?.label ?? 'Admin'} | Admin CartaMago`}
      onToggleTheme={() => setAdminTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      actions={
        <button
          type="button"
          onClick={() => void auth.logout()}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 ${
            isDark
              ? 'border-amber-300/20 bg-amber-300 text-stone-950 hover:bg-amber-200'
              : 'border-white/10 bg-white text-stone-950 hover:bg-amber-50'
          }`}
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
          : activeTab === 'reports'
            ? 'Indicadores consolidados de la cadena'
          : activeTab === 'inventory'
            ? 'Stock de insumos y registro de mermas'
            : activeTab === 'operations'
              ? 'Bodega central, sedes y reabastecimiento'
            : activeTab === 'cash'
              ? 'Apertura, ventas y cuadre de caja por sede'
            : activeTab === 'integrations'
              ? 'Canales externos y proveedores'
            : 'Configuracion comercial y kit operativo de sede'
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-4">
        <section className={`mb-4 overflow-hidden rounded-xl border shadow-xl ${
          isDark ? 'border-stone-700 bg-[#211c18] shadow-black/25' : 'border-stone-200 bg-white shadow-amber-900/10'
        }`}>
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className={`p-4 ${
              isDark ? 'border-b border-stone-700 bg-[#181411] lg:border-b-0 lg:border-r' : 'border-b border-amber-100 bg-amber-50/70 lg:border-b-0 lg:border-r'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`grid size-12 shrink-0 place-items-center rounded-lg shadow-md ${
                  isDark ? 'bg-amber-300 text-stone-950 shadow-amber-300/10' : 'bg-red-900 text-white shadow-red-900/20'
                }`}>
                  <RoleIcon size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-black uppercase tracking-wide ${
                    isDark ? 'text-amber-200' : 'text-red-900'
                  }`}>
                    {roleVisual.label}
                  </p>
                  <h2 className={`mt-1 text-xl font-black tracking-normal ${isDark ? 'text-stone-50' : 'text-stone-950'}`}>
                    {adminSummary ? roleVisual.title : 'Cargando perfil operativo'}
                  </h2>
                  <p className={`mt-1 text-sm font-bold leading-6 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    {adminSummary ? roleVisual.description : adminSummaryStatus || 'Validando permisos del usuario'}
                  </p>
                  <p className={`mt-3 inline-flex max-w-full truncate rounded-lg border px-2.5 py-1 text-xs font-black ${
                    isDark ? 'border-stone-700 bg-white/5 text-stone-300' : 'border-stone-200 bg-white text-stone-600'
                  }`}>
                    {adminSummary?.email ?? 'Sesion segura'}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {scopeCards.map((card) => {
                const styles = scopeCardStyles[card.tone]

                return (
                  <div
                    key={card.label}
                    className={`m-3 rounded-lg border px-3 py-2 ${isDark ? styles.darkBox : styles.lightBox}`}
                  >
                    <p className={`text-[11px] font-black uppercase tracking-wide ${isDark ? styles.darkLabel : styles.lightLabel}`}>
                      {card.label}
                    </p>
                    <p className={`mt-1 text-sm font-black ${isDark ? styles.darkValue : styles.lightValue}`}>{card.value}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {visibleTabs.length > 1 ? (
          <nav
            className={`mb-4 flex gap-2 overflow-x-auto rounded-lg border p-2 shadow-sm ${
              isDark ? 'border-stone-700 bg-[#211c18] shadow-black/20' : 'border-stone-200 bg-white shadow-amber-900/5'
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
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-black transition ${
                    selected && isDark
                      ? 'border-amber-300/40 bg-amber-300 text-stone-950'
                      : selected
                        ? 'border-red-900 bg-red-900 text-white'
                        : isDark
                          ? 'border-stone-700 bg-[#181411] text-stone-300 hover:bg-white/5'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <TabIcon size={16} aria-hidden="true" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        ) : null}

        <Suspense fallback={<PanelFallback theme={adminTheme} />}>
          {activeTab === 'orders' ? (
            isWarehouseAdmin ? <WarehousePurchasingPanel /> : <OrdersPanel />
          ) : activeTab === 'reports' ? (
            <ReportsPanel />
          ) : activeTab === 'operations' ? (
            <OperationsPanel />
          ) : activeTab === 'cash' ? (
            <CashPanel />
          ) : activeTab === 'inventory' ? (
            <InventoryPanel />
          ) : activeTab === 'integrations' ? (
            <IntegrationsPanel />
          ) : (
            <div className="grid gap-5">
              <RestaurantPanel
                branchId={menu.branchId}
                kitchenDisplayToken={menu.kitchenDisplayToken}
                roomDisplayToken={menu.roomDisplayToken}
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

function getAdminShellTitle(role?: OperationsRole) {
  if (role === 'superadmin') return 'Centro de control'
  if (role === 'warehouse_admin') return 'Bodega central'
  if (role === 'branch_admin') return 'Operacion de sede'
  if (role === 'cashier') return 'Caja de sede'
  return 'Operaciones'
}
