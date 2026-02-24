import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { runSeedIfEmpty } from '@/lib/seed'
import { createTickerRepository } from '@/repositories/ticker-repository'
import { createWatchlistRepository } from '@/repositories/watchlist-repository'
import { validateSymbol } from '@/lib/yahoo'
import type { ApiResponse, Ticker } from '@/lib/types'

// All alias values must match the symbol regex /^[A-Z0-9.^=]+$/
const SYMBOL_ALIASES: Record<string, string> = {
  'N225': '^N225',   'NIKKEI': '^N225',
  'DJI': '^DJI',    'DOW': '^DJI',
  'GSPC': '^GSPC',  'SPX': '^GSPC',  'SP500': '^GSPC',
  'IXIC': '^IXIC',  'NASDAQ': '^IXIC',
  'USDJPY': 'USDJPY=X',
  'EURUSD': 'EURUSD=X',
  'EURJPY': 'EURJPY=X',
}

const createSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9.^=]+$/, 'Symbol must contain uppercase letters, digits, dots, ^ or ='),
  name: z.string().min(1).max(100),
  market: z.enum(['US', 'JP', 'MY', 'TH', 'VN']),
  watchlistId: z.number().int().positive(),
})

const deleteSchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9.^=]+$/),
  watchlistId: z.number().int().positive(),
})

const patchSchema = z.object({
  order: z.array(z.string().min(1)),
  watchlistId: z.number().int().positive(),
})

function resolveWatchlistId(param: string | null, db: ReturnType<typeof import('@/lib/db').getDb>): number | null {
  if (!param) {
    const watchlists = createWatchlistRepository(db).findAll()
    return watchlists[0]?.id ?? null
  }
  const id = Number(param)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<Ticker[]>>> {
  try {
    const db = getDb()
    runSeedIfEmpty()
    const watchlistId = resolveWatchlistId(req.nextUrl.searchParams.get('watchlistId'), db)
    if (watchlistId === null) {
      return NextResponse.json({ success: false, error: 'Invalid watchlistId' }, { status: 400 })
    }
    const repo = createTickerRepository(db)
    return NextResponse.json({ success: true, data: repo.findAll(watchlistId) })
  } catch (error) {
    console.error('GET /api/tickers error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch tickers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Ticker>>> {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const resolvedSymbol = SYMBOL_ALIASES[parsed.data.symbol] ?? parsed.data.symbol
    const valid = await validateSymbol(resolvedSymbol)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Symbol not found on Yahoo Finance' },
        { status: 404 }
      )
    }

    const db = getDb()
    runSeedIfEmpty()
    const repo = createTickerRepository(db)
    const ticker = repo.create(resolvedSymbol, parsed.data.name, parsed.data.market, parsed.data.watchlistId)
    return NextResponse.json({ success: true, data: ticker }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create ticker'
    const isDuplicate = msg.includes('UNIQUE') || msg.includes('already exists')
    return NextResponse.json(
      { success: false, error: isDuplicate ? 'Ticker already exists in this watchlist' : msg },
      { status: isDuplicate ? 409 : 500 }
    )
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const body = await req.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Symbol and watchlistId are required' }, { status: 400 })
    }

    const db = getDb()
    const repo = createTickerRepository(db)
    repo.remove(parsed.data.symbol, parsed.data.watchlistId)
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('DELETE /api/tickers error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete ticker' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid order or watchlistId' }, { status: 400 })
    }

    const db = getDb()
    runSeedIfEmpty()
    const repo = createTickerRepository(db)

    // Validate that the submitted order contains exactly the current set of tickers
    const existing = repo.findAll(parsed.data.watchlistId).map((t) => t.symbol).sort()
    const submitted = [...new Set(parsed.data.order)].sort()
    if (
      existing.length !== submitted.length ||
      !existing.every((s, i) => s === submitted[i])
    ) {
      return NextResponse.json(
        { success: false, error: 'Order must contain exactly all current tickers' },
        { status: 400 }
      )
    }

    repo.updatePositions(
      parsed.data.order.map((symbol, idx) => ({ symbol, position: idx + 1 })),
      parsed.data.watchlistId
    )
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('PATCH /api/tickers error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 })
  }
}
