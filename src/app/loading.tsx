import { StockGridSkeleton } from '@/components/StockCardSkeleton'

export default function LoadingPage() {
  return (
    <main className="min-h-screen bg-gray-950">
      <div className="h-10 bg-gray-900 border-b border-gray-700" />
      <StockGridSkeleton count={10} />
    </main>
  )
}
