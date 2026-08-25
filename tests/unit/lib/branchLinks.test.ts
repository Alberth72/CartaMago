import { describe, expect, it } from 'vitest'
import { makeBranchLinks } from '../../../src/lib/branchLinks'

describe('makeBranchLinks', () => {
  it('builds scoped paths for menu, kitchen, salon, and admin', () => {
    const links = makeBranchLinks('brasas-sazon')

    expect(links.menuPath).toBe('/s/brasas-sazon')
    expect(links.kitchenPath).toBe('/s/brasas-sazon/kitchen')
    expect(links.liveRoomPath).toBe('/s/brasas-sazon/salon')
    expect(links.adminPath).toBe('/admin')
  })

  it('joins an origin without duplicating slashes', () => {
    const links = makeBranchLinks('region', 'https://app.test/')

    expect(links.menuUrl).toBe('https://app.test/s/region')
    expect(links.qrTargetUrl).toBe('https://app.test/s/region')
    expect(links.kitchenUrl).toBe('https://app.test/s/region/kitchen')
    expect(links.liveRoomUrl).toBe('https://app.test/s/region/salon')
    expect(links.adminUrl).toBe('https://app.test/admin')
  })

  it('encodes branch and tracking tokens in customer tracking URLs', () => {
    const links = makeBranchLinks('a b', 'https://app.test')

    expect(links.trackingPath('tk/abc-123')).toBe('/s/a%20b/tracking/t/tk%2Fabc-123')
    expect(links.trackingUrl('tk/abc-123')).toBe('https://app.test/s/a%20b/tracking/t/tk%2Fabc-123')
  })
})