import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { runSeedIfEmpty } from '@/lib/seed'
import { createTickerRepository } from '@/repositories/ticker-repository'
import { createWatchlistRepository } from '@/repositories/watchlist-repository'
import { createCacheOrchestrator } from '@/lib/cache'
import type { ApiResponse, Quote } from '@/lib/types'

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<Quote[]>>> {
  try {
    const db = getDb()
    runSeedIfEmpty()

    // Resolve watchlistId (default to first watchlist)
    const param = req.nextUrl.searchParams.get('watchlistId')
    let watchlistId: number
    if (!param) {
      const watchlists = createWatchlistRepository(db).findAll()
      if (watchlists.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
      watchlistId = watchlists[0].id
    } else {
      watchlistId = Number(param)
      if (!Number.isInteger(watchlistId) || watchlistId <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid watchlistId' }, { status: 400 })
      }
    }

    const tickerRepo = createTickerRepository(db)
    const tickers = tickerRepo.findAll(watchlistId)

    if (tickers.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const orchestrator = createCacheOrchestrator(db)
    const symbols = tickers.map((t) => t.symbol)
    const quotes = await orchestrator.getCachedQuotes(symbols)

    // Merge ticker name into each quote
    const nameMap = new Map(tickers.map((t) => [t.symbol, t.name]))
    const enriched = quotes.map((q) => ({ ...q, name: nameMap.get(q.symbol) ?? q.symbol }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('GET /api/quotes error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch quotes' }, { status: 500 })
  }
}
