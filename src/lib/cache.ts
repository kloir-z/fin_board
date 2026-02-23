import type Database from 'better-sqlite3'
import { createCacheRepository } from '@/repositories/cache-repository'
import { fetchQuotes, fetchChart } from './yahoo'
import type { ChartPoint, Quote, Timeframe } from './types'

const QUOTE_TTL_MINUTES = 5
const CHART_TTL: Record<Timeframe, number> = {
  '1D': 15,
  '1W': 60,
  '1M': 360,
  '3M': 360,
  '1Y': 720,
  '2Y': 1440,
  '3Y': 1440,
  '5Y': 1440,
}

// Key used to store aggregated quote list in price_cache
const QUOTE_CACHE_TIMEFRAME = '__quote__'

export function createCacheOrchestrator(db: ReturnType<typeof Database>) {
  const cache = createCacheRepository(db)

  const getCachedQuotes = async (symbols: string[]): Promise<Quote[]> => {
    // Use the first symbol as the cache key for the batch
    // Each symbol is cached independently
    const cached: Quote[] = []
    const stale: string[] = []

    for (const symbol of symbols) {
      const hit = cache.get(symbol, QUOTE_CACHE_TIMEFRAME, QUOTE_TTL_MINUTES)
      if (hit && hit.length > 0) {
        // Hit contains a single-element array with the Quote object serialized
        cached.push(hit[0] as unknown as Quote)
      } else {
        stale.push(symbol)
      }
    }

    if (stale.length > 0) {
      try {
        // Batch fetch in groups of 10 to avoid rate limiting
        const batches = []
        for (let i = 0; i < stale.length; i += 10) {
          batches.push(stale.slice(i, i + 10))
        }

        const freshQuotes: Quote[] = []
        for (const batch of batches) {
          const quotes = await fetchQuotes(batch)
          freshQuotes.push(...quotes)
        }

        for (const quote of freshQuotes) {
          cache.set(quote.symbol, QUOTE_CACHE_TIMEFRAME, [quote as unknown as ChartPoint])
          cached.push(quote)
        }
      } catch {
        // Return what we have from cache; don't crash
      }
    }

    return cached
  }

  const getCachedChart = async (symbol: string, timeframe: Timeframe): Promise<ChartPoint[]> => {
    const ttl = CHART_TTL[timeframe]
    const cached = cache.get(symbol, timeframe, ttl)
    if (cached) return cached

    const fresh = await fetchChart(symbol, timeframe)
    if (fresh.length > 0) {
      cache.set(symbol, timeframe, fresh)
    }
    return fresh
  }

  return { getCachedQuotes, getCachedChart }
}
