import { render, screen } from '@testing-library/react'
import { StockCard } from '@/components/StockCard'
import type { Quote } from '@/lib/types'

// Mock hooks to avoid fetch calls
jest.mock('@/hooks/useChartData', () => ({
  useChartData: () => ({ data: [], isLoading: false }),
}))

// Mock Sparkline as a spy to verify props passed to it
const MockSparkline = jest.fn().mockImplementation(() => <div data-testid="sparkline" />)
jest.mock('@/components/Sparkline', () => ({
  Sparkline: (props: Record<string, unknown>) => MockSparkline(props),
}))

const positiveQuote: Quote = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 180.5,
  previousClose: 178.0,
  change: 2.5,
  changePercent: 1.4,
  currency: 'USD',
  marketState: 'REGULAR',
  updatedAt: new Date().toISOString(),
}

const negativeQuote: Quote = {
  symbol: '7203.T',
  name: 'Toyota Motor',
  price: 3100,
  previousClose: 3200,
  change: -100,
  changePercent: -3.125,
  currency: 'JPY',
  marketState: 'CLOSED',
  updatedAt: new Date().toISOString(),
}

beforeEach(() => {
  MockSparkline.mockClear()
})

describe('StockCard', () => {
  it('renders ticker symbol', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('renders USD price with $ prefix and 2 decimals', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(screen.getByText('$180.50')).toBeInTheDocument()
  })

  it('renders JPY price with ¥ prefix and no decimals', () => {
    render(<StockCard quote={negativeQuote} />)
    expect(screen.getByText('¥3,100')).toBeInTheDocument()
  })

  it('renders sparkline', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
  })

  it('does not render timeframe selector buttons', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(screen.queryByText('1D')).not.toBeInTheDocument()
    expect(screen.queryByText('1W')).not.toBeInTheDocument()
    expect(screen.queryByText('1Y')).not.toBeInTheDocument()
  })

  it('passes default timeframe 1D to Sparkline', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(MockSparkline).toHaveBeenCalledWith(
      expect.objectContaining({ timeframe: '1D' })
    )
  })

  it('passes globalTimeframe prop to Sparkline', () => {
    render(<StockCard quote={positiveQuote} globalTimeframe="1M" />)
    expect(MockSparkline).toHaveBeenCalledWith(
      expect.objectContaining({ timeframe: '1M' })
    )
  })

  it('passes currency prop to Sparkline', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(MockSparkline).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' })
    )
  })

  it('passes JPY currency to Sparkline for JPY quote', () => {
    render(<StockCard quote={negativeQuote} />)
    expect(MockSparkline).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'JPY' })
    )
  })
})
