'use client'

import { useState } from 'react'
import { useWatchlists } from '@/hooks/useWatchlists'
import { useQuotes } from '@/hooks/useQuotes'
import { StockGrid } from '@/components/StockGrid'
import { StockGridSkeleton } from '@/components/StockCardSkeleton'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import { TickerManager } from '@/components/TickerManager'
import type { Timeframe } from '@/lib/types'

export default function DashboardPage() {
  const { watchlists, activeId, setActiveId, createWatchlist, renameWatchlist, deleteWatchlist, reload } =
    useWatchlists()
  const { quotes, isLoading, error, lastUpdated, refresh } = useQuotes(activeId)
  const [managerOpen, setManagerOpen] = useState(false)
  const [globalTimeframe, setGlobalTimeframe] = useState<Timeframe>('1D')

  const handleTickerChange = () => {
    refresh()
  }

  const handleDeleteWatchlist = async (id: number) => {
    await deleteWatchlist(id)
    refresh()
  }

  return (
    <main className="min-h-screen bg-gray-950">
      <RefreshIndicator
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        isLoading={isLoading}
        watchlists={watchlists}
        activeWatchlistId={activeId}
        onSelectWatchlist={(id) => { setActiveId(id) }}
        onAddTicker={() => setManagerOpen(true)}
        onCreateWatchlist={async (name) => { await createWatchlist(name) }}
        onRenameWatchlist={renameWatchlist}
        onDeleteWatchlist={handleDeleteWatchlist}
        globalTimeframe={globalTimeframe}
        onGlobalTimeframeChange={setGlobalTimeframe}
      />

      {error && (
        <div className="mx-3 mt-3 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {isLoading && quotes.length === 0 ? (
        <StockGridSkeleton count={10} />
      ) : (
        <StockGrid quotes={quotes} watchlistId={activeId} globalTimeframe={globalTimeframe} />
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
