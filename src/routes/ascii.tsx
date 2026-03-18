import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Terminal, Server, Send } from 'lucide-react'
import { getRpc } from '../ws'

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
    setIndex((i) => (i + 1) % ANIMALS.length)
  }
  function prev() {
    setIndex((i) => (i - 1 + ANIMALS.length) % ANIMALS.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center pt-20 px-6">
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

      <div className="flex gap-4 mt-8">
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

      <div className="mt-14 flex flex-col items-center w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Server size={18} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
            Server Banner Generator (via capnweb RPC)
          </h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Type a word and the server will render it as a block-letter ASCII banner.
        </p>
        <div className="flex gap-2 mb-4 w-full max-w-md">
          <input
            type="text"
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && renderBanner()}
            placeholder="Type a word..."
            maxLength={12}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            onClick={renderBanner}
            disabled={bannerLoading || !bannerText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/50"
          >
            <Send size={16} />
            {bannerLoading ? '...' : 'Render'}
          </button>
        </div>
        {bannerResult && (
          <div className="bg-slate-800 border border-purple-700/50 rounded-xl p-6 overflow-x-auto">
            <pre className="text-purple-300 font-mono text-sm leading-tight whitespace-pre">
              {bannerResult}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
