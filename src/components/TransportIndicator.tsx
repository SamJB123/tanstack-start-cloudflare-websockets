import { useSyncExternalStore } from 'react'
import { Wifi, Globe } from 'lucide-react'
import {
  getTransportSnapshot,
  subscribeTransport,
  type TransportEvent,
} from '../transport-log'

const emptyLog: Array<TransportEvent> = []

function serverSnapshot(): Array<TransportEvent> {
  return emptyLog
}

export default function TransportIndicator() {
  const log = useSyncExternalStore(subscribeTransport, getTransportSnapshot, serverSnapshot)

  const wsCount = log.filter((e) => e.transport === 'websocket').length
  const httpCount = log.filter((e) => e.transport === 'http').length
  const last = log[log.length - 1]

  if (!last) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-700/50 text-xs font-medium text-gray-400">
        No fetches yet
      </div>
    )
  }

  const isWs = last.transport === 'websocket'

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-gray-700/50 text-xs font-medium text-gray-200">
      <span className="flex items-center gap-1.5">
        {isWs ? (
          <Wifi size={14} className="text-cyan-400" />
        ) : (
          <Globe size={14} className="text-amber-400" />
        )}
        <span className={isWs ? 'text-cyan-300' : 'text-amber-300'}>
          {isWs ? 'WebSocket' : 'HTTP'}
        </span>
      </span>
      <span className="text-gray-500">|</span>
      <span className="tabular-nums">
        <span className="text-cyan-400">{wsCount}</span>
        <span className="text-gray-500"> ws </span>
        <span className="text-amber-400">{httpCount}</span>
        <span className="text-gray-500"> http</span>
      </span>
    </div>
  )
}
