/**
 * SharedGuestbook Durable Object.
 * Maintains a list of messages that multiple clients can post to.
 * Uses hibernatable capnweb RPC so the DO can hibernate between interactions.
 * Broadcasts new entries to all connected clients via RPC callbacks.
 */

import { DurableObject } from 'cloudflare:workers'
import {
  RpcTarget,
  __experimental_newDurableObjectSessionStore,
  __experimental_newHibernatableWebSocketRpcSession,
} from 'capnweb'
import type { RpcStub } from 'capnweb'

// ── Types ──

export interface GuestbookEntry {
  name: string
  message: string
  timestamp: number
}

export interface GuestbookCallback {
  onNewEntry(entry: GuestbookEntry): void
  onSnapshot(entries: GuestbookEntry[]): void
}

// ── Guestbook capability (child RpcTarget) ──

export interface GuestbookPostResult {
  entry: GuestbookEntry
  instanceId: string
}

export interface GuestbookApi {
  getEntries(): GuestbookEntry[]
  post(name: string, message: string): GuestbookPostResult
  subscribe(callback: GuestbookCallback): void
}

class GuestbookCapability extends RpcTarget implements GuestbookApi {
  constructor(private host: SharedGuestbookDO) {
    super()
  }

  getEntries(): GuestbookEntry[] {
    return this.host.entries
  }

  post(name: string, message: string): GuestbookPostResult {
    const entry: GuestbookEntry = { name, message, timestamp: Date.now() }
    this.host.entries.push(entry)
    if (this.host.entries.length > 50) {
      this.host.entries = this.host.entries.slice(-50)
    }
    this.host.broadcastNewEntry(entry)
    this.host.schedulePersist()
    return { entry, instanceId: this.host.instanceId }
  }

  subscribe(callback: RpcStub<GuestbookCallback>): void {
    const duped = callback.dup()
    this.host.subscribers.add(duped)
    duped.onSnapshot(this.host.entries)
  }
}

// ── DO RPC root (matches demo's RootTarget pattern) ──

export interface GuestbookRootApi {
  getGuestbook(): GuestbookApi
  getInstanceId(): string
}

class GuestbookRpcRoot extends RpcTarget implements GuestbookRootApi {
  constructor(private host: SharedGuestbookDO) {
    super()
  }

  getGuestbook(): GuestbookCapability {
    return new GuestbookCapability(this.host)
  }

  getInstanceId(): string {
    return this.host.instanceId
  }
}

// ── Durable Object ──

export class SharedGuestbookDO extends DurableObject {
  instanceId = crypto.randomUUID()
  entries: GuestbookEntry[] = []
  subscribers = new Set<RpcStub<GuestbookCallback>>()
  private dirty = false

  private sessionStore: ReturnType<typeof __experimental_newDurableObjectSessionStore>
  private sessions = new Map<string, any>()
  private ready: Promise<void>

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env)
    this.sessionStore = __experimental_newDurableObjectSessionStore(ctx.storage, 'guestbook:')
    this.ready = this.init()
  }

  private async init() {
    this.entries = ((await this.ctx.storage.get('entries')) as GuestbookEntry[]) ?? []
    for (const ws of this.ctx.getWebSockets('capnweb')) {
      await this.attachSession(ws)
    }
  }

  broadcastNewEntry(entry: GuestbookEntry) {
    for (const sub of this.subscribers) {
      try {
        sub.onNewEntry(entry)
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
    await this.ctx.storage.put('entries', this.entries)
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
      new GuestbookRpcRoot(this),
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
