import { render, screen, fireEvent } from '@testing-library/react'
import { StockCard } from '@/components/StockCard'
import type { Quote } from '@/lib/types'

// Mock hooks to avoid fetch calls
jest.mock('@/hooks/useChartData', () => ({
  useChartData: () => ({ data: [], isLoading: false }),
}))

// Mock Sparkline to avoid lightweight-charts canvas issues in jsdom
jest.mock('@/components/Sparkline', () => ({
  Sparkline: () => <div data-testid="sparkline" />,
}))

const positiveQuote: Quote = {
  symbol: 'AAPL',
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
  price: 3100,
  previousClose: 3200,
  change: -100,
  changePercent: -3.125,
  currency: 'JPY',
  marketState: 'CLOSED',
  updatedAt: new Date().toISOString(),
}

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

  it('shows positive change in green', () => {
    render(<StockCard quote={positiveQuote} />)
    const changeEl = screen.getByText(/\+2\.50/)
    expect(changeEl).toHaveClass('text-emerald-400')
  })

  it('shows negative change in red', () => {
    render(<StockCard quote={negativeQuote} />)
    const changeEl = screen.getByText(/-100/)
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
})
