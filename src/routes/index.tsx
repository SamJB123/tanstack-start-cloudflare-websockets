import { createFileRoute, Link } from '@tanstack/react-router'
import { Dices, Palette, Terminal, Users, ArrowRight, Wifi } from 'lucide-react'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Wifi className="w-10 h-10 text-cyan-400" />
            <h1 className="text-5xl md:text-6xl font-black text-white [letter-spacing:-0.06em]">
              <span className="text-gray-300">capnweb</span>{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                + Workers
              </span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-300 mb-3 font-light">
            WebSocket RPC from browser to worker to Durable Objects
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10">
            A reference app showing how{' '}
            <a href="https://github.com/niccolozy/capnweb" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">capnweb</a>{' '}
            can route all communication over a single WebSocket &mdash; including
            TanStack Start server functions, direct RPC methods, and multiplexed
            Durable Object connections with hibernation support.
          </p>
        </div>
      </section>

      {/* Architecture diagram */}
      <section className="px-6 pb-16 -mt-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 md:p-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8 text-center">
              Architecture
            </h2>

            <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
              {/* Browser */}
              <div className="flex-1 bg-slate-700/40 border border-slate-600/60 rounded-xl p-5">
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">Browser</div>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-600/40">
                    <span className="text-gray-500">React app</span>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-cyan-500/30">
                    <span className="text-cyan-400">capnweb RPC session</span>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-600/40">
                    <span className="text-gray-500">patched </span>
                    <span className="text-gray-300 font-mono">globalThis.fetch</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center md:px-3 py-2 md:py-0">
                <div className="hidden md:flex flex-col items-center gap-1">
                  <div className="text-[10px] text-cyan-400 font-mono whitespace-nowrap">WebSocket</div>
                  <div className="text-cyan-500/60">&#x2194;</div>
                  <div className="text-[10px] text-gray-600 whitespace-nowrap">/api/ws</div>
                </div>
                <div className="md:hidden text-cyan-500/60 text-lg">&#x2195;</div>
              </div>

              {/* Worker */}
              <div className="flex-1 bg-slate-700/40 border border-slate-600/60 rounded-xl p-5">
                <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">Cloudflare Worker</div>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-purple-500/30">
                    <span className="text-purple-300">CoreRpcRoot</span>
                    <span className="text-gray-600"> .fetch() .connectCounter() ...</span>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-600/40">
                    <span className="text-gray-500">TanStack Start handler</span>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-600/40">
                    <span className="text-gray-500">DO root stubs </span>
                    <span className="text-gray-600 font-mono">#doRoots</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center md:px-3 py-2 md:py-0">
                <div className="hidden md:flex flex-col items-center gap-1">
                  <div className="text-[10px] text-amber-400 font-mono whitespace-nowrap">WebSocket</div>
                  <div className="text-amber-500/60">&#x2194;</div>
                  <div className="text-[10px] text-gray-600 whitespace-nowrap">hibernatable</div>
                </div>
                <div className="md:hidden text-amber-500/60 text-lg">&#x2195;</div>
              </div>

              {/* DOs */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex-1 bg-slate-700/40 border border-slate-600/60 rounded-xl p-5">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Durable Objects</div>
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-amber-500/20">
                      <span className="text-amber-300">SharedCounterDO</span>
                    </div>
                    <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-amber-500/20">
                      <span className="text-amber-300">SharedGuestbookDO</span>
                    </div>
                    <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-emerald-500/20">
                      <span className="text-emerald-400">hibernation + capnweb RPC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flow description */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="text-cyan-400 font-semibold mb-1">Server functions</div>
                <p className="text-gray-500 leading-relaxed">
                  TanStack Start <code className="text-gray-400">createServerFn</code> calls are
                  serialized as <code className="text-gray-400">Request</code> objects and sent over the
                  WebSocket via <code className="text-gray-400">CoreRpcRoot.fetch()</code>.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="text-purple-400 font-semibold mb-1">Direct RPC</div>
                <p className="text-gray-500 leading-relaxed">
                  Methods like <code className="text-gray-400">rollDice()</code> and{' '}
                  <code className="text-gray-400">banner()</code> run directly on the worker.
                  No HTTP round-trip, no TanStack Start overhead.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="text-amber-400 font-semibold mb-1">DO multiplexing</div>
                <p className="text-gray-500 leading-relaxed">
                  Worker opens capnweb sessions to DOs over hibernating WebSockets.
                  Child capability stubs are proxied to the browser automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Route cards */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6 text-center">
            Explore the demos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RouteCard
              to="/dice"
              icon={<Dices className="w-8 h-8" />}
              title="Dice Roller"
              description="Roll dice on the worker via capnweb RPC, compute stats via TanStack Start server functions. Both over the same WebSocket."
              color="cyan"
            />
            <RouteCard
              to="/colors"
              icon={<Palette className="w-8 h-8" />}
              title="Color Palette"
              description="Generate creative color names via worker RPC, analyze hue/saturation via server functions. See transport badges on each call."
              color="purple"
            />
            <RouteCard
              to="/ascii"
              icon={<Terminal className="w-8 h-8" />}
              title="ASCII Zoo"
              description="Render ASCII art banners on the worker, fetch animal facts from the server. Compare WebSocket vs HTTP latency."
              color="emerald"
            />
            <RouteCard
              to="/multiplexing"
              icon={<Users className="w-8 h-8" />}
              title="DO Multiplexing"
              description="Shared counter and guestbook backed by two Durable Objects with hibernation. capnweb RPC on both legs, real-time sync across tabs."
              color="amber"
              featured
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function RouteCard({
  to,
  icon,
  title,
  description,
  color,
  featured,
}: {
  to: string
  icon: React.ReactNode
  title: string
  description: string
  color: 'cyan' | 'purple' | 'emerald' | 'amber'
  featured?: boolean
}) {
  const colorMap = {
    cyan: {
      icon: 'text-cyan-400',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      shadow: 'hover:shadow-cyan-500/10',
      arrow: 'text-cyan-400 group-hover:text-cyan-300',
      tag: 'bg-cyan-500/10 text-cyan-400',
    },
    purple: {
      icon: 'text-purple-400',
      border: 'border-purple-500/30 hover:border-purple-500/60',
      shadow: 'hover:shadow-purple-500/10',
      arrow: 'text-purple-400 group-hover:text-purple-300',
      tag: 'bg-purple-500/10 text-purple-400',
    },
    emerald: {
      icon: 'text-emerald-400',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      shadow: 'hover:shadow-emerald-500/10',
      arrow: 'text-emerald-400 group-hover:text-emerald-300',
      tag: 'bg-emerald-500/10 text-emerald-400',
    },
    amber: {
      icon: 'text-amber-400',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      shadow: 'hover:shadow-amber-500/10',
      arrow: 'text-amber-400 group-hover:text-amber-300',
      tag: 'bg-amber-500/10 text-amber-400',
    },
  }

  const c = colorMap[color]

  return (
    <Link
      to={to}
      className={`group relative bg-slate-800/50 border ${c.border} rounded-xl p-6 transition-all duration-300 hover:shadow-lg ${c.shadow} flex flex-col ${featured ? 'md:col-span-2' : ''}`}
    >
      {featured && (
        <span className={`absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.tag}`}>
          New
        </span>
      )}
      <div className="flex items-start gap-4">
        <div className={c.icon}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1.5 flex items-center gap-2">
            {title}
            <ArrowRight size={16} className={`${c.arrow} transition-transform group-hover:translate-x-1`} />
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  )
}
