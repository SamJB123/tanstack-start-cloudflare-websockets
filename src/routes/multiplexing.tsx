import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Hash, Smile, Users } from 'lucide-react'
import { getRpc } from '../ws'
import { RpcTarget } from 'capnweb-experimental-hibernation'
import type { RpcStub } from 'capnweb-experimental-hibernation'
import type { CounterApi, CounterCallback } from '../do/shared-counter'
import type { ReactionBoardApi, ReactionBoardCallback, Reaction } from '../do/shared-guestbook'

export const Route = createFileRoute('/multiplexing')({ component: MultiplexingPage })

const ROOM_ID = 'demo-room'

const EMOJIS = ['🎉', '🔥', '💯', '🚀', '👏', '❤️', '⚡', '✨', '🤯', '💪', '🎯', '🌈']

// ── Random name generator ──

const ADJECTIVES = [
  'Swift', 'Brave', 'Clever', 'Calm', 'Bold', 'Bright', 'Keen', 'Witty',
  'Noble', 'Quick', 'Sharp', 'Warm', 'Cool', 'Deft', 'Fair', 'Grand',
]
const ANIMALS = [
  'Fox', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Lynx', 'Deer', 'Hare',
  'Wren', 'Crow', 'Seal', 'Dove', 'Frog', 'Newt', 'Moth', 'Wasp',
]

function getOrCreateName(): string {
  if (typeof window === 'undefined') return 'Anonymous'
  const key = 'capnweb-demo-name'
  let name = localStorage.getItem(key)
  if (!name) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    name = `${adj} ${animal}`
    localStorage.setItem(key, name)
  }
  return name
}

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
        onCountChanged(c: number, id: string) {
          setCount(c)
          setInstanceId(id)
        }
      }

      await counter.subscribe(new Handler())
      setConnected(true)
    } catch (e) {
      console.error('[multiplexing] counter connect failed:', e)
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

  return { count, connected, instanceId, connect, increment, decrement }
}

// ── Reaction board hook ──

function useReactionBoard() {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [connected, setConnected] = useState(false)
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const boardRef = useRef<RpcStub<ReactionBoardApi> | null>(null)

  const connect = useCallback(async () => {
    const rpc = getRpc()
    if (!rpc) return

    try {
      const board = await rpc.connectReactionBoard(ROOM_ID)
      boardRef.current = board

      class Handler extends RpcTarget implements ReactionBoardCallback {
        onNewReaction(reaction: Reaction, id: string) {
          setReactions((prev) => [...prev.slice(-99), reaction])
          setInstanceId(id)
        }

        onSnapshot(snapshot: Reaction[], id: string) {
          setReactions(snapshot)
          setInstanceId(id)
        }
      }

      await board.subscribe(new Handler())
      setConnected(true)
    } catch (e) {
      console.error('[multiplexing] reaction board connect failed:', e)
    }
  }, [])

  const react = useCallback(async (emoji: string) => {
    if (!boardRef.current) return
    try {
      const name = getOrCreateName()
      const result = await boardRef.current.react(name, emoji)
      setInstanceId(result.instanceId)
    } catch (e) {
      console.error('[multiplexing] react failed:', e)
    }
  }, [])

  return { reactions, connected, instanceId, connect, react }
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

function InstanceBadge({ instanceId }: { instanceId: string | null }) {
  const prevIdRef = useRef<string | null>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
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
    <div className="group/tip relative inline-flex flex-col items-center">
      <div
        ref={badgeRef}
        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-all ${
          justChanged
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/20'
            : 'bg-slate-700/50 border-slate-600/50 text-gray-400'
        }`}
      >
        <span className={justChanged ? 'text-emerald-400' : 'text-gray-500'}>DO:</span>
        <span>{instanceId.slice(0, 8)}</span>
        {justChanged && <span className="ml-1 text-emerald-400">woke up!</span>}
      </div>
      {/* Tooltip */}
      <div className="pointer-events-none absolute top-full mt-2 z-40 w-56 rounded-lg bg-slate-900 border border-slate-600 px-3.5 py-2.5 text-[11px] leading-relaxed text-gray-400 shadow-xl opacity-0 scale-95 transition-all group-hover/tip:opacity-100 group-hover/tip:scale-100">
        <p className="mb-1.5">
          <span className="text-gray-200 font-medium">Instance ID</span> is generated fresh each time
          this Durable Object wakes up.
        </p>
        <p>
          If the ID changes, the DO <span className="text-emerald-400">hibernated</span> and was
          re-initialized &mdash; meaning hibernation is working.
        </p>
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-900 border-l border-t border-slate-600" />
      </div>
    </div>
  )
}

// ── Page ──

function MultiplexingPage() {
  const counter = useSharedCounter()
  const board = useReactionBoard()
  const reactionsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tryConnect = () => {
      const rpc = getRpc()
      if (rpc) {
        counter.connect()
        board.connect()
      } else {
        setTimeout(tryConnect, 500)
      }
    }
    tryConnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reactionsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [board.reactions])

  const myName = typeof window !== 'undefined' ? getOrCreateName() : ''

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
        {myName && (
          <p className="text-gray-600 text-xs mt-2">
            You are <span className="text-gray-400 font-medium">{myName}</span>
          </p>
        )}
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
            <InstanceBadge instanceId={counter.instanceId} />
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

        {/* Reaction board card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Smile size={20} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-amber-400">Reaction Board</h2>
          </div>
          <p className="text-gray-500 text-xs mb-2 text-center">
            Backed by SharedReactionBoardDO &middot; Client &harr; Worker &harr; DO
          </p>
          <div className="mb-4 text-center">
            <InstanceBadge instanceId={board.instanceId} />
          </div>

          {!board.connected ? (
            <div className="text-gray-500 text-sm animate-pulse text-center">Connecting...</div>
          ) : (
            <>
              {/* Emoji buttons */}
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => board.react(emoji)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-700/50 border border-slate-600/50 text-lg hover:bg-slate-600/50 hover:border-amber-500/40 hover:scale-110 active:scale-95 transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reaction feed */}
              <div className="flex-1 min-h-[160px] max-h-[300px] overflow-y-auto space-y-1 pr-1">
                {board.reactions.length === 0 && (
                  <p className="text-gray-600 text-sm text-center mt-8">
                    No reactions yet. Click an emoji!
                  </p>
                )}
                {board.reactions.map((r, i) => (
                  <div
                    key={`${r.timestamp}-${i}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/30"
                  >
                    <span className="text-lg">{r.emoji}</span>
                    <span className="text-amber-300/80 text-xs font-medium">{r.name}</span>
                    <span className="text-gray-600 text-[10px] ml-auto">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                <div ref={reactionsEndRef} />
              </div>
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
┌─────────────┐     capnweb RPC      ┌──────────────┐     capnweb RPC      ┌─────────────────┐
│   Browser   │ ◄──── WebSocket ────► │   Worker     │ ◄──── WebSocket ────► │ SharedCounter   │
│   (React)   │                       │  (proxy)     │                       │     (DO)        │
│             │                       │              │ ◄──── WebSocket ────► │─────────────────│
│             │                       │              │                       │ ReactionBoard   │
└─────────────┘                       └──────────────┘                       │     (DO)        │
                                                                             └─────────────────┘
        `.trim()}</pre>
      </div>
    </div>
  )
}
