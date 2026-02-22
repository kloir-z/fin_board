import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { createCacheOrchestrator } from '@/lib/cache'
import type { ApiResponse, ChartPoint, Timeframe } from '@/lib/types'

const querySchema = z.object({
  symbol: z.string().min(1).max(20),
  timeframe: z.enum(['1D', '1W', '1M', '3M', '1Y', '5Y']),
})

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<ChartPoint[]>>> {
  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse({
    symbol: searchParams.get('symbol'),
    timeframe: searchParams.get('timeframe'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid symbol or timeframe' },
      { status: 400 }
    )
  }

  try {
    const db = getDb()
    const orchestrator = createCacheOrchestrator(db)
    const points = await orchestrator.getCachedChart(
      parsed.data.symbol,
      parsed.data.timeframe as Timeframe
    )
    return NextResponse.json({ success: true, data: points })
  } catch (error) {
    console.error('GET /api/chart error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch chart data' }, { status: 500 })
  }
}
