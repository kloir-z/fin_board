import { render, screen, fireEvent } from '@testing-library/react'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import type { Watchlist } from '@/lib/types'

const defaultWatchlist: Watchlist = {
  id: 1,
  name: 'Default',
  position: 1,
  createdAt: new Date().toISOString(),
}

function renderIndicator(overrides: Partial<React.ComponentProps<typeof RefreshIndicator>> = {}) {
  return render(
    <RefreshIndicator
      lastUpdated={null}
      onRefresh={jest.fn()}
      isLoading={false}
      watchlists={[defaultWatchlist]}
      activeWatchlistId={1}
      onSelectWatchlist={jest.fn()}
      onAddTicker={jest.fn()}
      onCreateWatchlist={jest.fn().mockResolvedValue(undefined)}
      onRenameWatchlist={jest.fn().mockResolvedValue(undefined)}
      onDeleteWatchlist={jest.fn().mockResolvedValue(undefined)}
      {...overrides}
    />
  )
}

describe('RefreshIndicator', () => {
  it('shows -- when lastUpdated is null', () => {
    renderIndicator()
    expect(screen.getByText('--:--:--')).toBeInTheDocument()
  })

  it('shows formatted time when lastUpdated is set', () => {
    renderIndicator({ lastUpdated: new Date('2024-01-15T10:30:00') })
    expect(screen.getByText(/10:30/)).toBeInTheDocument()
  })

  it('shows spinner icon when isLoading is true', () => {
    renderIndicator({ isLoading: true })
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('shows refresh icon when not loading', () => {
    renderIndicator()
    expect(screen.getByText('↺')).toBeInTheDocument()
  })

  it('disables refresh button when loading', () => {
    renderIndicator({ isLoading: true })
    expect(screen.getByText('...')).toBeDisabled()
  })

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = jest.fn()
    renderIndicator({ onRefresh })
    fireEvent.click(screen.getByText('↺'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows delay disclaimer text', () => {
    renderIndicator()
    expect(screen.getByText(/15-20m/)).toBeInTheDocument()
  })

  it('shows active watchlist name', () => {
    renderIndicator()
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('calls onAddTicker when + button clicked', () => {
    const onAddTicker = jest.fn()
    renderIndicator({ onAddTicker })
    fireEvent.click(screen.getByLabelText('Manage watchlist'))
    expect(onAddTicker).toHaveBeenCalledTimes(1)
  })

  it('shows watchlist dropdown when name is clicked', () => {
    renderIndicator()
    fireEvent.click(screen.getByText(/Default/))
    expect(screen.getByText('＋ 新規作成')).toBeInTheDocument()
  })

  it('shows checkmark next to active watchlist in dropdown', () => {
    const watchlists: Watchlist[] = [
      { id: 1, name: 'Default', position: 1, createdAt: '' },
      { id: 2, name: 'JP Stocks', position: 2, createdAt: '' },
    ]
    renderIndicator({ watchlists, activeWatchlistId: 1 })
    fireEvent.click(screen.getAllByText('Default')[0])
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
