import { render, screen } from '@testing-library/react'
import { StockCardSkeleton, StockGridSkeleton } from '@/components/StockCardSkeleton'

describe('StockCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<StockCardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has animate-pulse class for loading animation', () => {
    const { container } = render(<StockCardSkeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('has correct card structure with placeholder elements', () => {
    const { container } = render(<StockCardSkeleton />)
    // Should have multiple placeholder divs
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBeGreaterThan(3)
  })
})

describe('StockGridSkeleton', () => {
  it('renders default count of 10 skeleton cards', () => {
    const { container } = render(<StockGridSkeleton />)
    const cards = container.querySelectorAll('.animate-pulse')
    expect(cards).toHaveLength(10)
  })

  it('renders specified count of skeleton cards', () => {
    const { container } = render(<StockGridSkeleton count={5} />)
    const cards = container.querySelectorAll('.animate-pulse')
    expect(cards).toHaveLength(5)
  })

  it('uses grid layout class', () => {
    const { container } = render(<StockGridSkeleton />)
    expect(container.firstChild).toHaveClass('grid')
  })
})
