import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Palette, RefreshCw, Copy, Check, Server, Sparkles, Zap } from 'lucide-react'
import { getRpc } from '../ws'
import { getTransportSnapshot } from '../transport-log'
import TransportBadge, { type Transport } from '../components/TransportBadge'

const analyzeColor = createServerFn({ method: 'GET' })
  .inputValidator((input: { hex: string }) => input)
  .handler(async ({ data }) => {
    const { hex } = data
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    const max = Math.max(r, g, b) / 255
    const min = Math.min(r, g, b) / 255
    const l = (max + min) / 2
    const s = max === min ? 0 : l > 0.5
      ? (max - min) / (2 - max - min)
      : (max - min) / (max + min)

    let family = 'Gray'
    if (s > 0.15) {
      const hueMap: [number, string][] = [
        [30, 'Red'], [60, 'Orange'], [90, 'Yellow'], [150, 'Green'],
        [210, 'Cyan'], [270, 'Blue'], [330, 'Purple'], [360, 'Red'],
      ]
      let h = 0
      const d = max - min
      if (d > 0) {
        if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) * 60
        else if (max === g / 255) h = ((b / 255 - r / 255) / d + 2) * 60
        else h = ((r / 255 - g / 255) / d + 4) * 60
      }
      family = (hueMap.find(([deg]) => h < deg) ?? hueMap[hueMap.length - 1]!)[1]
    }

    const brightness = l > 0.7 ? 'Light' : l > 0.3 ? 'Medium' : 'Dark'

    return {
      rgb: { r, g, b },
      lightness: Math.round(l * 100),
      saturation: Math.round(s * 100),
      family,
      brightness,
      computedAt: new Date().toISOString(),
    }
  })

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
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof analyzeColor>> | null>(null)
  const [analyzingIdx, setAnalyzingIdx] = useState<number | null>(null)
  const [analysisTransport, setAnalysisTransport] = useState<{ transport: Transport; latency: number } | null>(null)

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
    setAnalysis(null)
    setAnalysisTransport(null)
  }

  function copy(hex: string, i: number) {
    navigator.clipboard.writeText(hex)
    setCopied(i)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pt-20 px-6 pb-12">
      {/* Hero */}
      <div className="flex flex-col items-center mb-12">
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

        <div className="mt-6 flex gap-3">
          {palette.map((hex, i) => (
            <span key={i} className="font-mono text-sm text-gray-500">{hex}</span>
          ))}
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
            Pick a color to analyze via TanStack Start
          </p>
          <div className="flex gap-2 mb-4">
            {palette.map((hex, i) => (
              <button
                key={i}
                onClick={async () => {
                  setAnalyzingIdx(i)
                  const before = getTransportSnapshot().length
                  const t0 = performance.now()
                  try {
                    const result = await analyzeColor({ data: { hex } })
                    const latency = Math.round(performance.now() - t0)
                    const after = getTransportSnapshot()
                    const newEntry = after[before]
                    setAnalysisTransport(newEntry ? { transport: newEntry.transport, latency } : null)
                    setAnalysis(result)
                  } finally {
                    setAnalyzingIdx(null)
                  }
                }}
                disabled={analyzingIdx !== null}
                className="w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 disabled:opacity-50"
                style={{
                  backgroundColor: hex,
                  borderColor: analyzingIdx === i ? '#34d399' : 'transparent',
                }}
                title={hex}
              />
            ))}
          </div>
          {analysis ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex gap-2 flex-wrap justify-center text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-emerald-700/50 text-emerald-300">
                  {analysis.brightness} {analysis.family}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-emerald-700/50 text-gray-300">
                  RGB({analysis.rgb.r}, {analysis.rgb.g}, {analysis.rgb.b})
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-emerald-700/50 text-gray-300">
                  {analysis.lightness}% light
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-emerald-700/50 text-gray-300">
                  {analysis.saturation}% sat
                </span>
              </div>
              {analysisTransport && (
                <TransportBadge transport={analysisTransport.transport} latency={analysisTransport.latency} />
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-sm italic">No color analyzed yet</p>
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
            Creative color names generated on the worker via direct RPC
          </p>
          <button
            onClick={fetchNames}
            disabled={naming}
            className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/50 text-sm mb-4"
          >
            <Sparkles size={18} />
            {naming ? 'Naming...' : 'Name These Colors'}
          </button>
          {colorNames && (
            <div className="flex gap-2 flex-wrap justify-center">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
