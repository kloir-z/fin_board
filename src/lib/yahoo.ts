// yahoo-finance2 v3: default export is a class, must be instantiated
// Use lazy initialization so mocks in tests can override before instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _yf: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getYf(): any {
  if (!_yf) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YahooFinanceClass = require('yahoo-finance2').default
    _yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] })
  }
  return _yf
}

import type { ChartPoint, Quote, Timeframe } from './types'

interface TimeframeConfig {
  interval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1d' | '5d' | '1wk' | '1mo' | '3mo'
  rangeInDays: number
}

const TIMEFRAME_CONFIG: Record<Timeframe, TimeframeConfig> = {
  '1D': { interval: '5m', rangeInDays: 1 },
  '1W': { interval: '15m', rangeInDays: 7 },
  '1M': { interval: '1d', rangeInDays: 30 },
  '3M': { interval: '1d', rangeInDays: 90 },
  '1Y': { interval: '1wk', rangeInDays: 365 },
  '5Y': { interval: '1mo', rangeInDays: 1825 },
}

export async function validateSymbol(symbol: string): Promise<boolean> {
  try {
    const q = await getYf().quote(symbol)
    return q != null && q.regularMarketPrice != null
  } catch {
    return false
  }
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(
    symbols.map((symbol) => getYf().quote(symbol))
  )

  const now = new Date().toISOString()
  const quotes: Quote[] = []

  for (const result of results) {
    if (result.status === 'rejected') continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = result.value as any
    if (!q || q.regularMarketPrice == null) continue

    quotes.push({
      symbol: q.symbol,
      name: q.shortName ?? q.longName ?? q.symbol,
      price: q.regularMarketPrice,
      previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      currency: q.currency ?? 'USD',
      marketState: q.marketState ?? 'UNKNOWN',
      updatedAt: now,
    })
  }

  return quotes
}

export async function fetchChart(symbol: string, timeframe: Timeframe): Promise<ChartPoint[]> {
  const config = TIMEFRAME_CONFIG[timeframe]
  const period1 = new Date()
  period1.setDate(period1.getDate() - config.rangeInDays)

  try {
    const result = await getYf().chart(symbol, {
      period1,
      interval: config.interval,
    })

    return ((result.quotes ?? []) as Array<{ close: number | null; date: Date }>)
      .filter((q) => q.close != null)
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        value: q.close as number,
      }))
  } catch {
    return []
  }
}
