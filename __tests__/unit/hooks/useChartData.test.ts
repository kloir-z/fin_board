import { renderHook, waitFor } from '@testing-library/react'
import { useChartData } from '@/hooks/useChartData'

const mockFetch = jest.fn()
global.fetch = mockFetch

const samplePoints = [
  { time: 1700000000, value: 150.0 },
  { time: 1700086400, value: 152.5 },
]

beforeEach(() => jest.clearAllMocks())

describe('useChartData', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts with empty data and isLoading=false', () => {
    const { result } = renderHook(() => useChartData('AAPL', '1D'))
    expect(result.current.data).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches chart data after debounce delay', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: samplePoints }),
    })

    const { result } = renderHook(() => useChartData('AAPL', '1D'))

    jest.advanceTimersByTime(300)

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chart?symbol=AAPL&timeframe=1D')
    )
  })

  it('returns empty array on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useChartData('AAPL', '1D'))
    jest.advanceTimersByTime(300)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([])
  })

  it('re-fetches when timeframe changes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: samplePoints }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [samplePoints[0]] }),
      })

    const { result, rerender } = renderHook(
      ({ tf }: { tf: '1D' | '1M' }) => useChartData('AAPL', tf),
      { initialProps: { tf: '1D' as const } }
    )

    jest.advanceTimersByTime(300)
    await waitFor(() => expect(result.current.data).toHaveLength(2))

    rerender({ tf: '1M' })
    jest.advanceTimersByTime(300)
    await waitFor(() => expect(result.current.data).toHaveLength(1))

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('encodes special characters in symbol', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })

    renderHook(() => useChartData('7203.T', '1W'))
    jest.advanceTimersByTime(300)

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('symbol=7203.T')
    )
  })
})
