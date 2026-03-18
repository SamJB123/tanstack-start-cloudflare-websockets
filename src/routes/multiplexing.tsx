import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Hash, BookOpen, Users } from 'lucide-react'
import { getRpc } from '../ws'
import { RpcTarget } from 'capnweb-experimental-hibernation'
import type { RpcStub } from 'capnweb-experimental-hibernation'
import type { CounterApi, CounterCallback } from '../do/shared-counter'
import type { GuestbookApi, GuestbookCallback, GuestbookEntry } from '../do/shared-guestbook'

export const Route = createFileRoute('/multiplexing')({ component: MultiplexingPage })

const ROOM_ID = 'demo-room'

// ── Counter hook ──

function useSharedCounter() {
  const [count, setCount] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const counterRef = useRef<RpcStub<CounterApi> | null>(null)

  const connect = useCallback(async () => {
    const rpc = getRpc()
    if (!rpc) return

    try {
      const counter = await rpc.connectCounter(ROOM_ID)
      counterRef.current = counter

      class Handler extends RpcTarget implements CounterCallback {
        onCountChanged(c: number) {
          setCount(c)
        }
      }

      await counter.subscribe(new Handler())

      const id = await rpc.getCounterInstanceId(ROOM_ID)
      setInstanceId(id)

      setConnected(true)
    } catch (e) {
      console.error('[multiplexing] counter connect failed:', e)
    }
  }, [])

  const refreshInstanceId = useCallback(async () => {
    const rpc = getRpc()
    if (!rpc) return
    try {
      const id = await rpc.getCounterInstanceId(ROOM_ID)
      setInstanceId(id)
    } catch (e) {
      console.error('[multiplexing] counter instanceId fetch failed:', e)
    }
  }, [])

  const increment = useCallback(async () => {
    if (!counterRef.current) return
    try {
      const result = await counterRef.current.increment()
      setCount(result.count)
      setInstanceId(result.instanceId)
    } catch (e) {
      console.error('[multiplexing] increment failed:', e)
    }
  }, [])

  const decrement = useCallback(async () => {
    if (!counterRef.current) return
    try {
      const result = await counterRef.current.decrement()
      setCount(result.count)
      setInstanceId(result.instanceId)
    } catch (e) {
      console.error('[multiplexing] decrement failed:', e)
    }
  }, [])

  return { count, connected, instanceId, connect, increment, decrement, refreshInstanceId }
}

// ── Guestbook hook ──

function useSharedGuestbook() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const guestbookRef = useRef<RpcStub<GuestbookApi> | null>(null)

  const connect = useCallback(async () => {
    const rpc = getRpc()
    if (!rpc) return

    try {
      const guestbook = await rpc.connectGuestbook(ROOM_ID)
      guestbookRef.current = guestbook

      class Handler extends RpcTarget implements GuestbookCallback {
        onNewEntry(entry: GuestbookEntry) {
          setEntries((prev) => [...prev.slice(-49), entry])
        }

        onSnapshot(snapshot: GuestbookEntry[]) {
          setEntries(snapshot)
        }
      }

      await guestbook.subscribe(new Handler())

      const id = await rpc.getGuestbookInstanceId(ROOM_ID)
      setInstanceId(id)

      setConnected(true)
    } catch (e) {
      console.error('[multiplexing] guestbook connect failed:', e)
    }
  }, [])

  const refreshInstanceId = useCallback(async () => {
    const rpc = getRpc()
    if (!rpc) return
    try {
      const id = await rpc.getGuestbookInstanceId(ROOM_ID)
      setInstanceId(id)
    } catch (e) {
      console.error('[multiplexing] guestbook instanceId fetch failed:', e)
    }
  }, [])

  const post = useCallback(async (name: string, message: string) => {
    if (!guestbookRef.current) return
    try {
      const result = await guestbookRef.current.post(name, message)
      setInstanceId(result.instanceId)
    } catch (e) {
      console.error('[multiplexing] post failed:', e)
    }
  }, [])

  return { entries, connected, instanceId, connect, post, refreshInstanceId }
}

// ── Confetti burst ──

function spawnConfetti(container: HTMLElement) {
  const colors = ['#34d399', '#a78bfa', '#fbbf24', '#f472b6', '#60a5fa', '#fb923c']
  const count = 24
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span')
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
    const dist = 40 + Math.random() * 50
    const size = 4 + Math.random() * 4
    Object.assign(dot.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      pointerEvents: 'none',
      zIndex: '50',
      transform: 'translate(-50%, -50%) scale(1)',
      transition: `all ${0.5 + Math.random() * 0.4}s cubic-bezier(.2,1,.3,1)`,
      opacity: '1',
    })
    container.appendChild(dot)
    requestAnimationFrame(() => {
      dot.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0)`
      dot.style.opacity = '0'
    })
    setTimeout(() => dot.remove(), 1000)
  }
}

// ── Instance ID badge ──

function InstanceBadge({ label, instanceId, onRefresh }: { label: string; instanceId: string | null; onRefresh: () => void }) {
  const prevIdRef = useRef<string | null>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const [justChanged, setJustChanged] = useState(false)

  useEffect(() => {
    if (prevIdRef.current && instanceId && prevIdRef.current !== instanceId) {
      setJustChanged(true)
      if (badgeRef.current) spawnConfetti(badgeRef.current)
      const t = setTimeout(() => setJustChanged(false), 2000)
      return () => clearTimeout(t)
    }
    prevIdRef.current = instanceId
  }, [instanceId])

  if (!instanceId) return null
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        ref={badgeRef}
        onClick={onRefresh}
        title={`${label} instance: ${instanceId}\nClick to refresh`}
        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-all cursor-pointer ${
          justChanged
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/20'
            : 'bg-slate-700/50 border-slate-600/50 text-gray-400 hover:border-slate-500 hover:text-gray-300'
        }`}
      >
        <span className={justChanged ? 'text-emerald-400' : 'text-gray-500'}>{label}:</span>
        <span>{instanceId.slice(0, 8)}</span>
        {justChanged && <span className="ml-1 text-emerald-400">woke up!</span>}
      </button>
      <p className="text-[10px] text-gray-600 text-center max-w-48 leading-tight">
        If this ID changes, the DO just woke from hibernation
      </p>
    </div>
  )
}

