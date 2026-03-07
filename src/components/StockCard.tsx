'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import type { Quote, Timeframe } from '@/lib/types'
import { Sparkline } from './Sparkline'
import { useChartData } from '@/hooks/useChartData'
import { formatPrice, getTickerUrl } from '@/lib/formatters'
import { descriptions } from '@/lib/descriptions'

// H/L の ±% に適用する強度カラー（0% = 薄い、200% = 鮮やか）
const HL_INTENSITY_MAX = 200

// USD換算時価総額の log10 固定レンジ（$100M 〜 $5T）
const MARKET_CAP_USD_LOG_MIN = 8
const MARKET_CAP_USD_LOG_MAX = 12.7

function getMarketCapBarHeight(marketCapUsd: number): number {
  const logVal = Math.log10(marketCapUsd)
  return Math.min(100, Math.max(3, ((logVal - MARKET_CAP_USD_LOG_MIN) / (MARKET_CAP_USD_LOG_MAX - MARKET_CAP_USD_LOG_MIN)) * 100))
}

function formatMarketCapUsd(usd: number): string {
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`
  return `$${usd.toFixed(0)}`
}

function getHLPctStyle(pct: number): CSSProperties {
  const t = Math.min(Math.abs(pct) / HL_INTENSITY_MAX, 1)
  const alpha = (0.2 + t * 0.8).toFixed(2)
  const [r, g, b] = pct >= 0 ? [52, 211, 153] : [248, 113, 113]
  return { color: `rgba(${r},${g},${b},${alpha})` }
}

interface StockCardProps {
  quote: Quote
  globalTimeframe?: Timeframe
  onMenuOpen?: (symbol: string, name: string, currency: string, rect: DOMRect) => void
}

export function StockCard({ quote, globalTimeframe, onMenuOpen }: StockCardProps) {
  const timeframe = globalTimeframe ?? '1D'
  const { data } = useChartData(quote.symbol, timeframe)
  const [showDesc, setShowDesc] = useState(false)
  const priceRef = useRef<HTMLDivElement>(null)

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
    <div className="relative overflow-hidden bg-gray-800 rounded-lg p-2 flex flex-col gap-0.5 border border-gray-700">
      <div className="flex items-center justify-between gap-1">
        <a
          href={getTickerUrl(quote.symbol, quote.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-gray-500 shrink-0 relative z-20 hover:text-gray-300 hover:underline"
        >{quote.symbol}</a>
        <div
          ref={priceRef}
          className={`font-semibold text-white text-xs shrink-0 relative z-20 select-none ${onMenuOpen ? 'cursor-pointer touch-manipulation active:opacity-60' : ''}`}
          onClick={onMenuOpen ? () => {
            const rect = priceRef.current?.getBoundingClientRect()
            if (rect) onMenuOpen(quote.symbol, quote.name, quote.currency, rect)
          } : undefined}
        >{formatPrice(quote.price, quote.currency)}</div>
      </div>
      <div
        className={`font-bold text-white text-xs leading-tight truncate min-w-0 relative z-20 select-none ${desc ? 'cursor-pointer active:opacity-70' : ''}`}
        onClick={desc ? () => setShowDesc(true) : undefined}
      >
        {quote.name}
      </div>
      <div className="flex items-center min-h-[14px]">
        {stats && (
          <span className={`text-[10px] ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <span className="text-gray-300">{formatPrice(stats.high, quote.currency)}</span>{' '}
            <span style={getHLPctStyle(stats.highPct)}>{stats.fmtPct(stats.highPct)}</span>
          </span>
          <span>
            <span className="text-gray-300">{formatPrice(stats.low, quote.currency)}</span>{' '}
            <span style={getHLPctStyle(stats.lowPct)}>{stats.fmtPct(stats.lowPct)}</span>
          </span>
        </div>
      ) : (
        <div className="h-[9px]" />
      )}

      {quote.marketCapUsd && (
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gray-700/40">
          <div
            className="absolute bottom-0 w-full bg-emerald-400/50"
            style={{ height: `${getMarketCapBarHeight(quote.marketCapUsd)}%` }}
          />
          {[9, 10, 11, 12].map((exp) => {
            const pct = ((exp - MARKET_CAP_USD_LOG_MIN) / (MARKET_CAP_USD_LOG_MAX - MARKET_CAP_USD_LOG_MIN)) * 100
            return <div key={exp} className="absolute w-full h-px bg-white/20" style={{ bottom: `${pct}%` }} />
          })}
        </div>
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
            <div className="text-sm font-bold text-white mb-1">{quote.name}</div>
            {quote.marketCapUsd && (
              <div className="text-[10px] text-gray-400 mb-3">時価総額 {formatMarketCapUsd(quote.marketCapUsd)}</div>
            )}
            <p className="text-xs text-gray-300 leading-relaxed">{desc}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
