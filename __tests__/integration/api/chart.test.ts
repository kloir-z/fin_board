import Database from 'better-sqlite3'
import { createCacheOrchestrator } from '@/lib/cache'
import type { ChartPoint } from '@/lib/types'

jest.mock('@/lib/yahoo', () => ({
  fetchQuotes: jest.fn(),
  fetchChart: jest.fn(),
}))

import { fetchChart } from '@/lib/yahoo'
const mockFetchChart = fetchChart as jest.Mock

function setupDb() {
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

const samplePoints: ChartPoint[] = [
  { time: 1700000000, value: 150.0 },
  { time: 1700086400, value: 152.5 },
]

describe('Chart API logic (integration)', () => {
  let db: ReturnType<typeof setupDb>

  beforeEach(() => {
    db = setupDb()
    jest.clearAllMocks()
  })

  afterEach(() => db.close())

  it('returns chart data for valid symbol and timeframe', async () => {
    mockFetchChart.mockResolvedValueOnce(samplePoints)
    const orchestrator = createCacheOrchestrator(db)
    const points = await orchestrator.getCachedChart('AAPL', '1M')
    expect(points).toHaveLength(2)
    expect(points[0].time).toBe(1700000000)
  })

  it('returns empty array for unknown symbol (yahoo returns empty)', async () => {
    mockFetchChart.mockResolvedValueOnce([])
    const orchestrator = createCacheOrchestrator(db)
    const points = await orchestrator.getCachedChart('UNKNOWN', '1D')
    expect(points).toEqual([])
  })

  it('caches chart data on first fetch', async () => {
    mockFetchChart.mockResolvedValueOnce(samplePoints)
    const orchestrator = createCacheOrchestrator(db)
    await orchestrator.getCachedChart('AAPL', '1M')

    // Second call should use cache, not call yahoo again
    const points2 = await orchestrator.getCachedChart('AAPL', '1M')
    expect(mockFetchChart).toHaveBeenCalledTimes(1)
    expect(points2).toHaveLength(2)
  })

  it('supports all valid timeframes', async () => {
    mockFetchChart.mockResolvedValue(samplePoints)
    const orchestrator = createCacheOrchestrator(db)

    const timeframes = ['1D', '1W', '1M', '3M', '1Y'] as const
    for (const tf of timeframes) {
      mockFetchChart.mockResolvedValueOnce(samplePoints)
      const points = await orchestrator.getCachedChart('AAPL', tf)
      expect(Array.isArray(points)).toBe(true)
    }
  })
})
