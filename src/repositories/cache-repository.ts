import type Database from 'better-sqlite3'
import type { ChartPoint } from '@/lib/types'

export function createCacheRepository(db: ReturnType<typeof Database>) {
  const get = (symbol: string, timeframe: string, ttlMinutes: number): ChartPoint[] | null => {
    const row = db
      .prepare(
        `SELECT data FROM price_cache
         WHERE symbol = ? AND timeframe = ?
           AND fetched_at > datetime('now', ? || ' minutes')`
      )
      .get(symbol, timeframe, `-${ttlMinutes}`) as { data: string } | undefined

    if (!row) return null
    return JSON.parse(row.data) as ChartPoint[]
  }

  const set = (symbol: string, timeframe: string, data: ChartPoint[]): void => {
    db.prepare(
      `INSERT INTO price_cache (symbol, timeframe, data, fetched_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (symbol, timeframe) DO UPDATE SET
         data = excluded.data,
         fetched_at = excluded.fetched_at`
    ).run(symbol, timeframe, JSON.stringify(data))
  }

  const invalidate = (symbol: string): void => {
    db.prepare('DELETE FROM price_cache WHERE symbol = ?').run(symbol)
  }

  const invalidateAll = (): void => {
    db.prepare('DELETE FROM price_cache').run()
  }

  return { get, set, invalidate, invalidateAll }
}
