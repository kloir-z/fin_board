import Database from 'better-sqlite3'
import { createCacheRepository } from '@/repositories/cache-repository'
import type { ChartPoint } from '@/lib/types'

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

const sampleData: ChartPoint[] = [
  { time: 1700000000, value: 150.0 },
  { time: 1700086400, value: 152.5 },
]

describe('CacheRepository', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createCacheRepository>

  beforeEach(() => {
    db = createTestDb()
    repo = createCacheRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('get', () => {
    it('returns null for missing cache entry', () => {
      expect(repo.get('AAPL', '1D', 15)).toBeNull()
    })

    it('returns data for a fresh cache entry', () => {
      repo.set('AAPL', '1D', sampleData)
      const result = repo.get('AAPL', '1D', 15)
      expect(result).toHaveLength(2)
      expect(result![0].value).toBe(150.0)
    })

    it('returns null for an expired cache entry', () => {
      // Insert with a fetched_at in the past (30 minutes ago)
      db.prepare(
        "INSERT INTO price_cache (symbol, timeframe, data, fetched_at) VALUES (?, ?, ?, datetime('now', '-30 minutes'))"
      ).run('AAPL', '1D', JSON.stringify(sampleData))
      // TTL is 15 minutes — should be expired
      expect(repo.get('AAPL', '1D', 15)).toBeNull()
    })

    it('returns data when TTL has not elapsed', () => {
      // Insert with fetched_at 5 minutes ago
      db.prepare(
        "INSERT INTO price_cache (symbol, timeframe, data, fetched_at) VALUES (?, ?, ?, datetime('now', '-5 minutes'))"
      ).run('AAPL', '1D', JSON.stringify(sampleData))
      // TTL is 15 minutes — should still be fresh
      expect(repo.get('AAPL', '1D', 15)).not.toBeNull()
    })
  })

  describe('set', () => {
    it('stores chart data for a symbol and timeframe', () => {
      repo.set('AAPL', '1D', sampleData)
      const result = repo.get('AAPL', '1D', 60)
      expect(result).toHaveLength(2)
    })

    it('overwrites existing cache entry (upsert)', () => {
      repo.set('AAPL', '1D', sampleData)
      const newData: ChartPoint[] = [{ time: 1700200000, value: 160.0 }]
      repo.set('AAPL', '1D', newData)
      const result = repo.get('AAPL', '1D', 60)
      expect(result).toHaveLength(1)
      expect(result![0].value).toBe(160.0)
    })
  })

  describe('invalidate', () => {
    it('removes all cache entries for a symbol', () => {
      repo.set('AAPL', '1D', sampleData)
      repo.set('AAPL', '1M', sampleData)
      repo.invalidate('AAPL')
      expect(repo.get('AAPL', '1D', 60)).toBeNull()
      expect(repo.get('AAPL', '1M', 60)).toBeNull()
    })

    it('does not remove cache for other symbols', () => {
      repo.set('AAPL', '1D', sampleData)
      repo.set('GOOGL', '1D', sampleData)
      repo.invalidate('AAPL')
      expect(repo.get('GOOGL', '1D', 60)).not.toBeNull()
    })
  })

  describe('invalidateAll', () => {
    it('removes all cache entries', () => {
      repo.set('AAPL', '1D', sampleData)
      repo.set('GOOGL', '1W', sampleData)
      repo.invalidateAll()
      expect(repo.get('AAPL', '1D', 60)).toBeNull()
      expect(repo.get('GOOGL', '1W', 60)).toBeNull()
    })
  })
})
