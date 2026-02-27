'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  AreaSeries,
  type UTCTimestamp,
  type MouseEventParams,
} from 'lightweight-charts'
import type { ChartPoint, Timeframe } from '@/lib/types'
import { formatPrice, formatChartDate } from '@/lib/formatters'

// null = fitContent（1D イントラデイはデータ範囲に合わせる）
const TIMEFRAME_RANGE_SECONDS: Record<Timeframe, number | null> = {
  '1D': null,
  '1W': 7 * 86400,
  '1M': 30 * 86400,
  '3M': 90 * 86400,
  '6M': 180 * 86400,
  '1Y': 365 * 86400,
  '2Y': 2 * 365 * 86400,
  '3Y': 3 * 365 * 86400,
  '5Y': 5 * 365 * 86400,
}

// データ配列の中で ts に最も近いタイムスタンプを返す（二分探索）
// timeToCoordinate はデータに存在しない時刻に対して null を返すため、
// カレンダー境界をデータ点にスナップしてから渡す必要がある
function snapToNearestDataTimestamp(ts: number, data: ChartPoint[]): number {
  let lo = 0, hi = data.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (data[mid].time < ts) lo = mid + 1
    else hi = mid
  }
  if (lo === 0) return data[0].time
  if (lo >= data.length) return data[data.length - 1].time
  const before = data[lo - 1].time
  const after = data[lo].time
  return (ts - before) <= (after - ts) ? before : after
}

// タイムフレーム別カレンダー境界（UTC）を返す
// 1D/1W は縦線なしのため空配列
function getCalendarBoundaries(tf: Timeframe, startTs: number, endTs: number): number[] {
  if (tf === '1D' || tf === '1W') return []

  const result: number[] = []
  const s = new Date(startTs * 1000)
  const endMs = endTs * 1000

  if (tf === '1M') {
    // 週次: 月曜日ごと
    const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()))
    while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1)
    while (d.getTime() <= endMs) {
      result.push(d.getTime() / 1000)
      d.setUTCDate(d.getUTCDate() + 7)
    }
  } else if (tf === '3M' || tf === '6M') {
    // 月次: 毎月1日
    const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1))
    while (d.getTime() / 1000 < startTs) d.setUTCMonth(d.getUTCMonth() + 1)
    while (d.getTime() <= endMs) {
      result.push(d.getTime() / 1000)
      d.setUTCMonth(d.getUTCMonth() + 1)
    }
  } else if (tf === '1Y') {
    // 四半期: 1/1, 4/1, 7/1, 10/1
    const d = new Date(Date.UTC(s.getUTCFullYear(), Math.floor(s.getUTCMonth() / 3) * 3, 1))
    while (d.getTime() / 1000 < startTs) d.setUTCMonth(d.getUTCMonth() + 3)
    while (d.getTime() <= endMs) {
      result.push(d.getTime() / 1000)
      d.setUTCMonth(d.getUTCMonth() + 3)
    }
  } else if (tf === '2Y') {
    // 半年: 1/1, 7/1
    const d = new Date(Date.UTC(s.getUTCFullYear(), Math.floor(s.getUTCMonth() / 6) * 6, 1))
    while (d.getTime() / 1000 < startTs) d.setUTCMonth(d.getUTCMonth() + 6)
    while (d.getTime() <= endMs) {
      result.push(d.getTime() / 1000)
      d.setUTCMonth(d.getUTCMonth() + 6)
    }
  } else if (tf === '3Y') {
    // 年次: 毎年1/1
    const d = new Date(Date.UTC(s.getUTCFullYear(), 0, 1))
    while (d.getTime() / 1000 < startTs) d.setUTCFullYear(d.getUTCFullYear() + 1)
    while (d.getTime() <= endMs) {
      result.push(d.getTime() / 1000)
      d.setUTCFullYear(d.getUTCFullYear() + 1)
    }
  } else if (tf === '5Y') {
    // 年次: 毎年1/1
    const d = new Date(Date.UTC(s.getUTCFullYear(), 0, 1))
    while (d.getTime() / 1000 < startTs) d.setUTCFullYear(d.getUTCFullYear() + 1)
    while (d.getTime() <= endMs) {
      result.push(d.getTime() / 1000)
      d.setUTCFullYear(d.getUTCFullYear() + 1)
    }
  }

  return result
}

