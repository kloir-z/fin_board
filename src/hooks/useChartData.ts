'use client'

import { useState, useEffect, useRef } from 'react'
import type { ChartPoint, Timeframe } from '@/lib/types'

interface UseChartDataResult {
  data: ChartPoint[]
  isLoading: boolean
}

export function useChartData(symbol: string, timeframe: Timeframe): UseChartDataResult {
  const [data, setData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json.data ?? [])
      } catch {
        setData([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [symbol, timeframe])

  return { data, isLoading }
}
