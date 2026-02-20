'use client'

import { useState } from 'react'
import { useQuotes } from '@/hooks/useQuotes'
import { StockGrid } from '@/components/StockGrid'
import { StockGridSkeleton } from '@/components/StockCardSkeleton'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import { TickerManager } from '@/components/TickerManager'

export default function DashboardPage() {
  const { quotes, isLoading, error, lastUpdated, refresh } = useQuotes()
  const [managerOpen, setManagerOpen] = useState(false)

  return (
    <main className="min-h-screen bg-gray-950">
      <RefreshIndicator lastUpdated={lastUpdated} onRefresh={refresh} isLoading={isLoading} />

      {error && (
        <div className="mx-3 mt-3 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {isLoading && quotes.length === 0 ? (
        <StockGridSkeleton count={10} />
      ) : (
        <StockGrid quotes={quotes} />
      )}

      {/* Floating add button */}
      <button
        onClick={() => setManagerOpen(true)}
        aria-label="Manage watchlist"
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white text-2xl leading-none z-10"
      >
        +
      </button>

      <TickerManager
        isOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
        onChange={refresh}
      />
    </main>
  )
}
