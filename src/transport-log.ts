/**
 * Transport event tracking for diagnostics.
 * Records whether each fetch went over WebSocket or HTTP.
 */

export interface TransportEvent {
  transport: 'websocket' | 'http'
  url: string
  timestamp: number
}

let transportLog: Array<TransportEvent> = []
const transportListeners = new Set<() => void>()

export function recordTransport(transport: TransportEvent['transport'], url: string) {
  transportLog = [...transportLog, { transport, url, timestamp: Date.now() }]
  transportListeners.forEach((fn) => fn())
}

/** useSyncExternalStore-compatible snapshot of transport events. */
export function getTransportSnapshot(): Array<TransportEvent> {
  return transportLog
}

/** useSyncExternalStore-compatible subscribe for transport events. */
export function subscribeTransport(callback: () => void): () => void {
  transportListeners.add(callback)
  return () => transportListeners.delete(callback)
}
