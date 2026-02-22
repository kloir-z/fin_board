import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

let instance: ReturnType<typeof Database> | null = null

export function getDb(): ReturnType<typeof Database> {
  if (instance) return instance

  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'fin_board.db')
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const db = new Database(dbPath)

  const schema = fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf-8')
  db.exec(schema)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Migration: add position column to tickers (legacy)
  try { db.exec('ALTER TABLE tickers ADD COLUMN position INTEGER') } catch { /* already exists */ }

  // Migration: add watchlist_id column to tickers
  try { db.exec('ALTER TABLE tickers ADD COLUMN watchlist_id INTEGER') } catch { /* already exists */ }

  // Migration: create default watchlist if none exists
  const watchlistCount = (db.prepare('SELECT COUNT(*) as c FROM watchlists').get() as { c: number }).c
  if (watchlistCount === 0) {
    db.prepare("INSERT INTO watchlists (name, position) VALUES ('Default', 1)").run()
  }

  // Migration: assign existing tickers (watchlist_id IS NULL) to the first watchlist
  const defaultWatchlist = db.prepare('SELECT id FROM watchlists ORDER BY position ASC, id ASC LIMIT 1').get() as { id: number }
  db.exec(`UPDATE tickers SET watchlist_id = ${defaultWatchlist.id} WHERE watchlist_id IS NULL`)
  db.exec(`UPDATE tickers SET position = id WHERE position IS NULL`)

  instance = db
  return db
}

/** Reset singleton — for testing only */
export function _resetDbForTesting(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}
