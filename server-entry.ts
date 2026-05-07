import tanstackHandler from '@tanstack/react-start/server-entry'
import { RpcTarget, newWorkersWebSocketRpcResponse, newWebSocketRpcSession } from 'capnweb-experimental-hibernation'
import type { RpcStub } from 'capnweb-experimental-hibernation'
import { withDemoRpc } from './src/demo-rpc'
import type { CounterCapability } from './src/do/shared-counter'
import type { ReactionBoardCapability } from './src/do/shared-guestbook'

declare module '@tanstack/react-router' {
  interface Register {
    server: {
      requestContext: Env
    }
  }
}

// Re-export DO classes so wrangler can find them
export { SharedCounterDO } from './src/do/shared-counter'
export { SharedReactionBoardDO } from './src/do/shared-guestbook'

// ── RPC root ──

let workerEnv: Env | undefined

class CoreRpcRoot extends RpcTarget {
  // Worker holds root stubs to keep DO sessions alive (like the demo client
  // holds state.root). Child capability stubs are what get passed to the
  // browser client — capnweb proxies calls through automatically.
  #doRoots = new Map<string, any>()

  /** Forward a fetch request through the TanStack Start handler and return the response. */
  async fetch(request: Request): Promise<Response> {
    return tanstackHandler.fetch(request, { context: workerEnv! })
  }

  /** Open a WebSocket to a DO and return the root stub, caching for reuse. */
  async #getDoRoot(binding: DurableObjectNamespace, roomId: string, key: string) {
    if (!this.#doRoots.has(key)) {
      const id = binding.idFromName(roomId)
      const stub = binding.get(id)

      const doRes = await stub.fetch('http://do/ws', {
        headers: { Upgrade: 'websocket' },
      })
      const doWs = doRes.webSocket
      if (!doWs) throw new Error(`DO did not return a WebSocket for ${key}`)
      doWs.accept()

      this.#doRoots.set(key, newWebSocketRpcSession(doWs))
    }
    return this.#doRoots.get(key)!
  }

  /**
   * Connect to the shared counter DO.
   * Worker gets root.getCounter() — a child RpcTarget — and passes it to
   * the browser client. capnweb proxies calls through automatically.
   */
  async connectCounter(roomId: string): Promise<RpcStub<CounterCapability>> {
    const root = await this.#getDoRoot(
      workerEnv!.SHARED_COUNTER, roomId, `counter:${roomId}`,
    )
    return root.getCounter()
  }

  /** Connect to the shared reaction board DO. */
  async connectReactionBoard(roomId: string): Promise<RpcStub<ReactionBoardCapability>> {
    const root = await this.#getDoRoot(
      workerEnv!.SHARED_GUESTBOOK, roomId, `reactions:${roomId}`,
    )
    return root.getReactionBoard()
  }
}

const RpcRoot = withDemoRpc(CoreRpcRoot)

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    workerEnv = env
    const url = new URL(request.url)

    // ── WebSocket RPC ──
    if (url.pathname === '/api/ws' && request.headers.get('Upgrade') === 'websocket') {
      return newWorkersWebSocketRpcResponse(request, new RpcRoot())
    }

    // ── Everything else → TanStack Start ──
    return tanstackHandler.fetch(request, { context: env })
  },
}
