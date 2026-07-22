import { AdminApp } from '../features/admin/AdminApp'
import { PublicMenuApp } from '../features/menu/PublicMenuApp'

export function App() {
  const isAdminRoute = window.location.pathname.startsWith('/admin')

  return isAdminRoute ? <AdminApp /> : <PublicMenuApp />
}
