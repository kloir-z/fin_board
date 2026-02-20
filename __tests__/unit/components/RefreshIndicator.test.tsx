import { render, screen, fireEvent } from '@testing-library/react'
import { RefreshIndicator } from '@/components/RefreshIndicator'

describe('RefreshIndicator', () => {
  it('shows -- when lastUpdated is null', () => {
    render(<RefreshIndicator lastUpdated={null} onRefresh={jest.fn()} isLoading={false} />)
    expect(screen.getByText(/Updated:/)).toBeInTheDocument()
    expect(screen.getByText('--:--:--')).toBeInTheDocument()
  })

  it('shows formatted time when lastUpdated is set', () => {
    const date = new Date('2024-01-15T10:30:00')
    render(<RefreshIndicator lastUpdated={date} onRefresh={jest.fn()} isLoading={false} />)
    expect(screen.getByText(/Updated:/)).toBeInTheDocument()
  })

  it('shows "Loading..." when isLoading is true', () => {
    render(<RefreshIndicator lastUpdated={null} onRefresh={jest.fn()} isLoading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows "Refresh" when not loading', () => {
    render(<RefreshIndicator lastUpdated={null} onRefresh={jest.fn()} isLoading={false} />)
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('disables refresh button when loading', () => {
    render(<RefreshIndicator lastUpdated={null} onRefresh={jest.fn()} isLoading={true} />)
    expect(screen.getByText('Loading...')).toBeDisabled()
  })

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = jest.fn()
    render(<RefreshIndicator lastUpdated={null} onRefresh={onRefresh} isLoading={false} />)
    fireEvent.click(screen.getByText('Refresh'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows delay disclaimer text', () => {
    render(<RefreshIndicator lastUpdated={null} onRefresh={jest.fn()} isLoading={false} />)
    expect(screen.getByText(/15-20min delay/)).toBeInTheDocument()
  })
})
