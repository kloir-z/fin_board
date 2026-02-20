import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { TickerManager } from '@/components/TickerManager'

// Capture onDragEnd handler from DndContext for test-driven simulation
const dndState: { onDragEnd?: (event: { active: { id: string }; over: { id: string } | null }) => void } = {}

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: { children: unknown; onDragEnd: (e: { active: { id: string }; over: { id: string } | null }) => void }) => {
    dndState.onDragEnd = onDragEnd
    return children
  },
  PointerSensor: class MockPointerSensor {},
  TouchSensor: class MockTouchSensor {},
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: unknown }) => children,
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: 'verticalListSortingStrategy',
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
  },
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: jest.fn(() => '') } },
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

const sampleTickers = [
  { id: 1, symbol: 'AAPL', name: 'Apple Inc.', market: 'US', createdAt: '' },
  { id: 2, symbol: '7203.T', name: 'Toyota Motor', market: 'JP', createdAt: '' },
]

beforeEach(() => {
  mockFetch.mockResolvedValue({
    json: async () => ({ success: true, data: sampleTickers }),
    ok: true,
  })
})

afterEach(() => jest.clearAllMocks())

describe('TickerManager', () => {
  it('does not render sheet content when closed', () => {
    render(<TickerManager isOpen={false} onClose={jest.fn()} onChange={jest.fn()} />)
    // Sheet exists in DOM but is translated off screen
    expect(screen.queryByText('Manage Watchlist')).toBeInTheDocument()
  })

  it('shows heading when open', async () => {
    render(<TickerManager isOpen={true} onClose={jest.fn()} onChange={jest.fn()} />)
    expect(screen.getByText('Manage Watchlist')).toBeInTheDocument()
  })

  it('fetches and displays tickers when opened', async () => {
    render(<TickerManager isOpen={true} onClose={jest.fn()} onChange={jest.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('7203.T')).toBeInTheDocument()
    })
  })

  it('calls onClose when × button is clicked', () => {
    const onClose = jest.fn()
    render(<TickerManager isOpen={true} onClose={onClose} onChange={jest.fn()} />)
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error when adding empty symbol', async () => {
    render(<TickerManager isOpen={true} onClose={jest.fn()} onChange={jest.fn()} />)
    fireEvent.click(screen.getByText('Add'))
    await waitFor(() => {
      expect(screen.getByText('Symbol is required')).toBeInTheDocument()
    })
  })

  it('calls DELETE API and triggers onChange when removing a ticker', async () => {
    const onChange = jest.fn()
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: sampleTickers }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: null }),
        ok: true,
      })

    render(<TickerManager isOpen={true} onClose={jest.fn()} onChange={onChange} />)

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('Remove AAPL'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tickers',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(onChange).toHaveBeenCalled()
    })
  })

  it('calls PATCH API with new order when drag ends with a position change', async () => {
    const onChange = jest.fn()
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: sampleTickers }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: null }),
        ok: true,
      })

    render(<TickerManager isOpen={true} onClose={jest.fn()} onChange={onChange} />)

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())

    // Simulate drag: move AAPL (index 0) to where 7203.T (index 1) is
    await act(async () => {
      dndState.onDragEnd?.({ active: { id: 'AAPL' }, over: { id: '7203.T' } })
    })

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        ([url, opts]) => url === '/api/tickers' && opts?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      const body = JSON.parse(patchCall![1].body)
      expect(body.order).toEqual(['7203.T', 'AAPL'])
    })
  })

  it('does not call PATCH when drag ends on the same item', async () => {
    render(<TickerManager isOpen={true} onClose={jest.fn()} onChange={jest.fn()} />)

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())

    await act(async () => {
      dndState.onDragEnd?.({ active: { id: 'AAPL' }, over: { id: 'AAPL' } })
    })

    // Only the initial GET should have been called, no PATCH
    expect(
      mockFetch.mock.calls.some(([url, opts]) => url === '/api/tickers' && opts?.method === 'PATCH')
    ).toBe(false)
  })
})
