import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { getSupabaseClient } from '../../../services/menuRepository'
import type { OperationsProfile, OperationsRole } from '../operationsTypes'

const roleOrder: OperationsRole[] = ['superadmin', 'warehouse_admin', 'branch_admin', 'cashier']

function pickPrimaryRole(roles: OperationsRole[]) {
  return roles.sort((left, right) => roleOrder.indexOf(left) - roleOrder.indexOf(right))[0] ?? 'cashier'
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

export async function fetchAdminScope(): Promise<OperationsProfile> {
  if (isE2EAdminMockEnabled()) {
    return {
      userId: 'mock-superadmin',
      email: 'owner@cartamago.test',
      role: 'superadmin',
      branchIds: ['brasas-sazon', 'brasas-sazon-norte'],
      warehouseIds: ['brasas-central'],
      primaryBranchId: 'brasas-sazon',
      primaryWarehouseId: 'brasas-central',
      canManageWarehouse: true,
    }
  }

  const supabase = getSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error(userError?.message ?? 'No hay usuario autenticado.')
  }

  const user = userData.user
  const multiResult = await supabase.from('multibrand_members').select('role,warehouse_id,branch_id').eq('user_id', user.id)

  if (multiResult.error) {
    throw new Error(multiResult.error.message)
  }

  const multiRows = (multiResult.data ?? []) as Array<{
    role: OperationsRole
    warehouse_id: string | null
    branch_id: string | null
  }>
  const metadataBranchId = typeof user.user_metadata?.branch_id === 'string' ? user.user_metadata.branch_id : null
  const roles = multiRows.map((row) => row.role)
  const branchIds = uniq([...multiRows.map((row) => row.branch_id), metadataBranchId])
  const warehouseIds = uniq(multiRows.map((row) => row.warehouse_id))
  const role = pickPrimaryRole(roles.length > 0 ? roles : branchIds.length > 0 ? ['branch_admin'] : ['cashier'])
  const canManageWarehouse = role === 'superadmin' || role === 'warehouse_admin'

  return {
    userId: user.id,
    email: user.email ?? '',
    role,
    branchIds,
    warehouseIds,
    primaryBranchId: branchIds[0] ?? null,
    primaryWarehouseId: warehouseIds[0] ?? null,
    canManageWarehouse,
  }
}
