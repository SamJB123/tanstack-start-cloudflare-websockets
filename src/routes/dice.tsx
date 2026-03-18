import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Dices, Server } from 'lucide-react'
import { getRpc } from '../ws'

export const Route = createFileRoute('/dice')({ component: DicePage })

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function DicePage() {
  const [dice, setDice] = useState([0, 0])
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [serverDice, setServerDice] = useState<number[] | null>(null)
  const [serverRolling, setServerRolling] = useState(false)
  const [serverLatency, setServerLatency] = useState<number | null>(null)

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center pt-20 px-6">
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

      <div className="mt-14 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          <Server size={18} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
            Server Roll (via capnweb RPC)
          </h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          These dice are rolled on the Cloudflare Worker and returned over the WebSocket.
        </p>
        <button
          onClick={serverRoll}
          disabled={serverRolling}
          className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/50 mb-4"
        >
          {serverRolling ? 'Rolling on server...' : 'Roll 5d6 on Server'}
        </button>
        {serverDice && (
          <div className="flex items-center gap-3 mt-2">
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
            <span className="text-gray-500 text-sm ml-2">
              = <span className="text-purple-300 font-bold">{serverDice.reduce((a, b) => a + b, 0)}</span>
            </span>
            {serverLatency !== null && (
              <span className="text-gray-600 text-xs font-mono ml-2">{serverLatency}ms</span>
            )}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-12 w-full max-w-md">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Roll History
          </h2>
          <div className="flex flex-wrap gap-2">
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
  )
}
