import { describe, expect, it } from 'vitest'
import { TenancyService } from '../../../apps/api/src/tenancy/tenancy.service'

describe('TenancyService', () => {
  it('parses a supported operations scope', () => {
    const service = new TenancyService()

    expect(
      service.parseScope({
        userId: 'user-1',
        brandId: 'brand-1',
        role: 'branch_admin',
        branchId: 'branch-1',
      }),
    ).toEqual({
      userId: 'user-1',
      brandId: 'brand-1',
      role: 'branch_admin',
      branchId: 'branch-1',
      warehouseId: null,
    })
  })

  it('rejects unsupported operations roles', () => {
    const service = new TenancyService()

    expect(() =>
      service.parseScope({
        userId: 'user-1',
        brandId: 'brand-1',
        role: 'owner',
      }),
    ).toThrow('Unsupported operations role: owner')
  })
})
