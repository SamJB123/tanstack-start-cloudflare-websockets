/**
 * SharedCounter Durable Object.
 * Maintains a counter that multiple clients can increment/decrement.
 * Uses hibernatable capnweb RPC so the DO can hibernate between interactions.
 * Broadcasts count updates to all connected clients via RPC callbacks.
 */

import { DurableObject } from 'cloudflare:workers'
import {
  RpcTarget,
  __experimental_newDurableObjectSessionStore,
  __experimental_newHibernatableWebSocketRpcSession,
} from 'capnweb'
import type { RpcStub } from 'capnweb'

// ── Client callback interface ──

export interface CounterCallback {
  onCountChanged(count: number): void
}

// ── Counter capability (child RpcTarget) ──

export interface CounterResult {
  count: number
  instanceId: string
}

export interface CounterApi {
  getCount(): CounterResult
  increment(): CounterResult
  decrement(): CounterResult
  subscribe(callback: CounterCallback): void
}

class CounterCapability extends RpcTarget implements CounterApi {
  constructor(private host: SharedCounterDO) {
    super()
  }

  getCount(): CounterResult {
    return { count: this.host.count, instanceId: this.host.instanceId }
  }

  increment(): CounterResult {
    this.host.count++
    this.host.broadcast()
    this.host.schedulePersist()
    return { count: this.host.count, instanceId: this.host.instanceId }
  }

  decrement(): CounterResult {
    this.host.count--
    this.host.broadcast()
    this.host.schedulePersist()
    return { count: this.host.count, instanceId: this.host.instanceId }
  }

  subscribe(callback: RpcStub<CounterCallback>): void {
    const duped = callback.dup()
    this.host.subscribers.add(duped)
    duped.onCountChanged(this.host.count)
  }
}

// ── DO RPC root (matches demo's RootTarget pattern) ──

export interface CounterRootApi {
  getCounter(): CounterApi
  getInstanceId(): string
}

class CounterRpcRoot extends RpcTarget implements CounterRootApi {
  constructor(private host: SharedCounterDO) {
    super()
  }

  getCounter(): CounterCapability {
    return new CounterCapability(this.host)
  }

  getInstanceId(): string {
    return this.host.instanceId
  }
}

// ── Durable Object ──

export class SharedCounterDO extends DurableObject {
  instanceId = crypto.randomUUID()
  count = 0
  subscribers = new Set<RpcStub<CounterCallback>>()
  private dirty = false

  private sessionStore: ReturnType<typeof __experimental_newDurableObjectSessionStore>
  private sessions = new Map<string, any>()
  private ready: Promise<void>

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env)
    this.sessionStore = __experimental_newDurableObjectSessionStore(ctx.storage, 'counter:')
    this.ready = this.init()
  }

  private async init() {
    this.count = ((await this.ctx.storage.get('count')) as number) ?? 0
    for (const ws of this.ctx.getWebSockets('capnweb')) {
      await this.attachSession(ws)
    }
  }

  broadcast() {
    for (const sub of this.subscribers) {
      try {
        sub.onCountChanged(this.count)
      } catch {
        this.subscribers.delete(sub)
      }
    }
  }

  schedulePersist() {
    if (this.dirty) return
    this.dirty = true
    this.ctx.storage.setAlarm(Date.now() + 500)
  }

  async alarm() {
    if (!this.dirty) return
    await this.ctx.storage.put('count', this.count)
    this.dirty = false
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/instance-id') {
      return Response.json({ instanceId: this.instanceId })
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server, ['capnweb'])
    await this.ready
    await this.attachSession(server)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.ready
    const session = await this.getOrAttachSession(ws)
    session.handleMessage(message)
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    await this.ready
    const sid = this.getSessionId(ws)
    const session = sid ? this.sessions.get(sid) : undefined
    session?.handleClose(code, reason, wasClean)
    if (sid) this.sessions.delete(sid)
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    await this.ready
    const sid = this.getSessionId(ws)
    const session = sid ? this.sessions.get(sid) : undefined
    session?.handleError(error)
  }

  private async getOrAttachSession(ws: WebSocket) {
    const sid = this.getSessionId(ws)
    if (sid && this.sessions.has(sid)) return this.sessions.get(sid)
    return this.attachSession(ws)
  }

  private async attachSession(ws: WebSocket) {
    const knownSessionId = this.getSessionId(ws)
    const session = await __experimental_newHibernatableWebSocketRpcSession(
      ws as any,
      new CounterRpcRoot(this),
      {
        sessionStore: this.sessionStore,
        sessionId: knownSessionId,
        onSendError(err) { return err },
      },
    )
    this.sessions.set(session.sessionId, session)
    return session
  }

  private getSessionId(ws: WebSocket): string | undefined {
    const attachment = (ws as any).deserializeAttachment?.()
    if (attachment && attachment.version === 1 && typeof attachment.sessionId === 'string') {
      return attachment.sessionId
    }
    return undefined
  }
}
