import path from 'path'
import fs from 'fs'
import { getDb } from './db'
import { createTickerRepository } from '@/repositories/ticker-repository'

interface SeedEntry {
  symbol: string
  name: string
  market: 'US' | 'JP'
}

export function runSeedIfEmpty(): void {
  const db = getDb()
  const repo = createTickerRepository(db)

  const existing = repo.findAll()
  if (existing.length > 0) return

  const seedPath = path.join(process.cwd(), 'seed.json')
  if (!fs.existsSync(seedPath)) return

  const entries: SeedEntry[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
  for (const entry of entries) {
    try {
      repo.create(entry.symbol, entry.name, entry.market)
    } catch {
      // skip duplicates silently
    }
  }
}
