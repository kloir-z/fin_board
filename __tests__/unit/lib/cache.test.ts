import Database from 'better-sqlite3'
import { createCacheOrchestrator } from '@/lib/cache'
import type { ChartPoint, Quote } from '@/lib/types'

// Mock the yahoo module
jest.mock('@/lib/yahoo', () => ({
  fetchQuotes: jest.fn(),
  fetchChart: jest.fn(),
}))

import { fetchQuotes, fetchChart } from '@/lib/yahoo'

const mockFetchQuotes = fetchQuotes as jest.Mock
const mockFetchChart = fetchChart as jest.Mock

function createTestDb() {
  const db = new Database(':memory:')
  db.exec(`
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

const sampleQuote: Quote = {
  symbol: 'AAPL',
  price: 180.0,
  previousClose: 178.0,
  change: 2.0,
  changePercent: 1.12,
  currency: 'USD',
  marketState: 'REGULAR',
  updatedAt: new Date().toISOString(),
}

const sampleChart: ChartPoint[] = [
  { time: 1700000000, value: 178.0 },
  { time: 1700086400, value: 180.0 },
]

describe('CacheOrchestrator', () => {
  let db: ReturnType<typeof createTestDb>
  let orchestrator: ReturnType<typeof createCacheOrchestrator>

  beforeEach(() => {
    db = createTestDb()
    orchestrator = createCacheOrchestrator(db)
    jest.clearAllMocks()
  })

  afterEach(() => {
    db.close()
  })

  describe('getCachedQuotes', () => {
    it('fetches from yahoo when cache is empty', async () => {
      mockFetchQuotes.mockResolvedValueOnce([sampleQuote])
      const result = await orchestrator.getCachedQuotes(['AAPL'])
      expect(mockFetchQuotes).toHaveBeenCalledWith(['AAPL'])
      expect(result).toHaveLength(1)
    })

    it('returns cached quotes without calling yahoo', async () => {
      // Pre-populate cache
      db.prepare(
        "INSERT INTO price_cache (symbol, timeframe, data, fetched_at) VALUES (?, ?, ?, datetime('now'))"
      ).run('AAPL', '__quote__', JSON.stringify([sampleQuote]))

      const result = await orchestrator.getCachedQuotes(['AAPL'])
      expect(mockFetchQuotes).not.toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('returns empty array when yahoo fails', async () => {
      mockFetchQuotes.mockRejectedValueOnce(new Error('Network error'))
      const result = await orchestrator.getCachedQuotes(['AAPL'])
      expect(result).toEqual([])
    })
  })

  describe('getCachedChart', () => {
    it('fetches from yahoo when cache is empty', async () => {
      mockFetchChart.mockResolvedValueOnce(sampleChart)
      const result = await orchestrator.getCachedChart('AAPL', '1M')
      expect(mockFetchChart).toHaveBeenCalledWith('AAPL', '1M')
      expect(result).toHaveLength(2)
    })

    it('returns cached chart without calling yahoo', async () => {
      db.prepare(
        "INSERT INTO price_cache (symbol, timeframe, data, fetched_at) VALUES (?, ?, ?, datetime('now'))"
      ).run('AAPL', '1M', JSON.stringify(sampleChart))

      const result = await orchestrator.getCachedChart('AAPL', '1M')
      expect(mockFetchChart).not.toHaveBeenCalled()
      expect(result).toHaveLength(2)
    })

    it('returns empty array when yahoo chart fails', async () => {
      mockFetchChart.mockResolvedValueOnce([])
      const result = await orchestrator.getCachedChart('AAPL', '1D')
      expect(result).toEqual([])
    })
  })
})
