import { Wifi, Globe } from 'lucide-react'

export type Transport = 'websocket' | 'http'

const config: Record<Transport, { label: string; icon: typeof Wifi; color: string; bg: string; border: string }> = {
  websocket: {
    label: 'WebSocket',
    icon: Wifi,
    color: 'text-cyan-300',
    bg: 'bg-cyan-950/50',
    border: 'border-cyan-700/50',
  },
  http: {
    label: 'HTTP',
    icon: Globe,
    color: 'text-amber-300',
    bg: 'bg-amber-950/50',
    border: 'border-amber-700/50',
  },
}

export default function TransportBadge({ transport, latency }: { transport: Transport; latency?: number }) {
  const { label, icon: Icon, color, bg, border } = config[transport]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${color} ${bg} border ${border}`}>
      <Icon size={12} />
      brought to you by {label}
      {latency != null && (
        <span className="text-gray-500 ml-1">{latency}ms</span>
      )}
    </span>
  )
}
