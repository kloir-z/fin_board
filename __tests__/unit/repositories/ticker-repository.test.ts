import Database from 'better-sqlite3'
import { createTickerRepository } from '@/repositories/ticker-repository'

function createTestDb() {
  const db = new Database(':memory:')
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
      expect(repo.findAll()).toEqual([])
    })

    it('returns all tickers', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      repo.create('7203.T', 'Toyota Motor', 'JP')
      const tickers = repo.findAll()
      expect(tickers).toHaveLength(2)
      expect(tickers.map((t) => t.symbol)).toContain('AAPL')
      expect(tickers.map((t) => t.symbol)).toContain('7203.T')
    })

    it('returns tickers in position order after updatePositions', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      repo.create('MSFT', 'Microsoft', 'US')
      repo.create('GOOGL', 'Alphabet', 'US')

      repo.updatePositions([
        { symbol: 'GOOGL', position: 0 },
        { symbol: 'AAPL', position: 1 },
        { symbol: 'MSFT', position: 2 },
      ])

      const ordered = repo.findAll()
      expect(ordered.map((t) => t.symbol)).toEqual(['GOOGL', 'AAPL', 'MSFT'])
    })
  })

  describe('findBySymbol', () => {
    it('returns null for unknown symbol', () => {
      expect(repo.findBySymbol('UNKNOWN')).toBeNull()
    })

    it('returns ticker for known symbol', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      const ticker = repo.findBySymbol('AAPL')
      expect(ticker).not.toBeNull()
      expect(ticker!.symbol).toBe('AAPL')
      expect(ticker!.market).toBe('US')
    })
  })

  describe('create', () => {
    it('creates a ticker and returns it with id and createdAt', () => {
      const ticker = repo.create('AAPL', 'Apple Inc.', 'US')
      expect(ticker.id).toBeGreaterThan(0)
      expect(ticker.symbol).toBe('AAPL')
      expect(ticker.name).toBe('Apple Inc.')
      expect(ticker.market).toBe('US')
      expect(ticker.createdAt).toBeDefined()
    })

    it('throws on duplicate symbol', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      expect(() => repo.create('AAPL', 'Apple Again', 'US')).toThrow()
    })

    it('creates both JP and US market tickers', () => {
      const jp = repo.create('7203.T', 'Toyota Motor', 'JP')
      const us = repo.create('GOOGL', 'Alphabet Inc.', 'US')
      expect(jp.market).toBe('JP')
      expect(us.market).toBe('US')
    })

    it('assigns sequential positions so tickers are returned in insertion order', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      repo.create('MSFT', 'Microsoft', 'US')
      repo.create('GOOGL', 'Alphabet', 'US')
      const symbols = repo.findAll().map((t) => t.symbol)
      expect(symbols).toEqual(['AAPL', 'MSFT', 'GOOGL'])
    })

    it('creates index symbol ^N225 correctly', () => {
      const ticker = repo.create('^N225', '日経平均', 'JP')
      expect(ticker.symbol).toBe('^N225')
    })

    it('creates FX symbol USDJPY=X correctly', () => {
      const ticker = repo.create('USDJPY=X', 'USD/JPY', 'JP')
      expect(ticker.symbol).toBe('USDJPY=X')
    })
  })

  describe('updatePositions', () => {
    it('updates positions atomically and changes findAll order', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      repo.create('MSFT', 'Microsoft', 'US')

      repo.updatePositions([
        { symbol: 'MSFT', position: 0 },
        { symbol: 'AAPL', position: 1 },
      ])

      const symbols = repo.findAll().map((t) => t.symbol)
      expect(symbols).toEqual(['MSFT', 'AAPL'])
    })

    it('handles empty array without throwing', () => {
      expect(() => repo.updatePositions([])).not.toThrow()
    })

    it('ignores unknown symbols without throwing', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      expect(() => repo.updatePositions([{ symbol: 'UNKNOWN', position: 0 }])).not.toThrow()
    })
  })

  describe('remove', () => {
    it('removes an existing ticker by symbol', () => {
      repo.create('AAPL', 'Apple Inc.', 'US')
      repo.remove('AAPL')
      expect(repo.findAll()).toHaveLength(0)
    })

    it('does not throw when removing non-existent symbol', () => {
      expect(() => repo.remove('NONEXISTENT')).not.toThrow()
    })
  })
})
