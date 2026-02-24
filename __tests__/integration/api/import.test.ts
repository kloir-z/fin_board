import Database from 'better-sqlite3'
import { parseJSON, parseCSV, replaceAll } from '@/app/api/import/route'

const SCHEMA = `
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
    market TEXT NOT NULL CHECK (market IN ('US', 'JP', 'MY', 'TH', 'VN')),
    position INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, watchlist_id)
  );
`

describe('Import logic', () => {
  let db: ReturnType<typeof Database>

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(SCHEMA)
    // Seed with existing data that should be wiped on import
    db.prepare("INSERT INTO watchlists (name, position) VALUES ('OldList', 1)").run()
    db.prepare(
      "INSERT INTO tickers (watchlist_id, symbol, name, market, position) VALUES (1, 'OLD', 'Old Ticker', 'US', 1)"
    ).run()
  })

  afterEach(() => db.close())

  // ---------------------------------------------------------------------------
  // parseJSON
  // ---------------------------------------------------------------------------
  describe('parseJSON', () => {
    it('parses valid seed.json format', () => {
      const json = JSON.stringify([
        { name: 'Test', tickers: [{ symbol: 'AAPL', name: 'Apple', market: 'US' }] },
      ])
      const result = parseJSON(json)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test')
      expect(result[0].tickers[0].symbol).toBe('AAPL')
    })

    it('parses multiple watchlists', () => {
      const json = JSON.stringify([
        { name: 'A', tickers: [] },
        { name: 'B', tickers: [{ symbol: 'MSFT', name: 'Microsoft', market: 'US' }] },
      ])
      expect(parseJSON(json)).toHaveLength(2)
    })

    it('throws on invalid JSON syntax', () => {
      expect(() => parseJSON('not json')).toThrow()
    })

    it('throws when root is not an array', () => {
      expect(() => parseJSON('{"name": "Test"}')).toThrow()
    })

    it('throws when tickers field is missing', () => {
      expect(() => parseJSON(JSON.stringify([{ name: 'Test' }]))).toThrow()
    })

    it('throws on invalid market value', () => {
      const json = JSON.stringify([
        { name: 'Test', tickers: [{ symbol: 'AAPL', name: 'Apple', market: 'XX' }] },
      ])
      expect(() => parseJSON(json)).toThrow()
    })

    it('parses MY/TH/VN market values', () => {
      const json = JSON.stringify([
        {
          name: 'ASEAN',
          tickers: [
            { symbol: '1155.KL', name: 'Maybank', market: 'MY' },
            { symbol: 'PTT.BK', name: 'PTT', market: 'TH' },
            { symbol: 'VNM.VN', name: 'Vinamilk', market: 'VN' },
          ],
        },
      ])
      const result = parseJSON(json)
      expect(result[0].tickers[0].market).toBe('MY')
      expect(result[0].tickers[1].market).toBe('TH')
      expect(result[0].tickers[2].market).toBe('VN')
    })

    it('throws when name field is missing from a watchlist', () => {
      expect(() =>
        parseJSON(JSON.stringify([{ tickers: [{ symbol: 'AAPL', name: 'Apple', market: 'US' }] }]))
      ).toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // parseCSV
  // ---------------------------------------------------------------------------
  describe('parseCSV', () => {
    it('parses basic CSV format', () => {
      const csv = 'watchlist,symbol,name,market\nDefault,AAPL,Apple Inc.,US\n'
      const result = parseCSV(csv)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Default')
      expect(result[0].tickers[0]).toEqual({ symbol: 'AAPL', name: 'Apple Inc.', market: 'US' })
    })

    it('throws on wrong CSV header', () => {
      expect(() => parseCSV('wrong,header,here,format\nA,B,C,D')).toThrow()
    })

    it('handles RFC 4180 quoting with commas in fields', () => {
      const csv = 'watchlist,symbol,name,market\n"My, List",AAPL,"Apple, Inc.",US\n'
      const result = parseCSV(csv)
      expect(result[0].name).toBe('My, List')
      expect(result[0].tickers[0].name).toBe('Apple, Inc.')
    })

    it('handles escaped double-quotes in fields', () => {
      const csv = 'watchlist,symbol,name,market\nTest,AAPL,"Apple ""Big"" Inc.",US\n'
      const result = parseCSV(csv)
      expect(result[0].tickers[0].name).toBe('Apple "Big" Inc.')
    })

    it('groups multiple rows by watchlist name', () => {
      const csv = [
        'watchlist,symbol,name,market',
        'List A,AAPL,Apple,US',
        'List A,MSFT,Microsoft,US',
        'List B,7203.T,Toyota,JP',
      ].join('\n')
      const result = parseCSV(csv)
      expect(result).toHaveLength(2)
      expect(result[0].tickers).toHaveLength(2)
      expect(result[1].tickers).toHaveLength(1)
    })

    it('preserves watchlist order as first-seen', () => {
      const csv = [
        'watchlist,symbol,name,market',
        'Second,MSFT,Microsoft,US',
        'First,AAPL,Apple,US',
      ].join('\n')
      const result = parseCSV(csv)
      expect(result[0].name).toBe('Second')
      expect(result[1].name).toBe('First')
    })

    it('throws on empty CSV (header only)', () => {
      expect(() => parseCSV('watchlist,symbol,name,market\n')).toThrow()
    })

    it('throws on invalid market value', () => {
      expect(() => parseCSV('watchlist,symbol,name,market\nDefault,AAPL,Apple,XX')).toThrow()
    })

    it('parses MY/TH/VN market values from CSV', () => {
      const csv = [
        'watchlist,symbol,name,market',
        'ASEAN,1155.KL,Maybank,MY',
        'ASEAN,PTT.BK,PTT,TH',
        'ASEAN,VNM.VN,Vinamilk,VN',
      ].join('\n')
      const result = parseCSV(csv)
      expect(result[0].tickers[0].market).toBe('MY')
      expect(result[0].tickers[1].market).toBe('TH')
      expect(result[0].tickers[2].market).toBe('VN')
    })

    it('handles CRLF line endings', () => {
      const csv = 'watchlist,symbol,name,market\r\nDefault,AAPL,Apple,US\r\n'
      const result = parseCSV(csv)
      expect(result[0].tickers[0].symbol).toBe('AAPL')
    })
  })

  // ---------------------------------------------------------------------------
  // replaceAll
  // ---------------------------------------------------------------------------
  describe('replaceAll', () => {
    it('replaces all existing data with new watchlists and tickers', () => {
      replaceAll(db, [
        { name: 'New', tickers: [{ symbol: 'TSLA', name: 'Tesla', market: 'US' }] },
      ])

      const watchlists = db.prepare('SELECT name FROM watchlists').all() as { name: string }[]
      expect(watchlists).toHaveLength(1)
      expect(watchlists[0].name).toBe('New')

      const tickers = db.prepare('SELECT symbol FROM tickers').all() as { symbol: string }[]
      expect(tickers).toHaveLength(1)
      expect(tickers[0].symbol).toBe('TSLA')
    })

    it('returns correct watchlist and ticker counts', () => {
      const result = replaceAll(db, [
        {
          name: 'List',
          tickers: [
            { symbol: 'AAPL', name: 'Apple', market: 'US' },
            { symbol: 'MSFT', name: 'Microsoft', market: 'US' },
          ],
        },
      ])
      expect(result.watchlists).toBe(1)
      expect(result.tickers).toBe(2)
    })

    it('assigns positions to tickers in insertion order', () => {
      replaceAll(db, [
        {
          name: 'List',
          tickers: [
            { symbol: 'AAPL', name: 'Apple', market: 'US' },
            { symbol: 'MSFT', name: 'Microsoft', market: 'US' },
            { symbol: 'GOOGL', name: 'Alphabet', market: 'US' },
          ],
        },
      ])
      const tickers = db
        .prepare('SELECT symbol, position FROM tickers ORDER BY position ASC')
        .all() as { symbol: string; position: number }[]
      expect(tickers.map((t) => t.symbol)).toEqual(['AAPL', 'MSFT', 'GOOGL'])
      expect(tickers.map((t) => t.position)).toEqual([1, 2, 3])
    })

    it('assigns positions to watchlists in insertion order', () => {
      replaceAll(db, [
        { name: 'A', tickers: [] },
        { name: 'B', tickers: [] },
        { name: 'C', tickers: [] },
      ])
      const lists = db
        .prepare('SELECT name, position FROM watchlists ORDER BY position ASC')
        .all() as { name: string; position: number }[]
      expect(lists.map((w) => w.name)).toEqual(['A', 'B', 'C'])
    })

    it('handles watchlist with empty tickers', () => {
      expect(() => replaceAll(db, [{ name: 'Empty', tickers: [] }])).not.toThrow()
      const lists = db.prepare('SELECT name FROM watchlists').all() as { name: string }[]
      expect(lists[0].name).toBe('Empty')
    })

    it('handles multiple watchlists with tickers', () => {
      replaceAll(db, [
        { name: 'US', tickers: [{ symbol: 'AAPL', name: 'Apple', market: 'US' }] },
        { name: 'JP', tickers: [{ symbol: '7203.T', name: 'Toyota', market: 'JP' }] },
      ])
      const lists = db
        .prepare('SELECT name FROM watchlists ORDER BY position ASC')
        .all() as { name: string }[]
      expect(lists).toHaveLength(2)
      expect(lists[0].name).toBe('US')
      expect(lists[1].name).toBe('JP')

      const tickers = db.prepare('SELECT symbol FROM tickers').all() as { symbol: string }[]
      expect(tickers).toHaveLength(2)
    })

    it('uppercases ticker symbols', () => {
      replaceAll(db, [
        { name: 'List', tickers: [{ symbol: 'aapl', name: 'Apple', market: 'US' }] },
      ])
      const ticker = db.prepare('SELECT symbol FROM tickers LIMIT 1').get() as { symbol: string }
      expect(ticker.symbol).toBe('AAPL')
    })
  })
})
