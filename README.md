# TanStack Start + Cloudflare Workers + WebSocket RPC

A reference starter that runs [TanStack Start](https://tanstack.com/start) on [Cloudflare Workers](https://developers.cloudflare.com/workers/) with all server communication routed over a single persistent WebSocket connection using [capnweb](https://github.com/cloudflare/capnweb) RPC.

Both TanStack Start **server functions** (`createServerFn`) and custom **worker RPC methods** share the same WebSocket, with automatic fallback to HTTP when the socket is unavailable.

## How it works

### Architecture

```
Browser                          Cloudflare Worker
──────                          ─────────────────
                                 server-entry.ts
globalThis.fetch ──┐                   │
  (patched)        │             ┌─────┴──────┐
                   ▼             ▼             ▼
              ┌─────────┐   CoreRpcRoot    DemoRpc
              │ capnweb  │   .fetch()      .rollDice()
              │   RPC    │      │          .banner()
              │ session  │◄─────┤          .nameColors()
              └────┬─────┘      │              ...
                   │            ▼
                WebSocket   tanstackHandler
               /api/ws       .fetch()
```

### Server functions over WebSocket

TanStack Start server functions normally make HTTP fetch requests to endpoints like `POST /rsc/__ACTIONS_0`. This starter reroutes them over WebSocket in three layers:

1. **`src/ws.ts`** — Patches `globalThis.fetch` so all same-origin requests go through the capnweb RPC session's `fetch()` method instead of HTTP
2. **`src/start.ts`** — Injects a `wsFetch` function into TanStack Start's `createStart()` via the `serverFns.fetch` option (the framework's official hook for custom transport)
3. **`server-entry.ts`** — The `CoreRpcRoot` class exposes a `fetch(request): Response` method that forwards incoming requests to `tanstackHandler.fetch()`, which is the standard TanStack Start SSR handler

The result: `createServerFn` calls are serialized as `Request` objects, sent over the WebSocket as capnweb RPC calls to `CoreRpcRoot.fetch()`, processed by TanStack Start on the worker, and the `Response` comes back over the same socket. App code doesn't need to know any of this — server functions just work.

### Direct RPC methods

For worker-only logic that doesn't need TanStack Start's server function machinery, you can define methods directly on the `RpcTarget` subclass. The `withDemoRpc` mixin adds methods like `rollDice()`, `banner()`, and `nameColors()` that are callable from the client as typed async method calls:

```ts
const rpc = getRpc()
const results = await rpc.rollDice(5)     // number[]
const banner = await rpc.banner('HELLO')  // string
```

These bypass TanStack Start entirely — capnweb handles serialization, dispatch, and return values directly.

### Connection lifecycle

`initSocket()` is called once from the root route (`src/routes/__root.tsx`). It:

- Opens a WebSocket to `/api/ws`
- Creates a capnweb RPC session on the socket
- Patches `globalThis.fetch` to prefer WebSocket for same-origin requests
- Reconnects automatically on disconnect (1s delay)
- Falls back to native HTTP when the socket isn't connected

## Demo pages

Each demo page showcases both transport types side by side, with transport badges showing whether each call went over WebSocket or HTTP and the round-trip latency.

| Route | Server Function | capnweb RPC |
|-------|----------------|-------------|
| `/dice` | Compute roll statistics on the server | Roll dice on the worker |
| `/ascii` | Fetch animal facts | Render ASCII art banners |
| `/colors` | Analyze color properties (hue, saturation, lightness) | Generate creative color names |

## Project structure

```
server-entry.ts          Cloudflare Worker entry; WebSocket upgrade + RPC root
src/
  start.ts               TanStack Start config; injects wsFetch as server function transport
  ws.ts                  WebSocket singleton; capnweb RPC session; global fetch patch
  transport-log.ts       Observable log of transport events (ws vs http) for UI
  demo-rpc.ts            Demo RPC method definitions + DemoApi type
  router.tsx             TanStack Router config
  routes/
    __root.tsx           Root layout; calls initSocket()
    index.tsx            Home page
    dice.tsx             Dice roller demo
    ascii.tsx            ASCII art zoo demo
    colors.tsx           Color palette demo
  components/
    Header.tsx           Nav header with WebSocket status indicator
    TransportBadge.tsx   Badge showing transport type + latency
    TransportIndicator.tsx  Aggregate WebSocket vs HTTP fetch counts
```

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server runs on `http://localhost:3000`. The WebSocket connects automatically.

## Deploy to Cloudflare

```bash
pnpm deploy
```

This runs `vite build` then `wrangler deploy` using the config in `wrangler.jsonc`.

## Adding your own RPC methods

1. Define the client-side type in a shared interface:

```ts
export interface MyApi {
  myMethod(arg: string): string
}
```

2. Implement the method on an `RpcTarget` subclass or mixin (see `src/demo-rpc.ts` for the pattern)

3. Add the interface to `ServerApi` in `src/ws.ts`:

```ts
export interface ServerApi extends DemoApi, MyApi {
  fetch(request: Request): Response
}
```

The method is now callable from the client via `getRpc().myMethod('hello')`.
