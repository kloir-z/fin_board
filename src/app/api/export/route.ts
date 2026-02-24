import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createWatchlistRepository } from '@/repositories/watchlist-repository'
import { createTickerRepository } from '@/repositories/ticker-repository'
import type Database from 'better-sqlite3'

export interface SeedTicker {
  symbol: string
  name: string
  market: 'US' | 'JP' | 'MY' | 'TH' | 'VN'
}

export interface SeedWatchlist {
  name: string
  tickers: SeedTicker[]
}

export function buildSeedData(db: ReturnType<typeof Database>): SeedWatchlist[] {
  const wlRepo = createWatchlistRepository(db)
  const tickerRepo = createTickerRepository(db)
  return wlRepo.findAll().map((wl) => ({
    name: wl.name,
    tickers: tickerRepo.findAll(wl.id).map((t) => ({
      symbol: t.symbol,
      name: t.name,
      market: t.market,
    })),
  }))
}

function csvCell(value: string): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function toCSV(data: SeedWatchlist[]): string {
  const lines = ['watchlist,symbol,name,market']
  for (const wl of data) {
    for (const t of wl.tickers) {
      lines.push(
        [csvCell(wl.name), csvCell(t.symbol), csvCell(t.name), csvCell(t.market)].join(',')
      )
    }
  }
  return lines.join('\n') + '\n'
}

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get('format') ?? 'json'
    const db = getDb()
    const data = buildSeedData(db)
    const date = new Date().toISOString().slice(0, 10)

    if (format === 'csv') {
      return new NextResponse(toCSV(data), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="watchlist_${date}.csv"`,
        },
      })
    }

    return new NextResponse(JSON.stringify(data, null, 2) + '\n', {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="watchlist_${date}.json"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
