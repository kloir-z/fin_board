import Database from 'better-sqlite3'
import { buildSeedData, toCSV } from '@/app/api/export/route'
import { createWatchlistRepository } from '@/repositories/watchlist-repository'
import { createTickerRepository } from '@/repositories/ticker-repository'

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

describe('Export logic', () => {
  let db: ReturnType<typeof Database>
  let wlRepo: ReturnType<typeof createWatchlistRepository>
  let tickerRepo: ReturnType<typeof createTickerRepository>

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(SCHEMA)
    db.prepare("INSERT INTO watchlists (name, position) VALUES ('Default', 1)").run()
    wlRepo = createWatchlistRepository(db)
    tickerRepo = createTickerRepository(db)
  })

  afterEach(() => db.close())

  describe('buildSeedData', () => {
    it('returns watchlist with empty tickers array', () => {
      const data = buildSeedData(db)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Default')
      expect(data[0].tickers).toHaveLength(0)
    })

    it('includes all tickers for a watchlist', () => {
      const [wl] = wlRepo.findAll()
      tickerRepo.create('AAPL', 'Apple Inc.', 'US', wl.id)
      tickerRepo.create('7203.T', 'Toyota Motor', 'JP', wl.id)
      const data = buildSeedData(db)
      expect(data[0].tickers).toHaveLength(2)
      expect(data[0].tickers[0].symbol).toBe('AAPL')
      expect(data[0].tickers[1].symbol).toBe('7203.T')
    })

    it('includes MY/TH/VN tickers with correct market field', () => {
      const [wl] = wlRepo.findAll()
      tickerRepo.create('1155.KL', 'Maybank', 'MY', wl.id)
      tickerRepo.create('PTT.BK', 'PTT', 'TH', wl.id)
      tickerRepo.create('VNM.VN', 'Vinamilk', 'VN', wl.id)
      const data = buildSeedData(db)
      expect(data[0].tickers).toHaveLength(3)
      expect(data[0].tickers[0]).toMatchObject({ symbol: '1155.KL', market: 'MY' })
      expect(data[0].tickers[1]).toMatchObject({ symbol: 'PTT.BK', market: 'TH' })
      expect(data[0].tickers[2]).toMatchObject({ symbol: 'VNM.VN', market: 'VN' })
    })

    it('includes multiple watchlists in position order', () => {
      wlRepo.create('Second List')
      const data = buildSeedData(db)
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('Default')
      expect(data[1].name).toBe('Second List')
    })

    it('only includes symbol, name, market fields in ticker objects', () => {
      const [wl] = wlRepo.findAll()
      tickerRepo.create('AAPL', 'Apple Inc.', 'US', wl.id)
      const data = buildSeedData(db)
      const ticker = data[0].tickers[0]
      expect(Object.keys(ticker).sort()).toEqual(['market', 'name', 'symbol'])
    })
  })

  describe('toCSV', () => {
    it('always produces header row even for empty data', () => {
      const csv = toCSV([])
      expect(csv.trim()).toBe('watchlist,symbol,name,market')
    })

    it('serializes a ticker row correctly', () => {
      const csv = toCSV([
        { name: 'Default', tickers: [{ symbol: 'AAPL', name: 'Apple Inc.', market: 'US' }] },
      ])
      const lines = csv.trim().split('\n')
      expect(lines[1]).toBe('Default,AAPL,Apple Inc.,US')
    })

    it('quotes fields that contain commas', () => {
      const csv = toCSV([
        { name: 'My, List', tickers: [{ symbol: 'AAPL', name: 'Apple, Inc.', market: 'US' }] },
      ])
      expect(csv).toContain('"My, List"')
      expect(csv).toContain('"Apple, Inc."')
    })

    it('escapes double-quotes per RFC 4180', () => {
      const csv = toCSV([
        { name: 'Test', tickers: [{ symbol: 'AAPL', name: 'Apple "Big" Inc.', market: 'US' }] },
      ])
      expect(csv).toContain('"Apple ""Big"" Inc."')
    })

    it('produces one row per ticker across multiple watchlists', () => {
      const data = [
        {
          name: 'List A',
          tickers: [
            { symbol: 'AAPL', name: 'Apple', market: 'US' as const },
            { symbol: 'MSFT', name: 'Microsoft', market: 'US' as const },
          ],
        },
        {
          name: 'List B',
          tickers: [{ symbol: '7203.T', name: 'Toyota', market: 'JP' as const }],
        },
      ]
      const lines = toCSV(data).trim().split('\n')
      expect(lines).toHaveLength(4) // header + 3 ticker rows
      expect(lines[1]).toContain('List A')
      expect(lines[2]).toContain('List A')
      expect(lines[3]).toContain('List B')
    })
  })
})
