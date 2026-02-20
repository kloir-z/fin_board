import { renderHook, act, waitFor } from '@testing-library/react'
import { useQuotes } from '@/hooks/useQuotes'

const mockFetch = jest.fn()
global.fetch = mockFetch

const sampleQuotes = [
  {
    symbol: 'AAPL',
    price: 180,
    previousClose: 178,
    change: 2,
    changePercent: 1.12,
    currency: 'USD',
    marketState: 'REGULAR',
    updatedAt: new Date().toISOString(),
  },
]

beforeEach(() => jest.clearAllMocks())

describe('useQuotes', () => {
  it('starts with loading=true and empty quotes', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useQuotes())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.quotes).toEqual([])
  })

  it('fetches quotes on mount and sets them', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: sampleQuotes }),
    })

    const { result } = renderHook(() => useQuotes())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.quotes).toHaveLength(1)
    expect(result.current.quotes[0].symbol).toBe('AAPL')
  })

  it('sets lastUpdated after successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: sampleQuotes }),
    })

    const { result } = renderHook(() => useQuotes())
    await waitFor(() => expect(result.current.lastUpdated).not.toBeNull())
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
  })

  it('sets error on HTTP failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false }),
    })

    const { result } = renderHook(() => useQuotes())
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toContain('500')
  })

  it('sets error when API returns success=false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'Something broke' }),
    })

    const { result } = renderHook(() => useQuotes())
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe('Something broke')
  })

  it('refresh() re-fetches quotes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: sampleQuotes }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [...sampleQuotes, { ...sampleQuotes[0], symbol: 'MSFT' }] }),
      })

    const { result } = renderHook(() => useQuotes())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => { result.current.refresh() })
    await waitFor(() => expect(result.current.quotes).toHaveLength(2))
  })

  it('sets error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useQuotes())
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe('Network error')
  })
})
