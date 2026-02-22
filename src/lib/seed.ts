import path from 'path'
import fs from 'fs'
import { getDb } from './db'
import { createTickerRepository } from '@/repositories/ticker-repository'
import { createWatchlistRepository } from '@/repositories/watchlist-repository'

interface SeedEntry {
  symbol: string
  name: string
  market: 'US' | 'JP'
}

interface SeedWatchlist {
  name: string
  tickers: SeedEntry[]
}

export function runSeedIfEmpty(): void {
  const db = getDb()
  const watchlistRepo = createWatchlistRepository(db)
  const tickerRepo = createTickerRepository(db)

  const watchlists = watchlistRepo.findAll()
  if (watchlists.length === 0) return

  // Already seeded if the first watchlist has tickers
  const existing = tickerRepo.findAll(watchlists[0].id)
  if (existing.length > 0) return

  const seedPath = path.join(process.cwd(), 'seed.json')
  if (!fs.existsSync(seedPath)) return

  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))

  // Support both formats: new multi-watchlist [{name, tickers}] and legacy flat array
  const seedWatchlists: SeedWatchlist[] =
    Array.isArray(raw) && raw.length > 0 && 'tickers' in raw[0]
      ? (raw as SeedWatchlist[])
      : [{ name: 'Default', tickers: raw as SeedEntry[] }]

  for (let i = 0; i < seedWatchlists.length; i++) {
    const seedWl = seedWatchlists[i]
    const watchlist =
      i === 0 && watchlists.length > 0
        ? watchlistRepo.rename(watchlists[0].id, seedWl.name)
        : watchlistRepo.create(seedWl.name)

    for (const entry of seedWl.tickers) {
      try {
        tickerRepo.create(entry.symbol, entry.name, entry.market, watchlist.id)
      } catch {
        // skip duplicates silently
      }
    }
  }
}
