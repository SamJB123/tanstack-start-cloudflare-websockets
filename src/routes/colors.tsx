import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Palette, RefreshCw, Copy, Check, Server, Sparkles } from 'lucide-react'
import { getRpc } from '../ws'

export const Route = createFileRoute('/colors')({ component: ColorsPage })

function randomHex(): string {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  )
}

function generatePalette(): string[] {
  return Array.from({ length: 5 }, () => randomHex())
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function ColorsPage() {
  const [palette, setPalette] = useState(generatePalette)
  const [copied, setCopied] = useState<number | null>(null)
  const [colorNames, setColorNames] = useState<string[] | null>(null)
  const [naming, setNaming] = useState(false)

  async function fetchNames() {
    const rpc = getRpc()
    if (!rpc) return
    setNaming(true)
    try {
      const names = await rpc.nameColors(palette)
      setColorNames(names)
    } catch (e) {
      console.error('[colors] naming failed:', e)
    } finally {
      setNaming(false)
    }
  }

  function regenerate() {
    setPalette(generatePalette())
    setColorNames(null)
  }

  function copy(hex: string, i: number) {
    navigator.clipboard.writeText(hex)
    setCopied(i)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center pt-20 px-6">
      <Palette className="w-16 h-16 text-cyan-400 mb-4" />
      <h1 className="text-4xl font-bold text-white mb-2">Color Palette</h1>
      <p className="text-gray-400 mb-8">Generate random palettes. Click a swatch to copy.</p>

      <button
        onClick={regenerate}
        className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50 mb-10"
      >
        <RefreshCw size={18} />
        Generate
      </button>

      <div className="flex w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl h-64">
        {palette.map((hex, i) => {
          const light = luminance(hex) > 0.5
          return (
            <button
              key={i}
              onClick={() => copy(hex, i)}
              className="flex-1 flex flex-col items-center justify-end pb-5 transition-all hover:flex-[1.3] cursor-pointer group"
              style={{ backgroundColor: hex }}
            >
              <span
                className={`font-mono text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${light ? 'text-gray-800' : 'text-white'}`}
              >
                {copied === i ? (
                  <span className="flex items-center gap-1">
                    <Check size={14} /> Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy size={14} /> {hex}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex gap-3">
        {palette.map((hex, i) => (
          <span key={i} className="font-mono text-sm text-gray-500">
            {hex}
          </span>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          <Server size={18} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
            Server-Named Colors (via capnweb RPC)
          </h2>
        </div>
        <button
          onClick={fetchNames}
          disabled={naming}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/50 mb-6"
        >
          <Sparkles size={18} />
          {naming ? 'Naming...' : 'Name These Colors'}
        </button>
        {colorNames && (
          <div className="flex gap-3 flex-wrap justify-center">
            {colorNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: palette[i] }}
                />
                <span className="text-sm text-gray-300">{name}</span>
                <span className="text-xs text-gray-600 font-mono">{palette[i]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
