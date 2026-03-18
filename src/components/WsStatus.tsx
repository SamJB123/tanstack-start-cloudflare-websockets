import { useSyncExternalStore } from 'react'
import { getStatusSnapshot, subscribeStatus, type WsStatus } from '../ws'

const config: Record<WsStatus, { label: string; color: string; pulse: string }> = {
  connected: {
    label: 'Connected',
    color: 'bg-emerald-500',
    pulse: 'bg-emerald-400',
  },
  connecting: {
    label: 'Connecting',
    color: 'bg-amber-500',
    pulse: 'bg-amber-400',
  },
  disconnected: {
    label: 'Disconnected',
    color: 'bg-red-500',
    pulse: 'bg-red-400',
  },
}

function serverSnapshot(): WsStatus {
  return 'disconnected'
}

export default function WsStatusIndicator() {
  const status = useSyncExternalStore(subscribeStatus, getStatusSnapshot, serverSnapshot)
  const { label, color, pulse } = config[status]

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-700/50 text-xs font-medium text-gray-200">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${pulse}`}
        />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
      </span>
      {label}
    </div>
  )
}
