import tanstackHandler from '@tanstack/react-start/server-entry'
import { RpcTarget, newWorkersWebSocketRpcResponse } from 'capnweb'
import { withDemoRpc } from './src/demo-rpc'

// ── RPC root ──

let workerEnv: Env | undefined

class CoreRpcRoot extends RpcTarget {
  /** Forward a fetch request through the TanStack Start handler and return the response. */
  async fetch(request: Request): Promise<Response> {
    return tanstackHandler.fetch(request, workerEnv)
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
    return tanstackHandler.fetch(request, env)
  },
}
