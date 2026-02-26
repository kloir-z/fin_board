import Database from 'better-sqlite3'
import { createTickerRepository } from '@/repositories/ticker-repository'

const WATCHLIST_ID = 1

// Test the repository layer directly as integration tests
// (Next.js route handlers are hard to test in isolation without the full server)
describe('Tickers API logic (integration)', () => {
  let db: ReturnType<typeof Database>
  let repo: ReturnType<typeof createTickerRepository>

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE watchlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE tickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        market TEXT NOT NULL CHECK (market IN ('US', 'JP', 'MY', 'TH', 'VN', 'KR')),
        position INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(symbol, watchlist_id)
      );
      INSERT INTO watchlists (id, name, position) VALUES (${WATCHLIST_ID}, 'Default', 1);
    `)
    repo = createTickerRepository(db)
  })

  afterEach(() => db.close())

  it('returns all tickers (simulates GET /api/tickers)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
    repo.create('7203.T', 'Toyota Motor', 'JP', WATCHLIST_ID)
    const tickers = repo.findAll(WATCHLIST_ID)
    expect(tickers).toHaveLength(2)
  })

  it('creates a ticker with valid data (simulates POST /api/tickers)', () => {
    const ticker = repo.create('TSLA', 'Tesla Inc.', 'US', WATCHLIST_ID)
    expect(ticker.symbol).toBe('TSLA')
    expect(ticker.market).toBe('US')
    expect(ticker.watchlistId).toBe(WATCHLIST_ID)
  })

  it('throws on duplicate ticker creation (simulates 409 response)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
    expect(() => repo.create('AAPL', 'Apple Duplicate', 'US', WATCHLIST_ID)).toThrow()
  })

  it('removes a ticker (simulates DELETE /api/tickers)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
    repo.remove('AAPL', WATCHLIST_ID)
    expect(repo.findAll(WATCHLIST_ID)).toHaveLength(0)
  })

  it('handles removing non-existent ticker gracefully', () => {
    expect(() => repo.remove('NONEXISTENT', WATCHLIST_ID)).not.toThrow()
  })

  it('validates symbol format — rejects empty symbol', () => {
    expect(() => repo.create('', 'No Symbol', 'US', WATCHLIST_ID)).toThrow()
  })

  it('creates index symbol with ^ prefix (simulates POST with ^N225)', () => {
    const ticker = repo.create('^N225', '日経平均', 'JP', WATCHLIST_ID)
    expect(ticker.symbol).toBe('^N225')
    expect(repo.findBySymbol('^N225', WATCHLIST_ID)).not.toBeNull()
  })

  it('creates FX symbol with =X suffix (simulates POST with USDJPY=X)', () => {
    const ticker = repo.create('USDJPY=X', 'USD/JPY', 'JP', WATCHLIST_ID)
    expect(ticker.symbol).toBe('USDJPY=X')
  })

  it('updatePositions changes the order returned by findAll (simulates PATCH /api/tickers)', () => {
    repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
    repo.create('MSFT', 'Microsoft', 'US', WATCHLIST_ID)
    repo.create('GOOGL', 'Alphabet', 'US', WATCHLIST_ID)

    repo.updatePositions(
      [
        { symbol: 'GOOGL', position: 0 },
        { symbol: 'MSFT', position: 1 },
        { symbol: 'AAPL', position: 2 },
      ],
      WATCHLIST_ID
    )

    const symbols = repo.findAll(WATCHLIST_ID).map((t) => t.symbol)
    expect(symbols).toEqual(['GOOGL', 'MSFT', 'AAPL'])
  })

  it('creates a KR market ticker (simulates POST with Korean stock)', () => {
    const ticker = repo.create('005930.KS', 'サムスン電子', 'KR', WATCHLIST_ID)
    expect(ticker.symbol).toBe('005930.KS')
    expect(ticker.market).toBe('KR')
  })

  it('same symbol can be added to different watchlists', () => {
    const db2 = db
    db2.prepare('INSERT INTO watchlists (id, name, position) VALUES (2, \'Second\', 2)').run()
    repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
    const ticker2 = repo.create('AAPL', 'Apple Inc.', 'US', 2)
    expect(ticker2.symbol).toBe('AAPL')
    expect(ticker2.watchlistId).toBe(2)
  })
})
