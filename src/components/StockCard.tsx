'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import type { Quote, Timeframe } from '@/lib/types'
import { Sparkline } from './Sparkline'
import { useChartData } from '@/hooks/useChartData'
import { formatPrice, getTickerUrl } from '@/lib/formatters'
import { descriptions } from '@/lib/descriptions'

// H/L の ±% に適用する強度カラー（0% = 薄い、200% = 鮮やか）
const HL_INTENSITY_MAX = 200

function getHLPctStyle(pct: number): CSSProperties {
  const t = Math.min(Math.abs(pct) / HL_INTENSITY_MAX, 1)
  const alpha = (0.2 + t * 0.8).toFixed(2)
  const [r, g, b] = pct >= 0 ? [52, 211, 153] : [248, 113, 113]
  return { color: `rgba(${r},${g},${b},${alpha})` }
}

interface StockCardProps {
  quote: Quote
  globalTimeframe?: Timeframe
}

export function StockCard({ quote, globalTimeframe }: StockCardProps) {
  const timeframe = globalTimeframe ?? '1D'
  const { data } = useChartData(quote.symbol, timeframe)
  const [showDesc, setShowDesc] = useState(false)

  const desc = descriptions[quote.symbol]

  const stats = data.length >= 2 ? (() => {
    const first = data[0].value
    const last = data[data.length - 1].value
    const vals = data.map((d) => d.value)
    const high = Math.max(...vals)
    const low = Math.min(...vals)
    const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
    const periodPct = ((last - first) / first) * 100
    return { high, low, highPct: ((last - high) / high) * 100, lowPct: ((last - low) / low) * 100, periodPct, fmtPct }
  })() : null

  // 期間変化率の符号をトレンド判定に使う（表示している数値と常に一致する）
  // データ未取得の間は前日比でフォールバック
  const isUp = stats !== null ? stats.periodPct >= 0 : quote.change >= 0

  return (
    <div className="bg-gray-800 rounded-lg p-2 flex flex-col gap-1 border border-gray-700">
      <div className="flex items-center justify-between gap-1">
        <a
          href={getTickerUrl(quote.symbol, quote.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-gray-500 shrink-0 relative z-20 hover:text-gray-300 hover:underline"
        >{quote.symbol}</a>
        <div className="font-semibold text-white text-xs shrink-0">{formatPrice(quote.price, quote.currency)}</div>
      </div>
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div
          className={`font-bold text-white text-xs leading-tight truncate min-w-0 flex-1 relative z-20 select-none ${desc ? 'cursor-pointer active:opacity-70' : ''}`}
          onClick={desc ? () => setShowDesc(true) : undefined}
        >
          {quote.name}
        </div>
        {stats && (
          <span className={`text-[10px] shrink-0 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.fmtPct(stats.periodPct)}
          </span>
        )}
      </div>

      <Sparkline
        data={data}
        isPositive={isUp}
        height={48}
        timeframe={timeframe}
        currency={quote.currency}
      />

      {stats ? (
        <div className="flex items-center justify-between text-[9px] leading-none">
          <span>
            <span className="text-gray-500">H</span>{' '}
            <span className="text-gray-300">{formatPrice(stats.high, quote.currency)}</span>{' '}
            <span style={getHLPctStyle(stats.highPct)}>{stats.fmtPct(stats.highPct)}</span>
          </span>
          <span>
            <span className="text-gray-500">L</span>{' '}
            <span className="text-gray-300">{formatPrice(stats.low, quote.currency)}</span>{' '}
            <span style={getHLPctStyle(stats.lowPct)}>{stats.fmtPct(stats.lowPct)}</span>
          </span>
        </div>
      ) : (
        <div className="h-[9px]" />
      )}

      {showDesc && desc && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50"
          onClick={() => setShowDesc(false)}
        >
          <div
            className="bg-gray-900 border border-gray-600 rounded-2xl p-4 max-w-[300px] w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] text-gray-500 mb-0.5">{quote.symbol}</div>
            <div className="text-sm font-bold text-white mb-3">{quote.name}</div>
            <p className="text-xs text-gray-300 leading-relaxed">{desc}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
