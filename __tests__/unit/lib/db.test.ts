import Database from 'better-sqlite3'

// We test the DB module logic using an in-memory database
// to keep tests fast and isolated.

function createTestDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      market TEXT NOT NULL CHECK (market IN ('US', 'JP')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS price_cache (
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (symbol, timeframe)
    );
  `)
  return db
}

describe('Database schema', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    db.close()
  })

  it('creates tickers table', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tickers'")
      .all()
    expect(tables).toHaveLength(1)
  })

  it('creates price_cache table', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='price_cache'")
      .all()
    expect(tables).toHaveLength(1)
  })

  it('enforces market check constraint on tickers', () => {
    expect(() => {
      db.prepare("INSERT INTO tickers (symbol, name, market) VALUES (?, ?, ?)").run(
        'AAPL',
        'Apple',
        'INVALID'
      )
    }).toThrow()
  })

  it('enforces unique symbol constraint on tickers', () => {
    db.prepare("INSERT INTO tickers (symbol, name, market) VALUES (?, ?, ?)").run(
      'AAPL',
      'Apple',
      'US'
    )
    expect(() => {
      db.prepare("INSERT INTO tickers (symbol, name, market) VALUES (?, ?, ?)").run(
        'AAPL',
        'Apple2',
        'US'
      )
    }).toThrow()
  })

  it('stores and retrieves price_cache entries', () => {
    const data = JSON.stringify([{ time: 1700000000, value: 150.0 }])
    db.prepare(
      "INSERT INTO price_cache (symbol, timeframe, data, fetched_at) VALUES (?, ?, ?, datetime('now'))"
    ).run('AAPL', '1D', data)

    const row = db
      .prepare('SELECT * FROM price_cache WHERE symbol = ? AND timeframe = ?')
      .get('AAPL', '1D') as { data: string } | undefined
    expect(row).toBeDefined()
    expect(JSON.parse(row!.data)).toHaveLength(1)
  })
})
