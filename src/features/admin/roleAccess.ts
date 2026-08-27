import type { OperationsRole } from './operationsTypes'

export type AdminTabId = 'orders' | 'menu' | 'operations' | 'cash' | 'inventory' | 'integrations' | 'reports'

export type AdminTabInfo = {
  id: AdminTabId
  label: string
  description: string
  badge: string
}

export const adminTabInfo: AdminTabInfo[] = [
  { id: 'orders', label: 'Pedidos', description: 'Bandeja, pagos y estados', badge: 'Operativo' },
  { id: 'menu', label: 'Menu', description: 'Productos, categorias y precios', badge: 'Carta' },
  { id: 'inventory', label: 'Inventario', description: 'Stock, insumos y mermas', badge: 'Merma' },
  { id: 'operations', label: 'Operacion', description: 'Bodega, sedes y despachos', badge: 'Bodega' },
  { id: 'cash', label: 'Caja', description: 'Apertura, venta y cuadre', badge: 'POS' },
  { id: 'integrations', label: 'Integraciones', description: 'DiDiFood, pagos y canales', badge: 'Setup' },
  { id: 'reports', label: 'Reportes', description: 'Informes consolidados de marca', badge: 'Info' },
]

/**
 * Tabs visibles por rol.
 * - `isReportOnlySuperadmin` (produccion/localdb): superadmin ve SOLO reportes.
 * - `warehouse_admin`: Compras (orders renombrado) + Operacion.
 * - `superadmin` en mock (dev:mock/e2e): ve todo incluido Reportes (testing).
 * - `branch_admin`: todo excepto Reportes.
 * - `cashier`: pedidos y caja.
 */
export function getAdminTabs(role: OperationsRole, isReportOnlySuperadmin: boolean): AdminTabInfo[] {
  if (isReportOnlySuperadmin) {
    return adminTabInfo.filter((tab) => tab.id === 'reports')
  }
  if (role === 'warehouse_admin') {
    return adminTabInfo
      .filter((tab) => tab.id === 'orders' || tab.id === 'operations')
      .map((tab) =>
        tab.id === 'orders'
          ? { ...tab, label: 'Compras', description: 'Proveedores y ordenes', badge: 'Proveedor' }
          : tab,
      )
  }
  if (role === 'superadmin') return adminTabInfo
  if (role === 'cashier') return adminTabInfo.filter((tab) => tab.id === 'orders' || tab.id === 'cash')
  return adminTabInfo.filter((tab) => tab.id !== 'reports')
}
