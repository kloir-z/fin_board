import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

let instance: ReturnType<typeof Database> | null = null

export function getDb(): ReturnType<typeof Database> {
  if (instance) return instance

  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'fin_board.db')
  const db = new Database(dbPath)

  const schema = fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf-8')
  db.exec(schema)

  // Migration: add position column to existing databases
  try { db.exec('ALTER TABLE tickers ADD COLUMN position INTEGER') } catch { /* column already exists */ }
  db.exec('UPDATE tickers SET position = id WHERE position IS NULL')

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

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
