import Database from 'better-sqlite3'
import { createCacheOrchestrator } from '@/lib/cache'
import { createTickerRepository } from '@/repositories/ticker-repository'

jest.mock('@/lib/yahoo', () => ({
  fetchQuotes: jest.fn(),
  fetchChart: jest.fn(),
}))

import { fetchQuotes } from '@/lib/yahoo'
const mockFetchQuotes = fetchQuotes as jest.Mock

const WATCHLIST_ID = 1

function setupDb() {
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
    CREATE TABLE price_cache (
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (symbol, timeframe)
    );
    INSERT INTO watchlists (id, name, position) VALUES (${WATCHLIST_ID}, 'Default', 1);
  `)
  return db
}

describe('Quotes API logic (integration)', () => {
  let db: ReturnType<typeof setupDb>

  beforeEach(() => {
    db = setupDb()
    jest.clearAllMocks()
  })

  afterEach(() => db.close())

  it('returns quotes for all watchlist tickers', async () => {
    const tickerRepo = createTickerRepository(db)
    tickerRepo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)
    tickerRepo.create('MSFT', 'Microsoft Corp.', 'US', WATCHLIST_ID)

    mockFetchQuotes.mockResolvedValue([
      {
        symbol: 'AAPL',
        price: 180,
        previousClose: 178,
        change: 2,
        changePercent: 1.12,
        currency: 'USD',
        marketState: 'REGULAR',
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: 'MSFT',
        price: 400,
        previousClose: 395,
        change: 5,
        changePercent: 1.27,
        currency: 'USD',
        marketState: 'REGULAR',
        updatedAt: new Date().toISOString(),
      },
    ])

    const orchestrator = createCacheOrchestrator(db)
    const tickers = tickerRepo.findAll(WATCHLIST_ID)
    const symbols = tickers.map((t) => t.symbol)
    const quotes = await orchestrator.getCachedQuotes(symbols)

    expect(quotes).toHaveLength(2)
  })

  it('returns empty array when watchlist is empty', async () => {
    const orchestrator = createCacheOrchestrator(db)
    const quotes = await orchestrator.getCachedQuotes([])
    expect(quotes).toEqual([])
  })

  it('handles partial yahoo failure gracefully', async () => {
    const tickerRepo = createTickerRepository(db)
    tickerRepo.create('AAPL', 'Apple Inc.', 'US', WATCHLIST_ID)

    mockFetchQuotes.mockResolvedValueOnce([
      {
        symbol: 'AAPL',
        price: 180,
        previousClose: 178,
        change: 2,
        changePercent: 1.12,
        currency: 'USD',
        marketState: 'REGULAR',
        updatedAt: new Date().toISOString(),
      },
    ])

    const orchestrator = createCacheOrchestrator(db)
    const quotes = await orchestrator.getCachedQuotes(['AAPL'])
    expect(quotes).toHaveLength(1)
  })
})
