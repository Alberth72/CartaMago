const stockSyncEventName = 'cartamago:stock-sync'
const stockSyncChannelName = 'cartamago-stock-sync'

export type StockSyncPayload = {
  branchId?: string
  warehouseId?: string
  source?: string
  at: number
}

function normalizePayload(value: unknown): StockSyncPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const candidate = value as Partial<StockSyncPayload>
  return {
    branchId: typeof candidate.branchId === 'string' ? candidate.branchId : undefined,
    warehouseId: typeof candidate.warehouseId === 'string' ? candidate.warehouseId : undefined,
    source: typeof candidate.source === 'string' ? candidate.source : undefined,
    at: typeof candidate.at === 'number' ? candidate.at : Date.now(),
  }
}

export function notifyStockChanged(payload: Omit<StockSyncPayload, 'at'> = {}) {
  if (typeof window === 'undefined') return

  const nextPayload: StockSyncPayload = { ...payload, at: Date.now() }
  window.dispatchEvent(new CustomEvent(stockSyncEventName, { detail: nextPayload }))

  try {
    window.localStorage.setItem(stockSyncEventName, JSON.stringify(nextPayload))
  } catch {
    // Best-effort cross-window sync.
  }

  try {
    const channel = new BroadcastChannel(stockSyncChannelName)
    channel.postMessage(nextPayload)
    channel.close()
  } catch {
    // BroadcastChannel is not available in every browser context.
  }
}

export function subscribeToStockChanged(onChange: (payload: StockSyncPayload) => void) {
  if (typeof window === 'undefined') return () => {}

  const onCustomEvent = (event: Event) => {
    const payload = normalizePayload((event as CustomEvent).detail)
    if (payload) onChange(payload)
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== stockSyncEventName || !event.newValue) return

    try {
      const payload = normalizePayload(JSON.parse(event.newValue))
      if (payload) onChange(payload)
    } catch {
      // Ignore malformed sync payloads from older tabs.
    }
  }
  let channel: BroadcastChannel | null = null

  window.addEventListener(stockSyncEventName, onCustomEvent)
  window.addEventListener('storage', onStorage)

  try {
    channel = new BroadcastChannel(stockSyncChannelName)
    channel.onmessage = (event) => {
      const payload = normalizePayload(event.data)
      if (payload) onChange(payload)
    }
  } catch {
    channel = null
  }

  return () => {
    window.removeEventListener(stockSyncEventName, onCustomEvent)
    window.removeEventListener('storage', onStorage)
    channel?.close()
  }
}
