'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Quote } from '@/lib/types'

interface UseQuotesResult {
  quotes: Quote[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

const POLL_INTERVAL_MS = 60_000

export function useQuotes(watchlistId: number | null): UseQuotesResult {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchQuotes = useCallback(async () => {
    if (watchlistId === null) return
    try {
      const res = await fetch(`/api/quotes?watchlistId=${watchlistId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Unknown error')
      setQuotes(json.data ?? [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotes')
    } finally {
      setIsLoading(false)
    }
  }, [watchlistId])

  useEffect(() => {
    setIsLoading(true)
    setQuotes([])
    fetchQuotes()
    const interval = setInterval(fetchQuotes, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchQuotes])

  return { quotes, isLoading, error, lastUpdated, refresh: fetchQuotes }
}
