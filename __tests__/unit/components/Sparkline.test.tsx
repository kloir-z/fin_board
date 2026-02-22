import { render, act } from '@testing-library/react'
import { Sparkline } from '@/components/Sparkline'
import type { ChartPoint } from '@/lib/types'

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn()
const mockObserve = jest.fn()
const mockDisconnect = jest.fn()

beforeEach(() => {
  mockIntersectionObserver.mockImplementation((callback) => {
    // Immediately trigger with isIntersecting=true to exercise chart creation
    callback([{ isIntersecting: true }])
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
    }
  })
  global.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver

  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    unobserve: jest.fn(),
  }))
})

afterEach(() => jest.clearAllMocks())

const sampleData: ChartPoint[] = [
  { time: 1700000000, value: 150.0 },
  { time: 1700086400, value: 152.5 },
]

describe('Sparkline', () => {
  it('renders a container div', () => {
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with default height of 60', () => {
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.height).toBe('60px')
  })

  it('renders with custom height', () => {
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} height={80} timeframe="1D" currency="USD" />
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.height).toBe('80px')
  })

  it('renders with empty data without crashing', () => {
    expect(() => {
      render(<Sparkline data={[]} isPositive={true} timeframe="1D" currency="USD" />)
    }).not.toThrow()
  })

  it('renders for negative (red) chart without crashing', () => {
    expect(() => {
      render(<Sparkline data={sampleData} isPositive={false} timeframe="1D" currency="USD" />)
    }).not.toThrow()
  })

  it('calls createChart when visible', () => {
    const { createChart } = require('lightweight-charts')
    render(<Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />)
    expect(createChart).toHaveBeenCalled()
  })

  it('calls setData on the series with chart points', () => {
    const { createChart } = require('lightweight-charts')
    const mockSeries = createChart().addSeries()
    render(<Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />)
    expect(mockSeries.setData).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ value: 150.0 }),
        expect.objectContaining({ value: 152.5 }),
      ])
    )
  })

  it('cleans up chart on unmount', () => {
    const { createChart } = require('lightweight-charts')
    const mockChart = createChart()
    const { unmount } = render(
      <Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />
    )
    unmount()
    expect(mockChart.remove).toHaveBeenCalled()
  })

  it('subscribes to crosshair move events', () => {
    const { createChart } = require('lightweight-charts')
    render(<Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />)
    const mockChart = createChart()
    expect(mockChart.subscribeCrosshairMove).toHaveBeenCalled()
  })

  it('unsubscribes from crosshair move on unmount', () => {
    const { createChart } = require('lightweight-charts')
    const mockChart = createChart()
    const { unmount } = render(
      <Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />
    )
    unmount()
    expect(mockChart.unsubscribeCrosshairMove).toHaveBeenCalled()
  })

  it('shows tooltip when crosshair moves to a valid data point', () => {
    const { createChart } = require('lightweight-charts')
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />
    )
    const mockChart = createChart()
    const mockSeries = mockChart.addSeries()

    const handler = mockChart.subscribeCrosshairMove.mock.calls[0][0]

    act(() => {
      handler({
        time: 1700000000,
        point: { x: 50, y: 30 },
        seriesData: new Map([[mockSeries, { value: 150.0 }]]),
      })
    })

    expect(container.querySelector('.bg-gray-900')).toBeInTheDocument()
  })

  it('hides tooltip when crosshair moves to empty area', () => {
    const { createChart } = require('lightweight-charts')
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />
    )
    const mockChart = createChart()
    const mockSeries = mockChart.addSeries()
    const handler = mockChart.subscribeCrosshairMove.mock.calls[0][0]

    // Move to data point: show tooltip
    act(() => {
      handler({
        time: 1700000000,
        point: { x: 50, y: 30 },
        seriesData: new Map([[mockSeries, { value: 150.0 }]]),
      })
    })
    expect(container.querySelector('.bg-gray-900')).toBeInTheDocument()

    // Move to empty area: hide tooltip
    act(() => {
      handler({ time: undefined, point: undefined, seriesData: new Map() })
    })
    expect(container.querySelector('.bg-gray-900')).not.toBeInTheDocument()
  })

  it('updates tooltip position as crosshair moves', () => {
    const { createChart } = require('lightweight-charts')
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} timeframe="1D" currency="USD" />
    )
    const mockChart = createChart()
    const mockSeries = mockChart.addSeries()
    const handler = mockChart.subscribeCrosshairMove.mock.calls[0][0]

    act(() => {
      handler({
        time: 1700000000,
        point: { x: 50, y: 30 },
        seriesData: new Map([[mockSeries, { value: 150.0 }]]),
      })
    })
    const tooltip1 = container.querySelector('.bg-gray-900') as HTMLElement
    expect(tooltip1.style.left).toBe('50px')

    act(() => {
      handler({
        time: 1700086400,
        point: { x: 120, y: 30 },
        seriesData: new Map([[mockSeries, { value: 152.5 }]]),
      })
    })
    const tooltip2 = container.querySelector('.bg-gray-900') as HTMLElement
    expect(tooltip2.style.left).toBe('120px')
  })
})
