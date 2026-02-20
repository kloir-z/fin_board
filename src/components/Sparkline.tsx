'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, AreaSeries, type UTCTimestamp } from 'lightweight-charts'
import type { ChartPoint } from '@/lib/types'

interface SparklineProps {
  data: ChartPoint[]
  isPositive: boolean
  height?: number
}

export function Sparkline({ data, isPositive, height = 60 }: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

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
      crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
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

    const resizeObserver = new ResizeObserver(() => {
      chart.resize(container.clientWidth, height)
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [data, isPositive, height, isVisible])

  return <div ref={containerRef} style={{ height }} />
}
