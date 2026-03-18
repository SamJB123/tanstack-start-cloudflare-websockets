import tanstackHandler from '@tanstack/react-start/server-entry'
import { RpcTarget, newWorkersWebSocketRpcResponse, newWebSocketRpcSession } from 'capnweb-experimental-hibernation'
import { withDemoRpc } from './src/demo-rpc'

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

  /** Open a WebSocket RPC session to a DO, caching for reuse. */
  async #connectDo<T extends Rpc.DurableObjectBranded | undefined>(binding: DurableObjectNamespace<T>, roomId: string, key: string) {
    if (!this.#doRoots.has(key)) {
      const id = binding.idFromName(roomId)
      const doRes = await binding.get(id).fetch('http://do/ws', {
        headers: { Upgrade: 'websocket' },
      })
      const doWs = doRes.webSocket
      if (!doWs) throw new Error(`DO did not return a WebSocket for ${key}`)
      doWs.accept()
      this.#doRoots.set(key, newWebSocketRpcSession(doWs))
    }
    return this.#doRoots.get(key)!
  }

  /** Connect to the shared counter DO. */
  async connectCounter(roomId: string) {
    const root = await this.#connectDo(workerEnv!.SHARED_COUNTER, roomId, `counter:${roomId}`)
    return root.getCounter()
  }

  /** Connect to the shared reaction board DO. */
  async connectReactionBoard(roomId: string) {
    const root = await this.#connectDo(workerEnv!.SHARED_GUESTBOOK, roomId, `reactions:${roomId}`)
    return root.getReactionBoard()
  }
}

const RpcRoot = withDemoRpc(CoreRpcRoot)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
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
 