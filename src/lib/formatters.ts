import type { Timeframe } from '@/lib/types'

export function formatPrice(price: number, currency: string): string {
  if (currency === 'JPY') {
    return `¥${Math.round(price).toLocaleString('ja-JP')}`
  }
  return `$${price.toFixed(2)}`
}

export function formatChartDate(timestamp: number, timeframe: Timeframe): string {
  const date = new Date(timestamp * 1000)
  if (timeframe === '1D') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}
