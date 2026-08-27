export type BranchLinkSet = {
  branchId: string
  menuPath: string
  menuUrl: string
  qrTargetUrl: string
  kitchenPath: string
  kitchenUrl: string
  kitchenTokenPath: (displayToken: string) => string
  kitchenTokenUrl: (displayToken: string) => string
  liveRoomPath: string
  liveRoomUrl: string
  liveRoomTokenPath: (displayToken: string) => string
  liveRoomTokenUrl: (displayToken: string) => string
  cashTerminalPath: (cashSessionId: string, accessToken: string) => string
  cashTerminalUrl: (cashSessionId: string, accessToken: string) => string
  adminPath: string
  adminUrl: string
  trackingPath: (trackingToken: string) => string
  trackingUrl: (trackingToken: string) => string
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
    kitchenTokenPath: (displayToken: string) => `/s/${encodedBranchId}/kitchen/t/${encodeURIComponent(displayToken)}`,
    kitchenTokenUrl: (displayToken: string) => makeUrl(origin, `/s/${encodedBranchId}/kitchen/t/${encodeURIComponent(displayToken)}`),
    liveRoomPath,
    liveRoomUrl: makeUrl(origin, liveRoomPath),
    liveRoomTokenPath: (displayToken: string) => `/s/${encodedBranchId}/salon/t/${encodeURIComponent(displayToken)}`,
    liveRoomTokenUrl: (displayToken: string) => makeUrl(origin, `/s/${encodedBranchId}/salon/t/${encodeURIComponent(displayToken)}`),
    cashTerminalPath: (cashSessionId: string, accessToken: string) =>
      `/s/${encodedBranchId}/caja/${encodeURIComponent(cashSessionId)}/t/${encodeURIComponent(accessToken)}`,
    cashTerminalUrl: (cashSessionId: string, accessToken: string) =>
      makeUrl(origin, `/s/${encodedBranchId}/caja/${encodeURIComponent(cashSessionId)}/t/${encodeURIComponent(accessToken)}`),
    adminPath,
    adminUrl: makeUrl(origin, adminPath),
    trackingPath: (trackingToken: string) => `/s/${encodedBranchId}/tracking/t/${encodeURIComponent(trackingToken)}`,
    trackingUrl: (trackingToken: string) => makeUrl(origin, `/s/${encodedBranchId}/tracking/t/${encodeURIComponent(trackingToken)}`),
  }
}
