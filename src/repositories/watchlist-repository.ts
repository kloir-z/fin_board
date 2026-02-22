import type Database from 'better-sqlite3'
import type { Watchlist } from '@/lib/types'

interface WatchlistRow {
  id: number
  name: string
  position: number | null
  created_at: string
}

function rowToWatchlist(row: WatchlistRow): Watchlist {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
  }
}

export function createWatchlistRepository(db: ReturnType<typeof Database>) {
  const findAll = (): Watchlist[] => {
    const rows = db
      .prepare('SELECT * FROM watchlists ORDER BY COALESCE(position, id) ASC')
      .all() as WatchlistRow[]
    return rows.map(rowToWatchlist)
  }

  const findById = (id: number): Watchlist | null => {
    const row = db.prepare('SELECT * FROM watchlists WHERE id = ?').get(id) as WatchlistRow | undefined
    return row ? rowToWatchlist(row) : null
  }

  const create = (name: string): Watchlist => {
    if (!name || !name.trim()) throw new Error('Name cannot be empty')
    const { max_pos } = db
      .prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM watchlists')
      .get() as { max_pos: number }
    const result = db
      .prepare('INSERT INTO watchlists (name, position) VALUES (?, ?)')
      .run(name.trim(), max_pos + 1)
    return rowToWatchlist(
      db.prepare('SELECT * FROM watchlists WHERE id = ?').get(result.lastInsertRowid) as WatchlistRow
    )
  }

  const rename = (id: number, name: string): Watchlist => {
    if (!name || !name.trim()) throw new Error('Name cannot be empty')
    db.prepare('UPDATE watchlists SET name = ? WHERE id = ?').run(name.trim(), id)
    const row = db.prepare('SELECT * FROM watchlists WHERE id = ?').get(id) as WatchlistRow | undefined
    if (!row) throw new Error('Watchlist not found')
    return rowToWatchlist(row)
  }

  const remove = (id: number): void => {
    const count = (db.prepare('SELECT COUNT(*) as c FROM watchlists').get() as { c: number }).c
    if (count <= 1) throw new Error('Cannot delete the last watchlist')
    db.prepare('DELETE FROM watchlists WHERE id = ?').run(id)
  }

  const updatePositions = (orders: { id: number; position: number }[]): void => {
    const stmt = db.prepare('UPDATE watchlists SET position = ? WHERE id = ?')
    db.transaction(() => {
      for (const { id, position } of orders) stmt.run(position, id)
    })()
  }

  return { findAll, findById, create, rename, remove, updatePositions }
}
