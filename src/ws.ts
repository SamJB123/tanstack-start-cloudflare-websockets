/**
 * Module-level WebSocket singleton with capnweb RPC layered on top.
 * Lives outside React lifecycle so it survives route changes.
 */

import { newWebSocketRpcSession, type RpcStub } from 'capnweb'

export type WsStatus = 'connected' | 'connecting' | 'disconnected'

export interface ServerApi {
  hello(name: string): string
  ping(): string
  rollDice(count: number): number[]
  nameColor(hex: string): string
  nameColors(hexes: string[]): string[]
  banner(text: string): string
}

let ws: WebSocket | null = null
let rpc: RpcStub<ServerApi> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let status: WsStatus = 'disconnected'
const listeners = new Set<() => void>()

const RECONNECT_DELAY = 1000

function setStatus(next: WsStatus) {
  if (status === next) return
  status = next
  listeners.forEach((fn) => fn())
}

function getWsUrl(): string {
  const origin = window.location.origin.replace(/^http/, 'ws')
  return `${origin}/api/ws`
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const url = getWsUrl()
  console.log('[ws] connecting to', url)
  ws = new WebSocket(url)
  setStatus('connecting')

  ws.addEventListener('open', () => {
    console.log('[ws] connected')
    setStatus('connected')

    // Layer capnweb RPC on top of the open WebSocket
    rpc = newWebSocketRpcSession<ServerApi>(ws!)
    console.log('[ws] capnweb RPC session created')
  })

  ws.addEventListener('close', () => {
    console.log('[ws] disconnected, reconnecting...')
    rpc = null
    ws = null
    setStatus('disconnected')
    scheduleReconnect()
  })

  ws.addEventListener('error', () => {
    // close event will fire after this, triggering reconnect
  })
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_DELAY)
}

/** Get the raw WebSocket (e.g. for readyState checks). */
export function getSocket(): WebSocket | null {
  return ws
}

/** Get the capnweb RPC stub for calling server methods. */
export function getRpc(): RpcStub<ServerApi> | null {
  return rpc
}

/** Start the connection. Call once from your app's client entry. */
export function initSocket(): void {
  if (typeof window !== 'undefined') {
    connect()
  }
}

/** useSyncExternalStore-compatible snapshot. */
export function getStatusSnapshot(): WsStatus {
  return status
}

/** useSyncExternalStore-compatible subscribe. */
export function subscribeStatus(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}
