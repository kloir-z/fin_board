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
  '1Y': 365 * 86400,
  '5Y': 5 * 365 * 86400,
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
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      chart.remove()
    }
  }, [data, isPositive, height, isVisible, timeframe])

  const sparklineStats = isVisible && data.length >= 2 ? (() => {
    const lastValue = data[data.length - 1].value
    const values = data.map((d) => d.value)
    const maxVal = Math.max(...values)
    const minVal = Math.min(...values)
    // % relative to the high/low itself — how far current is from the period high/low
    const maxPct = ((lastValue - maxVal) / maxVal) * 100  // negative: current is below high
    const minPct = ((lastValue - minVal) / minVal) * 100  // positive: current is above low
    const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
    return { maxVal, minVal, maxPct, minPct, fmtPct }
  })() : null

  return (
    <div ref={containerRef} style={{ position: 'relative', height }}>
      {sparklineStats && (
        <>
          <div
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
            className="text-[9px] leading-none text-emerald-300 bg-gray-950/75 rounded px-1 pt-px"
          >
            {formatPrice(sparklineStats.maxVal, currency)}{' '}
            <span>{sparklineStats.fmtPct(sparklineStats.maxPct)}</span>
          </div>
          <div
            style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
            className="text-[9px] leading-none text-red-300 bg-gray-950/75 rounded px-1 pb-px"
          >
            {formatPrice(sparklineStats.minVal, currency)}{' '}
            <span>{sparklineStats.fmtPct(sparklineStats.minPct)}</span>
          </div>
        </>
      )}
      {tooltip.visible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: tooltipLeft,
            pointerEvents: 'none',
            zIndex: 10,
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
