import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { runSeedIfEmpty } from '@/lib/seed'
import { createTickerRepository } from '@/repositories/ticker-repository'
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
  market: z.enum(['US', 'JP']),
})

const deleteSchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9.^=]+$/),
})

function getRepo() {
  const db = getDb()
  runSeedIfEmpty()
  return createTickerRepository(db)
}

export async function GET(): Promise<NextResponse<ApiResponse<Ticker[]>>> {
  try {
    const repo = getRepo()
    return NextResponse.json({ success: true, data: repo.findAll() })
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

    const repo = getRepo()
    const ticker = repo.create(resolvedSymbol, parsed.data.name, parsed.data.market)
    return NextResponse.json({ success: true, data: ticker }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create ticker'
    const isDuplicate = msg.includes('UNIQUE') || msg.includes('already exists')
    return NextResponse.json(
      { success: false, error: isDuplicate ? 'Ticker already exists' : msg },
      { status: isDuplicate ? 409 : 500 }
    )
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const body = await req.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 })
    }

    const repo = getRepo()
    repo.remove(parsed.data.symbol)
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('DELETE /api/tickers error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete ticker' }, { status: 500 })
  }
}

const patchSchema = z.object({ order: z.array(z.string().min(1)) })

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid order' }, { status: 400 })
    }

    const repo = getRepo()

    // Validate that the submitted order contains exactly the current set of tickers
    const existing = repo.findAll().map((t) => t.symbol).sort()
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

    repo.updatePositions(parsed.data.order.map((symbol, idx) => ({ symbol, position: idx })))
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('PATCH /api/tickers error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 })
  }
}
