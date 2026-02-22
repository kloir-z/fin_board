import { render, screen, fireEvent } from '@testing-library/react'
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

  it('shows positive change percent in green', () => {
    render(<StockCard quote={positiveQuote} />)
    const changeEl = screen.getByText(/\+1\.40%/)
    expect(changeEl).toHaveClass('text-emerald-400')
  })

  it('shows negative change percent in red', () => {
    render(<StockCard quote={negativeQuote} />)
    const changeEl = screen.getByText(/-3\.13%/)
    expect(changeEl).toHaveClass('text-red-400')
  })

  it('renders sparkline', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
  })

  it('renders timeframe selector', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(screen.getByText('1D')).toBeInTheDocument()
    expect(screen.getByText('1Y')).toBeInTheDocument()
  })

  it('changes timeframe when selector is clicked', () => {
    render(<StockCard quote={positiveQuote} />)
    fireEvent.click(screen.getByText('1M'))
    expect(screen.getByText('1M').closest('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('passes timeframe prop to Sparkline', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(MockSparkline).toHaveBeenCalledWith(
      expect.objectContaining({ timeframe: '1D' })
    )
  })

  it('passes currency prop to Sparkline', () => {
    render(<StockCard quote={positiveQuote} />)
    expect(MockSparkline).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' })
    )
  })

  it('passes updated timeframe to Sparkline after change', () => {
    render(<StockCard quote={positiveQuote} />)
    fireEvent.click(screen.getByText('1W'))
    expect(MockSparkline).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeframe: '1W' })
    )
  })

  it('passes JPY currency to Sparkline for JPY quote', () => {
    render(<StockCard quote={negativeQuote} />)
    expect(MockSparkline).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'JPY' })
    )
  })
})
