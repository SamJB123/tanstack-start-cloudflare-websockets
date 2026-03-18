/**
 * Demo RPC methods for the capnweb starter.
 * These extend the core RpcRoot with fun examples.
 */

import { RpcTarget } from 'capnweb'

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

// ── Demo RPC interface (client-side type) ──

export interface DemoApi {
  hello(name: string): string
  ping(): string
  rollDice(count: number): number[]
  nameColor(hex: string): string
  nameColors(hexes: string[]): string[]
  banner(text: string): string
}

// ── Demo RPC mixin ──

/**
 * Adds demo methods to an RpcTarget subclass.
 * Usage: `class MyRoot extends withDemoRpc(CoreRpcRoot) {}`
 */
export function withDemoRpc<T extends new (...args: any[]) => RpcTarget>(Base: T) {
  return class extends Base {
    hello(name: string): string {
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
      return results
    }

    nameColor(hex: string): string {
      return nameColor(hex)
    }

    nameColors(hexes: string[]): string[] {
      return hexes.map((h) => nameColor(h))
    }

    banner(text: string): string {
      return toBanner(text)
    }
  }
}
