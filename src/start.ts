/**
 * TanStack Start "start entry" — auto-discovered by convention.
 *
 * The TanStack Start vite plugin scans `src/` for a file named `start.ts` (or
 * `start.tsx`). If found, it's aliased as `#tanstack-start-entry` and imported
 * automatically by both the client and server bundles. You never import this
 * file yourself — just having it here with an exported `startInstance` is enough.
 *
 * This is one of several magic file locations the framework uses. All paths
 * are relative to `srcDirectory` (default: `src/`) and can be overridden in
 * the TanStack Start vite plugin config.
 *
 * Auto-discovered entries (convention-based, no manual import needed):
 *
 *   src/router.tsx   — Router entry (REQUIRED). Must export `getRouter()`.
 *                      Aliased as `#tanstack-router-entry`. Defines the route
 *                      tree, scroll restoration, preload behavior, etc.
 *
 *   src/start.ts     — Start entry (this file, optional). Must export
 *                      `startInstance` created via `createStart()`. Configures
 *                      framework-level options: custom fetch for server
 *                      functions, request/function middleware, serialization
 *                      adapters, default SSR behavior. If absent, defaults
 *                      are used.
 *
 *   src/client.tsx   — Client entry (optional). Hydration bootstrap code.
 *                      If absent, the framework default is used (React
 *                      `hydrateRoot` with `<StartClient />`).
 *
 *   src/server.ts    — Server entry (optional). The SSR request handler.
 *                      If absent, the framework default from
 *                      `@tanstack/react-start/server-entry` is used (i.e.
 *                      `createStartHandler(defaultStreamHandler)`).
 *
 *   src/routes/      — File-based routing directory. Each file becomes a route
 *                      (e.g. `src/routes/index.tsx` → `/`, `src/routes/dice.tsx`
 *                      → `/dice`). `__root.tsx` defines the root layout.
 *                      The plugin generates `src/routeTree.gen.ts` from this.
 *
 * Not auto-discovered (referenced externally):
 *
 *   server-entry.ts  — Cloudflare Worker (or other runtime) entry point.
 *                      Referenced by `wrangler.jsonc` `main` field, not by
 *                      the TanStack Start plugin.
 *
 * The `startInstance` here injects `wsFetch` into TanStack Start's server
 * function pipeline via the framework's official `serverFns.fetch` option.
 * It only covers calls made through `createServerFn` — TanStack Start's RPC layer.
 *
 * Note: the `globalThis.fetch` patch in `ws.ts` is a superset of this approach —
 * it naturally captures all same-origin fetches (including server functions) at a
 * lower level. Both are active; this file is kept as the idiomatic framework hook.
 */
import { createStart } from '@tanstack/react-start'
import { wsFetch } from './ws'

export const startInstance = createStart(() => {
  return {
    serverFns: {
      fetch: wsFetch,
    },
  }
})
