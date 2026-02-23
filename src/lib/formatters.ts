import type { Timeframe } from '@/lib/types'

export function formatPrice(price: number, currency: string): string {
  if (currency === 'JPY') {
    return `¥${Math.round(price).toLocaleString('ja-JP')}`
  }
  return `$${price.toFixed(2)}`
}

export function formatChartDate(timestamp: number, _timeframe: Timeframe): string {
  const date = new Date(timestamp * 1000)
  const yy = String(date.getFullYear()).slice(-2)
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${yy}/${m}/${d} ${hh}:${mm}`
}
