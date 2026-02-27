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
      watchlists={[defaultWatchlist]}
      activeWatchlistId={1}
      onSelectWatchlist={jest.fn()}
      onAddTicker={jest.fn()}
      onCreateWatchlist={jest.fn().mockResolvedValue(undefined)}
      onRenameWatchlist={jest.fn().mockResolvedValue(undefined)}
      onDeleteWatchlist={jest.fn().mockResolvedValue(undefined)}
      globalTimeframe="1D"
      onGlobalTimeframeChange={jest.fn()}
      sortKey="default"
      onSortChange={jest.fn()}
      isFrozen={false}
      onFreezeChange={jest.fn()}
      {...overrides}
    />
  )
}

describe('RefreshIndicator', () => {
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

  it('shows current timeframe in dropdown button', () => {
    renderIndicator({ globalTimeframe: '1M' })
    expect(screen.getByText('1M')).toBeInTheDocument()
  })

  it('shows sort key label', () => {
    renderIndicator({ sortKey: 'change_desc' })
    expect(screen.getByText('↑%')).toBeInTheDocument()
  })

  it('calls onSortChange when sort option clicked', () => {
    const onSortChange = jest.fn()
    renderIndicator({ onSortChange })
    // ソートドロップダウンを開く（デフォルトラベルは「並順」）
    fireEvent.click(screen.getByText('並順'))
    fireEvent.click(screen.getByText('↑%'))
    expect(onSortChange).toHaveBeenCalledWith('change_desc')
  })

  it('shows 🔓 when isFrozen is false', () => {
    renderIndicator({ isFrozen: false })
    expect(screen.getByLabelText('並び順を固定')).toBeInTheDocument()
  })

  it('shows 🔒 when isFrozen is true', () => {
    renderIndicator({ isFrozen: true })
    expect(screen.getByLabelText('固定解除')).toBeInTheDocument()
  })

  it('calls onFreezeChange(true) when freeze button clicked while not frozen', () => {
    const onFreezeChange = jest.fn()
    renderIndicator({ isFrozen: false, onFreezeChange })
    fireEvent.click(screen.getByLabelText('並び順を固定'))
    expect(onFreezeChange).toHaveBeenCalledWith(true)
  })

  it('calls onFreezeChange(false) when freeze button clicked while frozen', () => {
    const onFreezeChange = jest.fn()
    renderIndicator({ isFrozen: true, onFreezeChange })
    fireEvent.click(screen.getByLabelText('固定解除'))
    expect(onFreezeChange).toHaveBeenCalledWith(false)
  })
})
