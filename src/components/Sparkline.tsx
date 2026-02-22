'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [isVisible, setIsVisible] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, time: 0, value: 0 })

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
      chart.timeScale().fitContent()
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
  }, [data, isPositive, height, isVisible])

  const sparklineStats = isVisible && data.length >= 2 ? (() => {
    const lastValue = data[data.length - 1].value
    const values = data.map((d) => d.value)
    const maxVal = Math.max(...values)
    const minVal = Math.min(...values)
    // % relative to current (last) price — how far were the period high/low from now
    const maxPct = ((maxVal - lastValue) / lastValue) * 100
    const minPct = ((minVal - lastValue) / lastValue) * 100
    const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
    return { maxVal, minVal, maxPct, minPct, fmtPct }
  })() : null

  return (
    <div ref={containerRef} style={{ position: 'relative', height }}>
      {sparklineStats && (
        <>
          <div
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
            className="text-[8px] leading-none opacity-60 text-emerald-400 px-0.5 pt-px"
          >
            {formatPrice(sparklineStats.maxVal, currency)}{' '}
            <span className="opacity-80">{sparklineStats.fmtPct(sparklineStats.maxPct)}</span>
          </div>
          <div
            style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
            className="text-[8px] leading-none opacity-60 text-red-400 px-0.5 pb-px"
          >
            {formatPrice(sparklineStats.minVal, currency)}{' '}
            <span className="opacity-80">{sparklineStats.fmtPct(sparklineStats.minPct)}</span>
          </div>
        </>
      )}
      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: tooltip.x,
            transform: 'translateX(-50%)',
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
