export function StockCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl p-3 flex flex-col gap-2 border border-gray-700 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="h-4 w-16 bg-gray-700 rounded" />
          <div className="h-3 w-8 bg-gray-700 rounded" />
        </div>
        <div className="space-y-1 items-end">
          <div className="h-4 w-20 bg-gray-700 rounded" />
          <div className="h-3 w-24 bg-gray-700 rounded" />
        </div>
      </div>
      <div className="h-14 bg-gray-700 rounded" />
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 h-8 bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  )
}

export function StockGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <StockCardSkeleton key={i} />
      ))}
    </div>
  )
}
