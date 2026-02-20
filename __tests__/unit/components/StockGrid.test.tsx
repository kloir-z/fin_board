import { render, screen } from '@testing-library/react'
import { StockGrid } from '@/components/StockGrid'
import type { Quote } from '@/lib/types'

jest.mock('@/hooks/useChartData', () => ({
  useChartData: () => ({ data: [], isLoading: false }),
}))

jest.mock('@/components/Sparkline', () => ({
  Sparkline: () => <div data-testid="sparkline" />,
}))

const quotes: Quote[] = [
  {
    symbol: 'AAPL',
    price: 180,
    previousClose: 178,
    change: 2,
    changePercent: 1.12,
    currency: 'USD',
    marketState: 'REGULAR',
    updatedAt: '',
  },
  {
    symbol: '7203.T',
    price: 3200,
    previousClose: 3100,
    change: 100,
    changePercent: 3.22,
    currency: 'JPY',
    marketState: 'CLOSED',
    updatedAt: '',
  },
]

describe('StockGrid', () => {
  it('renders empty state when no quotes provided', () => {
    render(<StockGrid quotes={[]} />)
    expect(screen.getByText('No stocks in watchlist')).toBeInTheDocument()
    expect(screen.getByText('Tap + to add tickers')).toBeInTheDocument()
  })

  it('renders a StockCard for each quote', () => {
    render(<StockGrid quotes={quotes} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('7203.T')).toBeInTheDocument()
  })

  it('renders correct number of cards', () => {
    render(<StockGrid quotes={quotes} />)
    expect(screen.getAllByTestId('sparkline')).toHaveLength(2)
  })
})
