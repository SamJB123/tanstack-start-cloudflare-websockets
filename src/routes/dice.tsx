import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Dices, Server, Zap } from 'lucide-react'
import { getRpc } from '../ws'
import { getTransportSnapshot } from '../transport-log'
import TransportBadge, { type Transport } from '../components/TransportBadge'

const getServerStats = createServerFn({ method: 'GET' })
  .inputValidator((input: { rolls: number[] }) => input)
  .handler(async ({ data }) => {
    const { rolls } = data
    const sum = rolls.reduce((a, b) => a + b, 0)
    const avg = rolls.length > 0 ? sum / rolls.length : 0
    const max = rolls.length > 0 ? Math.max(...rolls) : 0
    const min = rolls.length > 0 ? Math.min(...rolls) : 0
    return {
      sum,
      avg: Math.round(avg * 100) / 100,
      max,
      min,
      count: rolls.length,
      computedAt: new Date().toISOString(),
    }
  })

export const Route = createFileRoute('/dice')({ component: DicePage })

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function DicePage() {
  const [dice, setDice] = useState([0, 0])
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [serverDice, setServerDice] = useState<number[] | null>(null)
  const [serverRolling, setServerRolling] = useState(false)
  const [serverLatency, setServerLatency] = useState<number | null>(null)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getServerStats>> | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsTransport, setStatsTransport] = useState<{ transport: Transport; latency: number } | null>(null)

  function roll() {
    setRolling(true)
    let ticks = 0
    const interval = setInterval(() => {
      setDice([Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)])
      ticks++
      if (ticks > 10) {
        clearInterval(interval)
        const final = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)]
        setDice(final)
        setHistory((h) => [...h, final[0] + final[1] + 2])
        setRolling(false)
      }
    }, 60)
  }

  async function serverRoll() {
    const rpc = getRpc()
    if (!rpc) return
    setServerRolling(true)
    const t0 = performance.now()
    try {
      const results = await rpc.rollDice(5)
      setServerLatency(Math.round(performance.now() - t0))
      setServerDice(results)
    } catch (e) {
      console.error('[dice] server roll failed:', e)
    } finally {
      setServerRolling(false)
    }
  }

  const total = dice[0] + dice[1] + 2

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pt-20 px-6 pb-12">
      {/* Hero */}
      <div className="flex flex-col items-center mb-12">
        <Dices className="w-16 h-16 text-cyan-400 mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">Dice Roller</h1>
        <p className="text-gray-400 mb-10">Test your luck</p>

        <div className="flex gap-8 mb-8">
          {dice.map((d, i) => (
            <div
              key={i}
              className={`text-9xl select-none transition-transform duration-150 ${rolling ? 'animate-bounce' : ''}`}
            >
              {FACES[d]}
            </div>
          ))}
        </div>

        <p className="text-2xl text-gray-300 mb-6 font-mono">
          Total: <span className="text-cyan-400 font-bold">{total}</span>
        </p>

        <button
          onClick={roll}
          disabled={rolling}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50 text-lg"
        >
          {rolling ? 'Rolling...' : 'Roll!'}
        </button>
      </div>

      {/* Bento grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* capnweb RPC card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <Server size={18} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
              capnweb RPC
            </h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 text-center">
            Dice rolled on the Cloudflare Worker via direct RPC
          </p>
          <button
            onClick={serverRoll}
            disabled={serverRolling}
            className="px-5 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/50 text-sm mb-4"
          >
            {serverRolling ? 'Rolling...' : 'Roll 5d6 on Server'}
          </button>
          {serverDice && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {serverDice.map((d, i) => (
                  <span
                    key={i}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-900/50 border border-purple-700 text-purple-300 text-lg font-mono font-bold"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <span className="text-gray-500 text-sm">
                = <span className="text-purple-300 font-bold">{serverDice.reduce((a, b) => a + b, 0)}</span>
                {serverLatency !== null && (
                  <span className="text-gray-600 text-xs font-mono ml-2">{serverLatency}ms</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Server Function card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              Server Function
            </h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 text-center">
            Stats computed on the server via TanStack Start
          </p>
          <button
            onClick={async () => {
              setStatsLoading(true)
              const before = getTransportSnapshot().length
              const t0 = performance.now()
              try {
                const result = await getServerStats({ data: { rolls: history } })
                const latency = Math.round(performance.now() - t0)
                const after = getTransportSnapshot()
                const newEntry = after[before]
                setStatsTransport(newEntry ? { transport: newEntry.transport, latency } : null)
                setStats(result)
              } finally {
                setStatsLoading(false)
              }
            }}
            disabled={statsLoading || history.length === 0}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/50 text-sm mb-4"
          >
            {statsLoading ? 'Computing...' : 'Compute Stats'}
          </button>
          {stats && (
            <div className="grid grid-cols-2 gap-2 text-sm w-full">
              <div className="px-3 py-2 rounded-lg bg-slate-800 border border-emerald-700/50 text-center">
                <div className="text-gray-500 text-xs">Rolls</div>
                <div className="text-emerald-300 font-mono font-bold">{stats.count}</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-800 border border-emerald-700/50 text-center">
                <div className="text-gray-500 text-xs">Average</div>
                <div className="text-emerald-300 font-mono font-bold">{stats.avg}</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-800 border border-emerald-700/50 text-center">
                <div className="text-gray-500 text-xs">Min</div>
                <div className="text-emerald-300 font-mono font-bold">{stats.min}</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-800 border border-emerald-700/50 text-center">
                <div className="text-gray-500 text-xs">Max</div>
                <div className="text-emerald-300 font-mono font-bold">{stats.max}</div>
              </div>
            </div>
          )}
          {statsTransport && (
            <div className="mt-3">
              <TransportBadge transport={statsTransport.transport} latency={statsTransport.latency} />
            </div>
          )}
        </div>

        {/* Roll History card */}
        {history.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Roll History
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {history.map((h, i) => (
                <span
                  key={i}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-700 text-gray-300 text-sm font-mono"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
