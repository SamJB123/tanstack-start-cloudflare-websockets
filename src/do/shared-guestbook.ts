/**
 * SharedReactionBoard Durable Object.
 * Maintains a list of emoji reactions that multiple clients can post.
 * Uses hibernatable capnweb RPC so the DO can hibernate between interactions.
 * Broadcasts new reactions to all connected clients via RPC callbacks.
 */

import { DurableObject } from 'cloudflare:workers'
import {
  RpcTarget,
  __experimental_newDurableObjectSessionStore,
  __experimental_newHibernatableWebSocketRpcSession,
} from 'capnweb-experimental-hibernation'
import type { RpcStub } from 'capnweb-experimental-hibernation'

// ── Types ──

export interface Reaction {
  name: string
  emoji: string
  timestamp: number
}

export interface ReactionBoardCallback {
  onNewReaction(reaction: Reaction, instanceId: string): void
  onSnapshot(reactions: Reaction[], instanceId: string): void
}

// ── Reaction board capability (child RpcTarget) ──

export interface ReactResult {
  reaction: Reaction
  instanceId: string
}

export class ReactionBoardCapability extends RpcTarget {
  constructor(private host: SharedReactionBoardDO) {
    super()
  }

  getReactions(): Reaction[] {
    return this.host.reactions
  }

  react(name: string, emoji: string): ReactResult {
    const reaction: Reaction = { name, emoji, timestamp: Date.now() }
    this.host.reactions.push(reaction)
    if (this.host.reactions.length > 100) {
      this.host.reactions = this.host.reactions.slice(-100)
    }
    this.host.broadcastNewReaction(reaction)
    this.host.schedulePersist()
    return { reaction, instanceId: this.host.instanceId }
  }

  subscribe(callback: RpcStub<ReactionBoardCallback>): void {
    const duped = callback.dup()
    this.host.subscribers.add(duped)
    duped.onSnapshot(this.host.reactions, this.host.instanceId)
  }
}

// ── DO RPC root (matches demo's RootTarget pattern) ──

export class ReactionBoardRpcRoot extends RpcTarget {
  constructor(private host: SharedReactionBoardDO) {
    super()
  }

  getReactionBoard(): ReactionBoardCapability {
    return new ReactionBoardCapability(this.host)
  }

  getInstanceId(): string {
    return this.host.instanceId
  }
}

// ── Durable Object ──

export class SharedReactionBoardDO extends DurableObject {
  instanceId = crypto.randomUUID()
  reactions: Reaction[] = []
  subscribers = new Set<RpcStub<ReactionBoardCallback>>()
  private dirty = false

  private sessionStore: ReturnType<typeof __experimental_newDurableObjectSessionStore>
  private sessions = new Map<string, any>()
  private ready: Promise<void>

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env)
    this.sessionStore = __experimental_newDurableObjectSessionStore(ctx.storage, 'reactions:')
    this.ready = this.init()
  }

  private async init() {
    this.reactions = ((await this.ctx.storage.get('reactions')) as Reaction[]) ?? []
    for (const ws of this.ctx.getWebSockets('capnweb')) {
      await this.attachSession(ws)
    }
  }

  broadcastNewReaction(reaction: Reaction) {
    for (const sub of this.subscribers) {
      try {
        sub.onNewReaction(reaction, this.instanceId)
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
    await this.ctx.storage.put('reactions', this.reactions)
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
    session?.handleMessage(message)
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
      new ReactionBoardRpcRoot(this),
      {
        sessionStore: this.sessionStore,
        sessionId: knownSessionId,
        onSendError(err) { return err },
      },
    )
    if (session) {
      this.sessions.set(session.sessionId, session)
    }
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
