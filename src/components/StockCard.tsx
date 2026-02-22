'use client'

import { useState, useEffect } from 'react'
import type { Quote, Timeframe } from '@/lib/types'
import { TimeframeSelector } from './TimeframeSelector'
import { Sparkline } from './Sparkline'
import { useChartData } from '@/hooks/useChartData'
import { formatPrice } from '@/lib/formatters'

interface StockCardProps {
  quote: Quote
  globalTimeframe?: Timeframe
}

function formatChange(change: number, changePercent: number, currency: string): string {
  const sign = change >= 0 ? '+' : ''
  if (currency === 'JPY') {
    return `${sign}${Math.round(change)} (${sign}${changePercent.toFixed(2)}%)`
  }
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
}

export function StockCard({ quote, globalTimeframe }: StockCardProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>(globalTimeframe ?? '1D')

  useEffect(() => {
    if (globalTimeframe) setTimeframe(globalTimeframe)
  }, [globalTimeframe])
  const { data } = useChartData(quote.symbol, timeframe)

  const isPositive = quote.change >= 0
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="bg-gray-800 rounded-lg p-2 flex flex-col gap-1 border border-gray-700">
      <div className="flex items-center justify-between gap-1">
        <div className="font-bold text-white text-xs leading-tight truncate min-w-0 flex-1">{quote.name}</div>
        <div className="font-semibold text-white text-xs shrink-0">{formatPrice(quote.price, quote.currency)}</div>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[10px] text-gray-500 shrink-0">{quote.symbol}</div>
        <div className={`text-[10px] ${changeColor} shrink-0`}>
          {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
        </div>
      </div>

      <Sparkline
        data={data}
        isPositive={isPositive}
        height={40}
        timeframe={timeframe}
        currency={quote.currency}
      />

      <TimeframeSelector active={timeframe} onChange={setTimeframe} />
    </div>
  )
}
