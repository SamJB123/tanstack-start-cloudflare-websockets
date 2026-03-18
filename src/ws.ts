/**
 * Module-level WebSocket singleton with capnweb RPC layered on top.
 * Lives outside React lifecycle so it survives route changes.
 * Call initSocket() from Tanstack Start's base route (src/routes/__root.tsx).
 *
 * Provides:
 * - Auto-connecting WebSocket with reconnect
 * - capnweb RPC session layered on the socket
 * - wsFetch: a custom fetch that routes same-origin requests over WebSocket
 *   (injected into TanStack Start via createStart's serverFns.fetch option)
 * - Reactive status for UI (useSyncExternalStore-compatible)
 */

import { newWebSocketRpcSession, type RpcStub } from 'capnweb-experimental-hibernation'
import { recordTransport } from './transport-log'
import type { DemoApi } from './demo-rpc'
import type { CounterApi } from './do/shared-counter'
import type { ReactionBoardApi } from './do/shared-guestbook'

export type WsStatus = 'connected' | 'connecting' | 'disconnected'

/**
 * The server's RPC interface.
 * `fetch` is the core method that forwards requests to TanStack Start.
 * Extend with your app's own RPC methods.
 */
export interface ServerApi extends DemoApi {
  fetch(request: Request): Response
  connectCounter(roomId: string): CounterApi
  connectReactionBoard(roomId: string): ReactionBoardApi
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
  ws = new WebSocket(url)
  setStatus('connecting')

  ws.addEventListener('open', () => {
    setStatus('connected')
    rpc = newWebSocketRpcSession<ServerApi>(ws!)
  })

  ws.addEventListener('close', () => {
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

/**
 * Custom fetch that routes requests over the WebSocket RPC connection
 * instead of making a new HTTP request. Falls back to native fetch
 * if the WebSocket isn't connected.
 *
 * Injected into TanStack Start via createStart's serverFns.fetch option —
 * no globalThis.fetch patching needed.
 */
export const wsFetch: typeof globalThis.fetch = async (input, init) => {
  if (rpc) {
    const request = new Request(input, init)
    recordTransport('websocket', request.url)
    return rpc.fetch(request)
  }
  const request = new Request(input, init)
  recordTransport('http', request.url)
  return fetch(input, init)
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
