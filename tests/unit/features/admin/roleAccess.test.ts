import { describe, expect, it } from 'vitest'
import { adminTabInfo, getAdminTabs } from '../../../../src/features/admin/roleAccess'

function ids(tabs: { id: string }[]) {
  return tabs.map((tab) => tab.id)
}

describe('getAdminTabs', () => {
  it('superadmin en produccion (report-only) ve solo Reportes', () => {
    expect(ids(getAdminTabs('superadmin', true))).toEqual(['reports'])
  })

  it('superadmin en mock ve todos los tabs incluido Reportes', () => {
    expect(ids(getAdminTabs('superadmin', false))).toEqual(['orders', 'menu', 'inventory', 'operations', 'integrations', 'reports'])
  })

  it('warehouse_admin ve Compras (orders renombrado) y Operacion', () => {
    const tabs = getAdminTabs('warehouse_admin', false)
    expect(ids(tabs)).toEqual(['orders', 'operations'])
    expect(tabs[0].label).toBe('Compras')
    expect(tabs[0].description).toBe('Proveedores y ordenes')
  })

  it('branch_admin y cashier no ven Reportes', () => {
    expect(ids(getAdminTabs('branch_admin', false))).toEqual(['orders', 'menu', 'inventory', 'operations', 'integrations'])
    expect(ids(getAdminTabs('cashier', false))).toEqual(['orders', 'menu', 'inventory', 'operations', 'integrations'])
  })

  it('adminTabInfo expone el catalogo completo de tabs', () => {
    expect(adminTabInfo).toHaveLength(6)
    expect(adminTabInfo.map((tab) => tab.id)).toContain('reports')
  })
})