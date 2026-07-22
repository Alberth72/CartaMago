import { isSupabaseConfigured } from '../../services/menuRepository'
import { AdminSetupNotice } from './components/AdminSetupNotice'
import { AdminShell } from './components/AdminShell'
import { CategoryPanel } from './components/CategoryPanel'
import { LoginForm } from './components/LoginForm'
import { ProductEditor } from './components/ProductEditor'
import { ProductGrid } from './components/ProductGrid'
import { RestaurantPanel } from './components/RestaurantPanel'
import { useAdminAuth } from './hooks/useAdminAuth'
import { useAdminMenu } from './hooks/useAdminMenu'

export function AdminApp() {
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
    return <AdminShell title="Brasas & Sazon Admin" subtitle="Cargando sesion..." />
  }

  if (!auth.isLoggedIn) {
    return (
      <AdminShell title="Brasas & Sazon Admin" subtitle="Ingresa para editar el menu publico">
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
    <AdminShell title="Brasas & Sazon Admin" subtitle="Edita productos, precios, disponibilidad e imagenes">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[320px_1fr_420px]">
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
    </AdminShell>
  )
}