// ── Page ──

function MultiplexingPage() {
  const counter = useSharedCounter()
  const guestbook = useSharedGuestbook()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const entriesEndRef = useRef<HTMLDivElement>(null)

  // Connect to both DOs when the page loads
  useEffect(() => {
    const tryConnect = () => {
      const rpc = getRpc()
      if (rpc) {
        counter.connect()
        guestbook.connect()
      } else {
        setTimeout(tryConnect, 500)
      }
    }
    tryConnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll guestbook
  useEffect(() => {
    entriesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [guestbook.entries])

  function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return
    guestbook.post(name.trim(), message.trim())
    setMessage('')
  }

  return (
    <div className="min-h-svh bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pt-20 px-6 pb-12">
      {/* Hero */}
      <div className="flex flex-col items-center mb-12">
        <Users className="w-16 h-16 text-amber-400 mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">DO Multiplexing</h1>
        <p className="text-gray-400 max-w-xl text-center">
          Two Durable Objects, both proxied through the worker via capnweb RPC.
          Open this page in multiple tabs to see real-time sync.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Counter card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={20} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-cyan-400">Shared Counter</h2>
          </div>
          <p className="text-gray-500 text-xs mb-2 text-center">
            Backed by SharedCounterDO &middot; Client &harr; Worker &harr; DO
          </p>
          <div className="mb-6">
            <InstanceBadge label="DO" instanceId={counter.instanceId} onRefresh={counter.refreshInstanceId} />
          </div>

          {!counter.connected ? (
            <div className="text-gray-500 text-sm animate-pulse">Connecting...</div>
          ) : (
            <>
              <div className="text-8xl font-mono font-bold text-white mb-8 tabular-nums">
                {counter.count ?? 0}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={counter.decrement}
                  className="w-14 h-14 flex items-center justify-center rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-2xl font-bold hover:bg-red-500/30 transition-colors"
                >
                  -
                </button>
                <button
                  onClick={counter.increment}
                  className="w-14 h-14 flex items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-2xl font-bold hover:bg-emerald-500/30 transition-colors"
                >
                  +
                </button>
              </div>
            </>
          )}
        </div>

        {/* Guestbook card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-amber-400">Shared Guestbook</h2>
          </div>
          <p className="text-gray-500 text-xs mb-2 text-center">
            Backed by SharedGuestbookDO &middot; Client &harr; Worker &harr; DO
          </p>
          <div className="mb-4 text-center">
            <InstanceBadge label="DO" instanceId={guestbook.instanceId} onRefresh={guestbook.refreshInstanceId} />
          </div>

          {!guestbook.connected ? (
            <div className="text-gray-500 text-sm animate-pulse text-center">Connecting...</div>
          ) : (
            <>
              {/* Entries */}
              <div className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto mb-4 space-y-2 pr-1">
                {guestbook.entries.length === 0 && (
                  <p className="text-gray-600 text-sm text-center mt-8">
                    No entries yet. Be the first!
                  </p>
                )}
                {guestbook.entries.map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="bg-slate-700/50 rounded-lg px-4 py-3 border border-slate-600/50"
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-amber-300 font-semibold text-sm">{entry.name}</span>
                      <span className="text-gray-600 text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{entry.message}</p>
                  </div>
                ))}
                <div ref={entriesEndRef} />
              </div>

              {/* Post form */}
              <form onSubmit={handlePost} className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-24 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!name.trim() || !message.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Post
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="max-w-3xl mx-auto mt-12 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
          Architecture
        </h3>
        <pre className="text-gray-400 text-xs leading-relaxed text-center font-mono whitespace-pre">{`
┌─────────────┐     capnweb RPC      ┌──────────────┐     capnweb RPC      ┌────────────────┐
│   Browser   │ ◄──── WebSocket ────► │   Worker     │ ◄──── WebSocket ────► │ SharedCounter  │
│   (React)   │                       │  (proxy)     │                       │     (DO)       │
│             │                       │              │ ◄──── WebSocket ────► │────────────────│
│             │                       │              │                       │ SharedGuestbook│
└─────────────┘                       └──────────────┘                       │     (DO)       │
                                                                             └────────────────┘
        `.trim()}</pre>
      </div>
    </div>
  )
}
