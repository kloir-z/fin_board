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

export function runSeedIfEmpty(): void {
  const db = getDb()
  const watchlistRepo = createWatchlistRepository(db)
  const watchlists = watchlistRepo.findAll()
  if (watchlists.length === 0) return

  const defaultWatchlist = watchlists[0]
  const tickerRepo = createTickerRepository(db)
  const existing = tickerRepo.findAll(defaultWatchlist.id)
  if (existing.length > 0) return

  const seedPath = path.join(process.cwd(), 'seed.json')
  if (!fs.existsSync(seedPath)) return

  const entries: SeedEntry[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
  for (const entry of entries) {
    try {
      tickerRepo.create(entry.symbol, entry.name, entry.market, defaultWatchlist.id)
    } catch {
      // skip duplicates silently
    }
  }
}
