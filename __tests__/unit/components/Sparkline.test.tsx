import { render } from '@testing-library/react'
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
      <Sparkline data={sampleData} isPositive={true} />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with default height of 60', () => {
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} />
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.height).toBe('60px')
  })

  it('renders with custom height', () => {
    const { container } = render(
      <Sparkline data={sampleData} isPositive={true} height={80} />
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.height).toBe('80px')
  })

  it('renders with empty data without crashing', () => {
    expect(() => {
      render(<Sparkline data={[]} isPositive={true} />)
    }).not.toThrow()
  })

  it('renders for negative (red) chart without crashing', () => {
    expect(() => {
      render(<Sparkline data={sampleData} isPositive={false} />)
    }).not.toThrow()
  })

  it('calls createChart when visible', () => {
    const { createChart } = require('lightweight-charts')
    render(<Sparkline data={sampleData} isPositive={true} />)
    expect(createChart).toHaveBeenCalled()
  })

  it('calls setData on the series with chart points', () => {
    const { createChart } = require('lightweight-charts')
    const mockSeries = createChart().addSeries()
    render(<Sparkline data={sampleData} isPositive={true} />)
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
    const { unmount } = render(<Sparkline data={sampleData} isPositive={true} />)
    unmount()
    expect(mockChart.remove).toHaveBeenCalled()
  })
})
