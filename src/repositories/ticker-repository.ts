import type Database from 'better-sqlite3'
import type { Ticker } from '@/lib/types'

interface TickerRow {
  id: number
  symbol: string
  name: string
  market: string
  position: number | null
  created_at: string
}

function rowToTicker(row: TickerRow): Ticker {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    market: row.market as 'US' | 'JP',
    createdAt: row.created_at,
  }
}

export function createTickerRepository(db: ReturnType<typeof Database>) {
  const findAll = (): Ticker[] => {
    const rows = db
      .prepare('SELECT * FROM tickers ORDER BY COALESCE(position, id) ASC')
      .all() as TickerRow[]
    return rows.map(rowToTicker)
  }

  const findBySymbol = (symbol: string): Ticker | null => {
    const row = db.prepare('SELECT * FROM tickers WHERE symbol = ?').get(symbol) as
      | TickerRow
      | undefined
    return row ? rowToTicker(row) : null
  }

  const create = (symbol: string, name: string, market: 'US' | 'JP'): Ticker => {
    if (!symbol || !symbol.trim()) throw new Error('Symbol cannot be empty')
    if (!name || !name.trim()) throw new Error('Name cannot be empty')

    const { max_pos } = db
      .prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM tickers')
      .get() as { max_pos: number }
    const nextPosition = max_pos + 1

    const stmt = db.prepare(
      'INSERT INTO tickers (symbol, name, market, position) VALUES (?, ?, ?, ?)'
    )
    const result = stmt.run(symbol.trim().toUpperCase(), name.trim(), market, nextPosition)
    const row = db
      .prepare('SELECT * FROM tickers WHERE id = ?')
      .get(result.lastInsertRowid) as TickerRow
    return rowToTicker(row)
  }

  const remove = (symbol: string): void => {
    db.prepare('DELETE FROM tickers WHERE symbol = ?').run(symbol)
  }

  const updatePositions = (orders: { symbol: string; position: number }[]): void => {
    const stmt = db.prepare('UPDATE tickers SET position = ? WHERE symbol = ?')
    db.transaction(() => {
      for (const { symbol, position } of orders) stmt.run(position, symbol)
    })()
  }

  return { findAll, findBySymbol, create, remove, updatePositions }
}
