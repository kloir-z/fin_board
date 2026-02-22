'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Watchlist } from '@/lib/types'

const STORAGE_KEY = 'fin_board_active_watchlist'

interface UseWatchlistsResult {
  watchlists: Watchlist[]
  activeId: number | null
  setActiveId: (id: number) => void
  createWatchlist: (name: string) => Promise<Watchlist | null>
  renameWatchlist: (id: number, name: string) => Promise<void>
  deleteWatchlist: (id: number) => Promise<void>
  reload: () => Promise<void>
}

export function useWatchlists(): UseWatchlistsResult {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [activeId, setActiveIdState] = useState<number | null>(null)

  const setActiveId = useCallback((id: number) => {
    setActiveIdState(id)
    localStorage.setItem(STORAGE_KEY, String(id))
  }, [])

  // Initial mount only: fetch list and restore active selection from localStorage
  useEffect(() => {
    fetch('/api/watchlists')
      .then((r) => r.json())
      .then((json) => {
        const list: Watchlist[] = json.data ?? []
        setWatchlists(list)
        if (list.length === 0) return

        const stored = localStorage.getItem(STORAGE_KEY)
        const storedId = stored ? Number(stored) : null
        const valid = storedId !== null && list.some((w) => w.id === storedId)
        const resolved = valid ? storedId : list[0].id
        setActiveIdState(resolved)
        localStorage.setItem(STORAGE_KEY, String(resolved))
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // reload: refresh the watchlists list ONLY — never resets activeId
  const reload = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/watchlists')
      const json = await res.json()
      const list: Watchlist[] = json.data ?? []
      setWatchlists(list)
      // Only adjust activeId if the currently active watchlist was deleted
      setActiveIdState((prev) => {
        if (prev !== null && list.some((w) => w.id === prev)) return prev
        const fallback = list[0]?.id ?? null
        if (fallback !== null) localStorage.setItem(STORAGE_KEY, String(fallback))
        return fallback
      })
    } catch {
      // keep existing state
    }
  }, [])

  const createWatchlist = useCallback(async (name: string): Promise<Watchlist | null> => {
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!json.success) return null
      const created: Watchlist = json.data
      setWatchlists((prev) => [...prev, created])
      setActiveId(created.id)
      return created
    } catch {
      return null
    }
  }, [setActiveId])

  const renameWatchlist = useCallback(async (id: number, name: string): Promise<void> => {
    try {
      const res = await fetch('/api/watchlists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      })
      const json = await res.json()
      if (!json.success) return
      setWatchlists((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)))
    } catch {
      // keep existing state
    }
  }, [])

  const deleteWatchlist = useCallback(async (id: number): Promise<void> => {
    try {
      const res = await fetch('/api/watchlists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!json.success) return
      setWatchlists((prev) => {
        const next = prev.filter((w) => w.id !== id)
        // If we deleted the active watchlist, switch to first available
        setActiveIdState((current) => {
          if (current !== id) return current
          const fallback = next[0]?.id ?? null
          if (fallback !== null) localStorage.setItem(STORAGE_KEY, String(fallback))
          return fallback
        })
        return next
      })
    } catch {
      // keep existing state
    }
  }, [])

  return { watchlists, activeId, setActiveId, createWatchlist, renameWatchlist, deleteWatchlist, reload }
}
