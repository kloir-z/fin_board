import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import type Database from 'better-sqlite3'

export interface SeedTicker {
  symbol: string
  name: string
  market: 'US' | 'JP' | 'MY' | 'TH' | 'VN' | 'KR'
}

export interface SeedWatchlist {
  name: string
  tickers: SeedTicker[]
}

const seedTickerSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  market: z.enum(['US', 'JP', 'MY', 'TH', 'VN', 'KR']),
})

const seedDataSchema = z.array(
  z.object({
    name: z.string().min(1),
    tickers: z.array(seedTickerSchema),
  })
)

export function parseJSON(data: string): SeedWatchlist[] {
  const raw = JSON.parse(data) // throws SyntaxError on invalid JSON
  const result = seedDataSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid JSON structure: ${result.error.issues[0].message}`)
  }
  return result.data
}

function splitCSVLine(line: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i++ // skip opening quote
      let cell = ''
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            cell += '"'
            i += 2
          } else {
            i++ // skip closing quote
            break
          }
        } else {
          cell += line[i++]
        }
      }
      cells.push(cell)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) {
        cells.push(line.slice(i))
        break
      } else {
        cells.push(line.slice(i, end))
        i = end + 1
      }
    }
  }
  return cells
}

export function parseCSV(data: string): SeedWatchlist[] {
  const lines = data
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')

  if (lines.length === 0) throw new Error('CSV is empty')

  const header = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  if (
    header[0] !== 'watchlist' ||
    header[1] !== 'symbol' ||
    header[2] !== 'name' ||
    header[3] !== 'market'
  ) {
    throw new Error('CSV must have header row: watchlist,symbol,name,market')
  }

  const map = new Map<string, SeedTicker[]>()
  const order: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i])
    const watchlistName = row[0]?.trim()
    const symbol = row[1]?.trim()
    const name = row[2]?.trim()
    const market = row[3]?.trim().toUpperCase()

    if (!watchlistName || !symbol || !name) continue
    if (!['US', 'JP', 'MY', 'TH', 'VN', 'KR'].includes(market)) {
      throw new Error(`Invalid market value at row ${i + 1}: "${market}" (must be US, JP, MY, TH, VN, or KR)`)
    }

    if (!map.has(watchlistName)) {
      map.set(watchlistName, [])
      order.push(watchlistName)
    }
    map.get(watchlistName)!.push({ symbol, name, market: market as 'US' | 'JP' | 'MY' | 'TH' | 'VN' | 'KR' })
  }

  if (order.length === 0) throw new Error('CSV has no valid data rows')

  return order.map((n) => ({ name: n, tickers: map.get(n)! }))
}

export function replaceAll(
  db: ReturnType<typeof Database>,
  watchlists: SeedWatchlist[]
): { watchlists: number; tickers: number } {
  let totalTickers = 0

  db.transaction(() => {
    db.prepare('DELETE FROM tickers').run()
    db.prepare('DELETE FROM watchlists').run()

    const insertWl = db.prepare('INSERT INTO watchlists (name, position) VALUES (?, ?)')
    const insertTicker = db.prepare(
      'INSERT INTO tickers (watchlist_id, symbol, name, market, position) VALUES (?, ?, ?, ?, ?)'
    )

    for (let wlIdx = 0; wlIdx < watchlists.length; wlIdx++) {
      const wl = watchlists[wlIdx]
      const wlResult = insertWl.run(wl.name.trim(), wlIdx + 1)
      const wlId = Number(wlResult.lastInsertRowid)

      for (let tIdx = 0; tIdx < wl.tickers.length; tIdx++) {
        const t = wl.tickers[tIdx]
        insertTicker.run(wlId, t.symbol.trim().toUpperCase(), t.name.trim(), t.market, tIdx + 1)
        totalTickers++
      }
    }
  })()

  return { watchlists: watchlists.length, tickers: totalTickers }
}

const importBodySchema = z.object({
  format: z.enum(['json', 'csv']),
  data: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = importBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'format ("json" or "csv") and data are required' },
        { status: 400 }
      )
    }

    const { format, data } = parsed.data

    let watchlists: SeedWatchlist[]
    try {
      watchlists = format === 'json' ? parseJSON(data) : parseCSV(data)
    } catch (e) {
      return NextResponse.json({ success: false, error: String(e) }, { status: 422 })
    }

    if (watchlists.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No watchlists found in the file' },
        { status: 422 }
      )
    }

    const db = getDb()
    const counts = replaceAll(db, watchlists)

    return NextResponse.json({ success: true, data: counts })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
