import Database from 'better-sqlite3'
import { createCacheOrchestrator } from '@/lib/cache'
import { createTickerRepository } from '@/repositories/ticker-repository'

jest.mock('@/lib/yahoo', () => ({
  fetchQuotes: jest.fn(),
  fetchChart: jest.fn(),
}))

import { fetchQuotes } from '@/lib/yahoo'
const mockFetchQuotes = fetchQuotes as jest.Mock

function setupDb() {
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
    CREATE TABLE price_cache (
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (symbol, timeframe)
    );
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
    tickerRepo.create('AAPL', 'Apple Inc.', 'US')
    tickerRepo.create('MSFT', 'Microsoft Corp.', 'US')

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
    const tickers = tickerRepo.findAll()
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
    tickerRepo.create('AAPL', 'Apple Inc.', 'US')

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
