export interface Watchlist {
  id: number
  name: string
  position: number | null
  createdAt: string
}

export type Market = 'US' | 'JP' | 'MY' | 'TH' | 'VN' | 'KR'

export interface Ticker {
  id: number
  watchlistId: number
  symbol: string
  name: string
  market: Market
  createdAt: string
}

export interface Quote {
  symbol: string
  name: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  marketState: string
  updatedAt: string
}

export interface ChartPoint {
  time: number
  value: number
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '2Y' | '3Y' | '5Y'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
