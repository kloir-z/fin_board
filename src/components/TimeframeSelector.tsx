'use client'

import type { Timeframe } from '@/lib/types'

interface TimeframeSelectorProps {
  active: Timeframe
  onChange: (tf: Timeframe) => void
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

export function TimeframeSelector({ active, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Select timeframe">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          aria-pressed={active === tf}
          className={`
            flex-1 rounded px-1 py-1 text-xs font-medium transition-colors
            min-h-[32px] touch-manipulation
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
