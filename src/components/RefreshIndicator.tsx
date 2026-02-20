'use client'

interface RefreshIndicatorProps {
  lastUpdated: Date | null
  onRefresh: () => void
  isLoading: boolean
}

export function RefreshIndicator({ lastUpdated, onRefresh, isLoading }: RefreshIndicatorProps) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--'

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700 sticky top-0 z-10">
      <span className="text-xs text-gray-500">
        Updated: <span className="text-gray-400">{timeStr}</span>
        <span className="ml-2 text-gray-600 text-[10px]">(15-20min delay)</span>
      </span>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 touch-manipulation px-2 py-1"
      >
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  )
}
