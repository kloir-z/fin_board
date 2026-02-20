'use client'

import type { Quote } from '@/lib/types'
import { StockCard } from './StockCard'

interface StockGridProps {
  quotes: Quote[]
}

export function StockGrid({ quotes }: StockGridProps) {
  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg">No stocks in watchlist</p>
        <p className="text-sm mt-1">Tap + to add tickers</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-3">
      {quotes.map((quote) => (
        <StockCard key={quote.symbol} quote={quote} />
      ))}
    </div>
  )
}
