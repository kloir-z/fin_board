import type Database from 'better-sqlite3'
import type { Ticker } from '@/lib/types'

interface TickerRow {
  id: number
  watchlist_id: number
  symbol: string
  name: string
  market: string
  position: number | null
  created_at: string
}

function rowToTicker(row: TickerRow): Ticker {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    symbol: row.symbol,
    name: row.name,
    market: row.market as 'US' | 'JP',
    createdAt: row.created_at,
  }
}

export function createTickerRepository(db: ReturnType<typeof Database>) {
  const findAll = (watchlistId: number): Ticker[] => {
    const rows = db
      .prepare(
        'SELECT * FROM tickers WHERE watchlist_id = ? ORDER BY COALESCE(position, id) ASC'
      )
      .all(watchlistId) as TickerRow[]
    return rows.map(rowToTicker)
  }

  const findBySymbol = (symbol: string, watchlistId: number): Ticker | null => {
    const row = db
      .prepare('SELECT * FROM tickers WHERE symbol = ? AND watchlist_id = ?')
      .get(symbol, watchlistId) as TickerRow | undefined
    return row ? rowToTicker(row) : null
  }

  const create = (symbol: string, name: string, market: 'US' | 'JP', watchlistId: number): Ticker => {
    if (!symbol || !symbol.trim()) throw new Error('Symbol cannot be empty')
    if (!name || !name.trim()) throw new Error('Name cannot be empty')

    const { max_pos } = db
      .prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM tickers WHERE watchlist_id = ?')
      .get(watchlistId) as { max_pos: number }

    const stmt = db.prepare(
      'INSERT INTO tickers (watchlist_id, symbol, name, market, position) VALUES (?, ?, ?, ?, ?)'
    )
    const result = stmt.run(watchlistId, symbol.trim().toUpperCase(), name.trim(), market, max_pos + 1)
    const row = db
      .prepare('SELECT * FROM tickers WHERE id = ?')
      .get(result.lastInsertRowid) as TickerRow
    return rowToTicker(row)
  }

  const remove = (symbol: string, watchlistId: number): void => {
    db.prepare('DELETE FROM tickers WHERE symbol = ? AND watchlist_id = ?').run(symbol, watchlistId)
  }

  const updatePositions = (orders: { symbol: string; position: number }[], watchlistId: number): void => {
    const stmt = db.prepare('UPDATE tickers SET position = ? WHERE symbol = ? AND watchlist_id = ?')
    db.transaction(() => {
      for (const { symbol, position } of orders) stmt.run(position, symbol, watchlistId)
    })()
  }

  return { findAll, findBySymbol, create, remove, updatePositions }
}
