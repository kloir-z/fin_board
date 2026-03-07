import type Database from 'better-sqlite3'
import { createCacheRepository } from '@/repositories/cache-repository'
import { fetchQuotes, fetchChart, fetchFxRates } from './yahoo'
import type { ChartPoint, Quote, Timeframe } from './types'

const QUOTE_TTL_MINUTES = 5
const CHART_TTL: Record<Timeframe, number> = {
  '1D': 15,
  '1W': 60,
  '1M': 360,
  '3M': 360,
  '6M': 720,
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

  const FX_TTL_MINUTES = 60

  const getCachedFxRates = async (currencies: string[]): Promise<Record<string, number>> => {
    const nonUsd = currencies.filter((c) => c !== 'USD')
    if (nonUsd.length === 0) return {}

    const rates: Record<string, number> = {}
    const stale: string[] = []

    for (const currency of nonUsd) {
      const hit = cache.get('__fx__', currency, FX_TTL_MINUTES)
      if (hit && hit.length > 0) {
        rates[currency] = hit[0].value
      } else {
        stale.push(currency)
      }
    }

    if (stale.length > 0) {
      try {
        const fresh = await fetchFxRates(stale)
        for (const [currency, rate] of Object.entries(fresh)) {
          cache.set('__fx__', currency, [{ time: 0, value: rate }])
          rates[currency] = rate
        }
      } catch {
        // FX取得失敗時は取得済み分だけ返す
      }
    }

    return rates
  }

  return { getCachedQuotes, getCachedChart, getCachedFxRates }
}