interface SparklineProps {
  data: ChartPoint[]
  isPositive: boolean
  height?: number
  timeframe: Timeframe
  currency: string
}

interface TooltipState {
  visible: boolean
  x: number
  time: number
  value: number
}

export function Sparkline({ data, isPositive, height = 60, timeframe, currency }: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const gridCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, time: 0, value: 0 })
  const [tooltipLeft, setTooltipLeft] = useState(0)

  useLayoutEffect(() => {
    if (!tooltip.visible || !tooltipRef.current || !containerRef.current) return
    const tooltipWidth = tooltipRef.current.offsetWidth
    const containerWidth = containerRef.current.clientWidth
    const ideal = tooltip.x - tooltipWidth / 2
    setTooltipLeft(Math.max(0, Math.min(ideal, containerWidth - tooltipWidth)))
  }, [tooltip.visible, tooltip.x])

  // Lazy render: only create chart when card is visible in viewport
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isVisible) return

    const color = isPositive ? '#34d399' : '#f87171'

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { visible: false },
        vertLine: {
          visible: true,
          style: LineStyle.Dashed,
          width: 1,
          color: `${color}88`,
          labelVisible: false,
        },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}55`,
      bottomColor: `${color}00`,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    if (data.length > 0) {
      series.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      const rangeSeconds = TIMEFRAME_RANGE_SECONDS[timeframe]
      if (rangeSeconds === null) {
        chart.timeScale().fitContent()
      } else {
        const toTs = Math.floor(Date.now() / 1000) as UTCTimestamp
        const fromTs = (toTs - rangeSeconds) as UTCTimestamp
        chart.timeScale().setVisibleRange({ from: fromTs, to: toTs })
      }
    }

    // カレンダー整列の縦グリッド線を canvas に描画
    // setVisibleRange 後に timeToCoordinate が使えるよう setTimeout で遅延
    const drawGrid = () => {
      const canvas = gridCanvasRef.current
      if (!canvas || data.length === 0) return
      const w = container.clientWidth
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = w
      canvas.height = height
      ctx.clearRect(0, 0, w, height)

      const boundaries = getCalendarBoundaries(timeframe, data[0].time, data[data.length - 1].time)
      if (boundaries.length === 0) return

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      for (const ts of boundaries) {
        // データに存在するタイムスタンプにスナップしてから変換する
        const snapped = snapToNearestDataTimestamp(ts, data)
        const x = chart.timeScale().timeToCoordinate(snapped as UTCTimestamp)
        if (x === null || x < 0 || x > w) continue
        const px = Math.round(x) + 0.5
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, height)
        ctx.stroke()
      }
    }

    // chart の座標系が確定した後（最初のフレーム描画後）にグリッドを描く
    const animId = requestAnimationFrame(drawGrid)

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !param.point) {
        setTooltip((prev) => ({ ...prev, visible: false }))
        return
      }
      const entry = param.seriesData.get(series)
      if (!entry || !('value' in entry)) {
        setTooltip((prev) => ({ ...prev, visible: false }))
        return
      }
      setTooltip({
        visible: true,
        x: param.point.x,
        time: param.time as number,
        value: (entry as { value: number }).value,
      })
    }

    chart.subscribeCrosshairMove(handleCrosshairMove)

    const resizeObserver = new ResizeObserver(() => {
      chart.resize(container.clientWidth, height)
      drawGrid()
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      chart.remove()
    }
  }, [data, isPositive, height, isVisible, timeframe])

  return (
    <div ref={containerRef} style={{ position: 'relative', height }}>
      <canvas
        ref={gridCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 2,
        }}
        width={0}
        height={0}
      />
      {tooltip.visible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: tooltipLeft,
            pointerEvents: 'none',
            zIndex: 30,
            whiteSpace: 'nowrap',
          }}
          className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white shadow-lg"
        >
          <div className="text-gray-400">{formatChartDate(tooltip.time, timeframe)}</div>
          <div className="font-semibold">{formatPrice(tooltip.value, currency)}</div>
        </div>
      )}
    </div>
  )
}
