'use client'

import type { Timeframe } from '@/lib/types'

interface TimeframeSelectorProps {
  active: Timeframe
  onChange: (tf: Timeframe) => void
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '2Y', '3Y', '5Y']

export function TimeframeSelector({ active, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-0.5" role="group" aria-label="Select timeframe">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          aria-pressed={active === tf}
          className={`
            flex-1 rounded px-0 py-0.5 text-[9px] font-medium transition-colors
            min-h-[20px] touch-manipulation
            ${
              active === tf
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            }
          `}
        >
          {tf}
        </button>
      ))}
    </div>
  )
}
