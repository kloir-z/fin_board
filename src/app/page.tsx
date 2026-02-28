'use client'

import { useState, useEffect } from 'react'
import { useWatchlists } from '@/hooks/useWatchlists'
import { useQuotes } from '@/hooks/useQuotes'
import { StockGrid } from '@/components/StockGrid'
import { StockGridSkeleton } from '@/components/StockCardSkeleton'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import type { SortKey } from '@/components/RefreshIndicator'
import { TickerManager } from '@/components/TickerManager'
import type { Timeframe } from '@/lib/types'

const ALL_TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y']

export default function DashboardPage() {
  const { watchlists, activeId, setActiveId, createWatchlist, renameWatchlist, deleteWatchlist, reload } =
    useWatchlists()
  const { quotes, isLoading, error, refresh } = useQuotes(activeId)
  const [managerOpen, setManagerOpen] = useState(false)
  const [globalTimeframe, setGlobalTimeframe] = useState<Timeframe>('1D')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [isFrozen, setIsFrozen] = useState(false)

  // キーボードショートカット: 数字キー 1〜9 で期間切り替え
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const idx = parseInt(e.key, 10) - 1
      if (idx >= 0 && idx < ALL_TIMEFRAMES.length) {
        setGlobalTimeframe(ALL_TIMEFRAMES[idx])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSelectWatchlist = (id: number) => {
    setActiveId(id)
    setIsFrozen(false)
  }

  const handleSortChange = (key: SortKey) => {
    setIsFrozen(false)
    setSortKey(key)
  }

  const handleTickerChange = () => {
    refresh()
  }

  const handleDeleteWatchlist = async (id: number) => {
    await deleteWatchlist(id)
    refresh()
  }

  return (
    <main className="min-h-screen bg-gray-950 pb-16"
      style={{ paddingBottom: 'max(64px, calc(56px + env(safe-area-inset-bottom)))' }}
    >
      <RefreshIndicator
        watchlists={watchlists}
        activeWatchlistId={activeId}
        onSelectWatchlist={handleSelectWatchlist}
        onAddTicker={() => setManagerOpen(true)}
        onCreateWatchlist={async (name) => { await createWatchlist(name) }}
        onRenameWatchlist={renameWatchlist}
        onDeleteWatchlist={handleDeleteWatchlist}
        globalTimeframe={globalTimeframe}
        onGlobalTimeframeChange={setGlobalTimeframe}
        sortKey={sortKey}
        onSortChange={handleSortChange}
        isFrozen={isFrozen}
        onFreezeChange={setIsFrozen}
      />

      {error && (
        <div className="mx-3 mt-3 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {isLoading && quotes.length === 0 ? (
        <StockGridSkeleton count={10} />
      ) : (
        <StockGrid quotes={quotes} watchlistId={activeId} globalTimeframe={globalTimeframe} sortKey={sortKey} isFrozen={isFrozen} watchlists={watchlists} onRefresh={refresh} />
      )}

      <TickerManager
        isOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
        onChange={handleTickerChange}
        watchlistId={activeId}
      />
    </main>
  )
}
