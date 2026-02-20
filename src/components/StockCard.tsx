'use client'

import { useState } from 'react'
import type { Quote, Timeframe } from '@/lib/types'
import { TimeframeSelector } from './TimeframeSelector'
import { Sparkline } from './Sparkline'
import { useChartData } from '@/hooks/useChartData'

interface StockCardProps {
  quote: Quote
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'JPY') {
    return `¥${Math.round(price).toLocaleString('ja-JP')}`
  }
  return `$${price.toFixed(2)}`
}

function formatChange(change: number, changePercent: number, currency: string): string {
  const sign = change >= 0 ? '+' : ''
  if (currency === 'JPY') {
    return `${sign}${Math.round(change)} (${sign}${changePercent.toFixed(2)}%)`
  }
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
}

export function StockCard({ quote }: StockCardProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const { data } = useChartData(quote.symbol, timeframe)

  const isPositive = quote.change >= 0
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="bg-gray-800 rounded-xl p-3 flex flex-col gap-2 border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 mr-2">
          <div className="font-bold text-white text-sm leading-tight truncate">{quote.name}</div>
          <div className="text-xs text-gray-500">{quote.symbol}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-white text-sm">
            {formatPrice(quote.price, quote.currency)}
          </div>
          <div className={`text-xs ${changeColor}`}>
            {formatChange(quote.change, quote.changePercent, quote.currency)}
          </div>
        </div>
      </div>

      <Sparkline data={data} isPositive={isPositive} height={56} />

      <TimeframeSelector active={timeframe} onChange={setTimeframe} />
    </div>
  )
}
