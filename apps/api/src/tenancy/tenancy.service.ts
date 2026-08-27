import { Injectable } from '@nestjs/common'

export const OPERATIONS_ROLES = ['superadmin', 'warehouse_admin', 'branch_admin', 'cashier'] as const

export type OperationsRole = (typeof OPERATIONS_ROLES)[number]

export type TenantScope = {
  userId: string
  brandId: string
  role: OperationsRole
  branchId: string | null
  warehouseId: string | null
}

export type TenantScopeInput = {
  userId: string
  brandId: string
  role: string
  branchId?: string | null
  warehouseId?: string | null
}

@Injectable()
export class TenancyService {
  parseScope(input: TenantScopeInput): TenantScope {
    const role = this.parseRole(input.role)

    return {
      userId: input.userId,
      brandId: input.brandId,
      role,
      branchId: input.branchId ?? null,
      warehouseId: input.warehouseId ?? null,
    }
  }

  private parseRole(role: string): OperationsRole {
    if (OPERATIONS_ROLES.includes(role as OperationsRole)) return role as OperationsRole

    throw new Error(`Unsupported operations role: ${role}`)
  }
}
