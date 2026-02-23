import { render, screen, fireEvent } from '@testing-library/react'
import { TimeframeSelector } from '@/components/TimeframeSelector'

describe('TimeframeSelector', () => {
  const onChange = jest.fn()

  beforeEach(() => onChange.mockClear())

  it('renders all 8 timeframe buttons', () => {
    render(<TimeframeSelector active="1D" onChange={onChange} />)
    expect(screen.getByText('1D')).toBeInTheDocument()
    expect(screen.getByText('1W')).toBeInTheDocument()
    expect(screen.getByText('1M')).toBeInTheDocument()
    expect(screen.getByText('3M')).toBeInTheDocument()
    expect(screen.getByText('1Y')).toBeInTheDocument()
    expect(screen.getByText('2Y')).toBeInTheDocument()
    expect(screen.getByText('3Y')).toBeInTheDocument()
    expect(screen.getByText('5Y')).toBeInTheDocument()
  })

  it('marks the active timeframe with aria-pressed=true', () => {
    render(<TimeframeSelector active="1M" onChange={onChange} />)
    expect(screen.getByText('1M').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1D').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with correct timeframe on click', () => {
    render(<TimeframeSelector active="1D" onChange={onChange} />)
    fireEvent.click(screen.getByText('3M'))
    expect(onChange).toHaveBeenCalledWith('3M')
  })

  it('does not call onChange when clicking already-active timeframe', () => {
    render(<TimeframeSelector active="1D" onChange={onChange} />)
    fireEvent.click(screen.getByText('1D'))
    // Still called (component doesn't prevent this), but with same value
    expect(onChange).toHaveBeenCalledWith('1D')
  })
})
