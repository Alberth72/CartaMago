export type BranchLinkSet = {
  branchId: string
  menuPath: string
  menuUrl: string
  qrTargetUrl: string
  kitchenPath: string
  kitchenUrl: string
  liveRoomPath: string
  liveRoomUrl: string
  adminPath: string
  adminUrl: string
  trackingPath: (orderId: string) => string
  trackingUrl: (orderId: string) => string
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function makeUrl(origin: string, path: string) {
  return `${trimTrailingSlash(origin)}${path}`
}

export function makeBranchLinks(branchId: string, origin = globalThis.location?.origin ?? ''): BranchLinkSet {
  const encodedBranchId = encodeURIComponent(branchId)
  const menuPath = `/s/${encodedBranchId}`
  const kitchenPath = `/s/${encodedBranchId}/kitchen`
  const liveRoomPath = `/s/${encodedBranchId}/salon`
  const adminPath = '/admin'

  return {
    branchId,
    menuPath,
    menuUrl: makeUrl(origin, menuPath),
    qrTargetUrl: makeUrl(origin, menuPath),
    kitchenPath,
    kitchenUrl: makeUrl(origin, kitchenPath),
    liveRoomPath,
    liveRoomUrl: makeUrl(origin, liveRoomPath),
    adminPath,
    adminUrl: makeUrl(origin, adminPath),
    trackingPath: (orderId: string) => `/s/${encodedBranchId}/tracking/${encodeURIComponent(orderId)}`,
    trackingUrl: (orderId: string) => makeUrl(origin, `/s/${encodedBranchId}/tracking/${encodeURIComponent(orderId)}`),
  }
}
