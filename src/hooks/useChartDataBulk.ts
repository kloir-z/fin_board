'use client'

import { useState, useEffect, useRef } from 'react'
import type { ChartPoint, Timeframe } from '@/lib/types'

// 全銘柄の期間変動率 (periodPct) を計算して返す
// StockGrid のソートで使用（各 StockCard の useChartData とは独立）
export function useChartDataBulk(
  symbols: string[],
  timeframe: Timeframe
): Map<string, number> {
  const [periodPctMap, setPeriodPctMap] = useState<Map<string, number>>(new Map())
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (symbols.length === 0) {
      setPeriodPctMap(new Map())
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(async () => {
      const results = await Promise.allSettled(
        symbols.map((sym) =>
          fetch(`/api/chart?symbol=${encodeURIComponent(sym)}&timeframe=${timeframe}`)
            .then((r) => r.json())
            .then((json) => ({ sym, data: (json.data ?? []) as ChartPoint[] }))
        )
      )

      const map = new Map<string, number>()
      for (const result of results) {
        if (result.status === 'rejected') continue
        const { sym, data } = result.value
        if (data.length >= 2) {
          const first = data[0].value
          const last = data[data.length - 1].value
          map.set(sym, ((last - first) / first) * 100)
        }
      }
      setPeriodPctMap(map)
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  // symbols は毎レンダーで新しい配列になるため join で比較
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(','), timeframe])

  return periodPctMap
}
