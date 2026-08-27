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

  it('encodes operational display tokens for kitchen and room screens', () => {
    const links = makeBranchLinks('a b', 'https://app.test')

    expect(links.kitchenTokenPath('kd/abc-123')).toBe('/s/a%20b/kitchen/t/kd%2Fabc-123')
    expect(links.kitchenTokenUrl('kd/abc-123')).toBe('https://app.test/s/a%20b/kitchen/t/kd%2Fabc-123')
    expect(links.liveRoomTokenPath('rd/abc-123')).toBe('/s/a%20b/salon/t/rd%2Fabc-123')
    expect(links.liveRoomTokenUrl('rd/abc-123')).toBe('https://app.test/s/a%20b/salon/t/rd%2Fabc-123')
  })

  it('encodes cash terminal links by session token', () => {
    const links = makeBranchLinks('a b', 'https://app.test')

    expect(links.cashTerminalPath('cash/1', 'cs/abc-123')).toBe('/s/a%20b/caja/cash%2F1/t/cs%2Fabc-123')
    expect(links.cashTerminalUrl('cash/1', 'cs/abc-123')).toBe('https://app.test/s/a%20b/caja/cash%2F1/t/cs%2Fabc-123')
  })
})
