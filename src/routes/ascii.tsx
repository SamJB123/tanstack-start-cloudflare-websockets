import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Terminal, Server, Send, Zap } from 'lucide-react'
import { getRpc } from '../ws'
import { getTransportSnapshot } from '../transport-log'
import TransportBadge, { type Transport } from '../components/TransportBadge'

const getAnimalFact = createServerFn({ method: 'GET' })
  .inputValidator((input: { animal: string }) => input)
  .handler(async ({ data }) => {
    const facts: Record<string, string[]> = {
      Cat: [
        'Cats sleep 12-16 hours per day.',
        'A group of cats is called a clowder.',
        'Cats can rotate their ears 180 degrees.',
        'Cats have over 20 vocalizations.',
      ],
      Dog: [
        'Dogs can smell about 10,000 times better than humans.',
        'A dog\'s nose print is unique, like a fingerprint.',
        'Dogs dream just like humans do.',
        'Greyhounds can run up to 45 mph.',
      ],
      Owl: [
        'Owls can rotate their heads 270 degrees.',
        'A group of owls is called a parliament.',
        'Most owls hunt at night.',
        'Owls have three eyelids.',
      ],
      Fish: [
        'Fish can feel pain.',
        'Some fish can recognize their owners.',
        'Goldfish have a memory span of at least 3 months.',
        'There are over 30,000 known species of fish.',
      ],
      Spider: [
        'Spiders are found on every continent except Antarctica.',
        'Most spiders have 8 eyes.',
        'Spider silk is stronger than steel by weight.',
        'Spiders can\'t fly, but they can balloon on silk threads.',
      ],
      Bunny: [
        'Rabbits can see nearly 360 degrees.',
        'A happy rabbit will sometimes jump and twist, called a binky.',
        'Rabbits purr when they\'re content.',
        'Baby rabbits are called kittens.',
      ],
      Bear: [
        'Polar bears have black skin under white fur.',
        'Bears can run up to 35 mph.',
        'A bear\'s sense of smell is 7x better than a bloodhound\'s.',
        'Grizzly bears can eat 90 lbs of food per day.',
      ],
    }

    const animalFacts = facts[data.animal] ?? ['No facts available for this creature.']
    const fact = animalFacts[Math.floor(Math.random() * animalFacts.length)]!

    return {
      animal: data.animal,
      fact,
      computedAt: new Date().toISOString(),
    }
  })

export const Route = createFileRoute('/ascii')({ component: AsciiPage })

const ANIMALS = [
  {
    name: 'Cat',
    art: `
  /\\_/\\
 ( o.o )
  > ^ <
 /|   |\\
(_|   |_)`,
  },
  {
    name: 'Dog',
    art: `
    / \\__
   (    @\\___
   /         O
  /   (_____/
 /_____/   U`,
  },
  {
    name: 'Owl',
    art: `
  ,_,
 (O,O)
 (   )
 -"-"-`,
  },
  {
    name: 'Fish',
    art: `
     /\\
    {  \`---._
    {        \\>
    {      _/
     \\   \`---.__
      \\/ `,
  },
  {
    name: 'Spider',
    art: `
   /\\ .-"""-. /\\
  //\\\\(  0 0  )//\\\\
 (/  \\ \\  "  / /  \\)
      \\\\\\___///
       \\\\   //
        \\\\_//`,
  },
  {
    name: 'Bunny',
    art: `
 (\\__/)
 (='.'=)
 (")_(")`,
  },
  {
    name: 'Bear',
    art: `
  ʕ•ᴥ•ʔ
 /     \\
 | HUG |
 \\     /
  -----`,
  },
]

function AsciiPage() {
  const [index, setIndex] = useState(0)
  const [bannerText, setBannerText] = useState('')
  const [bannerResult, setBannerResult] = useState<string | null>(null)
  const [bannerLoading, setBannerLoading] = useState(false)
  const [fact, setFact] = useState<string | null>(null)
  const [factLoading, setFactLoading] = useState(false)
  const [factTransport, setFactTransport] = useState<{ transport: Transport; latency: number } | null>(null)
  const animal = ANIMALS[index]

  async function renderBanner() {
    const rpc = getRpc()
    if (!rpc || !bannerText.trim()) return
    setBannerLoading(true)
    try {
      const result = await rpc.banner(bannerText.trim())
      setBannerResult(result)
    } catch (e) {
      console.error('[ascii] banner failed:', e)
    } finally {
      setBannerLoading(false)
    }
  }

  function next() {
    setFact(null)
    setFactTransport(null)
    setIndex((i) => (i + 1) % ANIMALS.length)
  }
  function prev() {
    setFact(null)
    setFactTransport(null)
    setIndex((i) => (i - 1 + ANIMALS.length) % ANIMALS.length)
  }

  return (
    <div className="min-h-svh bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pt-20 px-6 pb-12">
      {/* Hero */}
      <div className="flex flex-col items-center mb-12">
        <Terminal className="w-16 h-16 text-cyan-400 mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">ASCII Zoo</h1>
        <p className="text-gray-400 mb-10">A fine collection of text-based creatures</p>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-500 font-mono">
              {index + 1}/{ANIMALS.length}
            </span>
            <span className="text-lg font-semibold text-cyan-400">{animal.name}</span>
            <span className="text-xs text-gray-500 font-mono">*.txt</span>
          </div>
          <pre className="text-green-400 font-mono text-lg leading-snug text-center whitespace-pre min-h-[140px] flex items-center justify-center">
            {animal.art}
          </pre>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={prev}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            Prev
          </button>
          <button
            onClick={next}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Bento grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Server Function card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              Server Function
            </h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 text-center">
            Animal facts fetched via TanStack Start server function
          </p>
          <button
            onClick={async () => {
              setFactLoading(true)
              const before = getTransportSnapshot().length
              const t0 = performance.now()
              try {
                const result = await getAnimalFact({ data: { animal: animal.name } })
                const latency = Math.round(performance.now() - t0)
                const after = getTransportSnapshot()
                const newEntry = after[before]
                setFactTransport(newEntry ? { transport: newEntry.transport, latency } : null)
                setFact(result.fact)
              } finally {
                setFactLoading(false)
              }
            }}
            disabled={factLoading}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/50 text-sm mb-4"
          >
            {factLoading ? 'Loading...' : `Get ${animal.name} Fact`}
          </button>
          {fact && (
            <p className="text-sm text-emerald-300 text-center italic mb-3">
              "{fact}"
            </p>
          )}
          {factTransport && (
            <TransportBadge transport={factTransport.transport} latency={factTransport.latency} />
          )}
          {!fact && !factTransport && (
            <p className="text-gray-600 text-sm italic">No fact fetched yet</p>
          )}
        </div>

        {/* capnweb RPC card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <Server size={18} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
              capnweb RPC
            </h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 text-center">
            ASCII banner rendered on the worker via direct RPC
          </p>
          <div className="flex gap-2 mb-4 w-full max-w-sm">
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && renderBanner()}
              placeholder="Type a word..."
              maxLength={12}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
            />
            <button
              onClick={renderBanner}
              disabled={bannerLoading || !bannerText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/50 text-sm"
            >
              <Send size={14} />
              {bannerLoading ? '...' : 'Render'}
            </button>
          </div>
          {bannerResult ? (
            <div className="bg-slate-800 border border-purple-700/50 rounded-xl p-4 overflow-x-auto w-full">
              <pre className="text-purple-300 font-mono text-sm leading-tight whitespace-pre">
                {bannerResult}
              </pre>
            </div>
          ) : (
            <p className="text-gray-600 text-sm italic">No banner rendered yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
