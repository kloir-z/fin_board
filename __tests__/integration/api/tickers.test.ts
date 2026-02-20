import Database from 'better-sqlite3'
import { createTickerRepository } from '@/repositories/ticker-repository'

// Test the repository layer directly as integration tests
// (Next.js route handlers are hard to test in isolation without the full server)
describe('Tickers API logic (integration)', () => {
  let db: ReturnType<typeof Database>
  let repo: ReturnType<typeof createTickerRepository>

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE tickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        market TEXT NOT NULL CHECK (market IN ('US', 'JP')),
        position INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    repo = createTickerRepository(db)
  })

  afterEach(() => db.close())

  it('returns all tickers (simulates GET /api/tickers)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US')
    repo.create('7203.T', 'Toyota Motor', 'JP')
    const tickers = repo.findAll()
    expect(tickers).toHaveLength(2)
  })

  it('creates a ticker with valid data (simulates POST /api/tickers)', () => {
    const ticker = repo.create('TSLA', 'Tesla Inc.', 'US')
    expect(ticker.symbol).toBe('TSLA')
    expect(ticker.market).toBe('US')
  })

  it('throws on duplicate ticker creation (simulates 409 response)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US')
    expect(() => repo.create('AAPL', 'Apple Duplicate', 'US')).toThrow()
  })

  it('removes a ticker (simulates DELETE /api/tickers)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US')
    repo.remove('AAPL')
    expect(repo.findAll()).toHaveLength(0)
  })

  it('handles removing non-existent ticker gracefully', () => {
    expect(() => repo.remove('NONEXISTENT')).not.toThrow()
  })

  it('validates symbol format — rejects empty symbol', () => {
    expect(() => repo.create('', 'No Symbol', 'US')).toThrow()
  })

  it('creates index symbol with ^ prefix (simulates POST with ^N225)', () => {
    const ticker = repo.create('^N225', '日経平均', 'JP')
    expect(ticker.symbol).toBe('^N225')
    expect(repo.findBySymbol('^N225')).not.toBeNull()
  })

  it('creates FX symbol with =X suffix (simulates POST with USDJPY=X)', () => {
    const ticker = repo.create('USDJPY=X', 'USD/JPY', 'JP')
    expect(ticker.symbol).toBe('USDJPY=X')
  })

  it('updatePositions changes the order returned by findAll (simulates PATCH /api/tickers)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US')
    repo.create('MSFT', 'Microsoft', 'US')
    repo.create('GOOGL', 'Alphabet', 'US')

    repo.updatePositions([
      { symbol: 'GOOGL', position: 0 },
      { symbol: 'MSFT', position: 1 },
      { symbol: 'AAPL', position: 2 },
    ])

    const symbols = repo.findAll().map((t) => t.symbol)
    expect(symbols).toEqual(['GOOGL', 'MSFT', 'AAPL'])
  })
})
