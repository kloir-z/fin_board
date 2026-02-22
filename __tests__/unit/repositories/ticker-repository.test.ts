import Database from 'better-sqlite3'
import { createTickerRepository } from '@/repositories/ticker-repository'

const WATCHLIST_ID = 1

function createTestDb() {
  const db = new Database(':memory:')
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
      market TEXT NOT NULL CHECK (market IN ('US', 'JP')),
      position INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(symbol, watchlist_id)
    );
    INSERT INTO watchlists (id, name, position) VALUES (${WATCHLIST_ID}, 'Default', 1);
  `)
  return db
}

describe('TickerRepository', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createTickerRepository>

  beforeEach(() => {
    db = createTestDb()
    repo = createTickerRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('findAll', () => {
    it('returns empty array when no tickers exist', () => {
      expect(repo.findAll(WATCHLIST_ID)).toEqual([])
    })

    it('returns all tickers for the given watchlist', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      repo.create('7203.T', 'Toyota Motor', 'JP', WATCHLIST_ID)
      const tickers = repo.findAll(WATCHLIST_ID)
      expect(tickers).toHaveLength(2)
      expect(tickers.map((t) => t.symbol)).toContain('AAPL')
      expect(tickers.map((t) => t.symbol)).toContain('7203.T')
    })

    it('returns tickers in position order after updatePositions', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      repo.create('MSFT', 'Microsoft', 'US', WATCHLIST_ID)
      repo.create('GOOGL', 'Alphabet', 'US', WATCHLIST_ID)

      repo.updatePositions(
        [
          { symbol: 'GOOGL', position: 0 },
          { symbol: 'AAPL', position: 1 },
          { symbol: 'MSFT', position: 2 },
        ],
        WATCHLIST_ID
      )

      const ordered = repo.findAll(WATCHLIST_ID)
      expect(ordered.map((t) => t.symbol)).toEqual(['GOOGL', 'AAPL', 'MSFT'])
    })
  })

  describe('findBySymbol', () => {
    it('returns null for unknown symbol', () => {
      expect(repo.findBySymbol('UNKNOWN', WATCHLIST_ID)).toBeNull()
    })

    it('returns ticker for known symbol', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      const ticker = repo.findBySymbol('AAPL', WATCHLIST_ID)
      expect(ticker).not.toBeNull()
      expect(ticker!.symbol).toBe('AAPL')
      expect(ticker!.market).toBe('US')
    })
  })

  describe('create', () => {
    it('creates a ticker and returns it with id and createdAt', () => {
      const ticker = repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      expect(ticker.id).toBeGreaterThan(0)
      expect(ticker.symbol).toBe('AAPL')
      expect(ticker.name).toBe('Apple Inc.')
      expect(ticker.market).toBe('US')
      expect(ticker.watchlistId).toBe(WATCHLIST_ID)
      expect(ticker.createdAt).toBeDefined()
    })

    it('throws on duplicate symbol within same watchlist', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      expect(() => repo.create('AAPL', 'Apple Again', 'US', WATCHLIST_ID)).toThrow()
    })

    it('creates both JP and US market tickers', () => {
      const jp = repo.create('7203.T', 'Toyota Motor', 'JP', WATCHLIST_ID)
      const us = repo.create('GOOGL', 'Alphabet Inc.', 'US', WATCHLIST_ID)
      expect(jp.market).toBe('JP')
      expect(us.market).toBe('US')
    })

    it('assigns sequential positions so tickers are returned in insertion order', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      repo.create('MSFT', 'Microsoft', 'US', WATCHLIST_ID)
      repo.create('GOOGL', 'Alphabet', 'US', WATCHLIST_ID)
      const symbols = repo.findAll(WATCHLIST_ID).map((t) => t.symbol)
      expect(symbols).toEqual(['AAPL', 'MSFT', 'GOOGL'])
    })

    it('creates index symbol ^N225 correctly', () => {
      const ticker = repo.create('^N225', '日経平均', 'JP', WATCHLIST_ID)
      expect(ticker.symbol).toBe('^N225')
    })

    it('creates FX symbol USDJPY=X correctly', () => {
      const ticker = repo.create('USDJPY=X', 'USD/JPY', 'JP', WATCHLIST_ID)
      expect(ticker.symbol).toBe('USDJPY=X')
    })
  })

  describe('updatePositions', () => {
    it('updates positions atomically and changes findAll order', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      repo.create('MSFT', 'Microsoft', 'US', WATCHLIST_ID)

      repo.updatePositions(
        [
          { symbol: 'MSFT', position: 0 },
          { symbol: 'AAPL', position: 1 },
        ],
        WATCHLIST_ID
      )

      const symbols = repo.findAll(WATCHLIST_ID).map((t) => t.symbol)
      expect(symbols).toEqual(['MSFT', 'AAPL'])
    })

    it('handles empty array without throwing', () => {
      expect(() => repo.updatePositions([], WATCHLIST_ID)).not.toThrow()
    })

    it('ignores unknown symbols without throwing', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      expect(() =>
        repo.updatePositions([{ symbol: 'UNKNOWN', position: 0 }], WATCHLIST_ID)
      ).not.toThrow()
    })
  })

  describe('remove', () => {
    it('removes an existing ticker by symbol', () => {
      repo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
      repo.remove('AAPL', WATCHLIST_ID)
      expect(repo.findAll(WATCHLIST_ID)).toHaveLength(0)
    })

    it('does not throw when removing non-existent symbol', () => {
      expect(() => repo.remove('NONEXISTENT', WATCHLIST_ID)).not.toThrow()
    })
  })
})
