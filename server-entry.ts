import tanstackHandler from '@tanstack/react-start/server-entry'
import { RpcTarget, newWorkersWebSocketRpcResponse } from 'capnweb'

// ── Color name data ──

const COLOR_ADJECTIVES = [
  'Faded', 'Vivid', 'Dusty', 'Electric', 'Misty', 'Solar', 'Frozen',
  'Molten', 'Ancient', 'Neon', 'Twilight', 'Cosmic', 'Velvet', 'Burnt',
  'Crystal', 'Smoky', 'Golden', 'Lunar', 'Savage', 'Phantom',
]

const COLOR_NOUNS = [
  'Ember', 'Tide', 'Petal', 'Storm', 'Jade', 'Coral', 'Moss',
  'Dusk', 'Flame', 'Frost', 'Haze', 'Silk', 'Clay', 'Plum',
  'Sage', 'Rust', 'Mist', 'Ash', 'Bloom', 'Stone',
]

function nameColor(hex: string): string {
  // Deterministic-ish name from the hex value
  const n = parseInt(hex.replace('#', ''), 16)
  const adj = COLOR_ADJECTIVES[n % COLOR_ADJECTIVES.length]!
  const noun = COLOR_NOUNS[(n >> 8) % COLOR_NOUNS.length]!
  return `${adj} ${noun}`
}

// ── ASCII banner ──

const BANNER_FONT: Record<string, string[]> = {
  A: ['  #  ', ' # # ', '#####', '#   #', '#   #'],
  B: ['#### ', '#   #', '#### ', '#   #', '#### '],
  C: [' ####', '#    ', '#    ', '#    ', ' ####'],
  D: ['#### ', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#### ', '#    ', '#####'],
  F: ['#####', '#    ', '#### ', '#    ', '#    '],
  G: [' ####', '#    ', '# ###', '#   #', ' ####'],
  H: ['#   #', '#   #', '#####', '#   #', '#   #'],
  I: ['#####', '  #  ', '  #  ', '  #  ', '#####'],
  J: ['#####', '    #', '    #', '#   #', ' ### '],
  K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#### ', '#    ', '#    '],
  Q: [' ### ', '#   #', '# # #', '#  ##', ' ####'],
  R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
  S: [' ####', '#    ', ' ### ', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', ' # # ', ' # # ', '  #  '],
  W: ['#   #', '#   #', '# # #', '## ##', '#   #'],
  X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
  Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '   # ', '  #  ', ' #   ', '#####'],
  ' ': ['     ', '     ', '     ', '     ', '     '],
  '!': ['  #  ', '  #  ', '  #  ', '     ', '  #  '],
  '?': [' ### ', '#   #', '  ## ', '     ', '  #  '],
}

function toBanner(text: string): string {
  const chars = text.toUpperCase().split('')
  const rows: string[] = []
  for (let row = 0; row < 5; row++) {
    rows.push(
      chars
        .map((ch) => (BANNER_FONT[ch] ?? BANNER_FONT['?'])![row])
        .join(' ')
    )
  }
  return rows.join('\n')
}

// ── RPC root ──

class RpcRoot extends RpcTarget {
  hello(name: string): string {
    console.log(`[RPC] hello called with: ${name}`)
    return `Hello, ${name}!`
  }

  ping(): string {
    return 'pong'
  }

  rollDice(count: number): number[] {
    const results: number[] = []
    for (let i = 0; i < Math.min(count, 20); i++) {
      results.push(Math.floor(Math.random() * 6) + 1)
    }
    console.log(`[RPC] rollDice(${count}) → [${results}]`)
    return results
  }

  nameColor(hex: string): string {
    const name = nameColor(hex)
    console.log(`[RPC] nameColor(${hex}) → ${name}`)
    return name
  }

  nameColors(hexes: string[]): string[] {
    return hexes.map((h) => nameColor(h))
  }

  banner(text: string): string {
    const result = toBanner(text)
    console.log(`[RPC] banner("${text}")`)
    return result
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // ── WebSocket RPC ──
    if (url.pathname === '/api/ws' && request.headers.get('Upgrade') === 'websocket') {
      return newWorkersWebSocketRpcResponse(request, new RpcRoot())
    }

    // ── Everything else → TanStack Start ──
    return tanstackHandler.fetch(request, env)
  },
}
