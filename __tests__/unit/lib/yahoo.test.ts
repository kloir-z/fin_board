import { fetchQuotes, fetchChart, validateSymbol } from '@/lib/yahoo'

// v3 of yahoo-finance2 exports a class; mock it as a constructor returning mock methods
const mockQuote = jest.fn()
const mockChart = jest.fn()

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    quote: mockQuote,
    chart: mockChart,
  })),
}))

describe('fetchQuotes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns normalized quotes for US stock', async () => {
    mockQuote.mockResolvedValueOnce({
      symbol: 'AAPL',
      regularMarketPrice: 180.5,
      regularMarketPreviousClose: 178.0,
      regularMarketChange: 2.5,
      regularMarketChangePercent: 1.4,
      currency: 'USD',
      marketState: 'REGULAR',
    })

    const results = await fetchQuotes(['AAPL'])
    expect(results).toHaveLength(1)
    expect(results[0].symbol).toBe('AAPL')
    expect(results[0].price).toBe(180.5)
    expect(results[0].currency).toBe('USD')
  })

  it('returns normalized quotes for JP stock', async () => {
    mockQuote.mockResolvedValueOnce({
      symbol: '7203.T',
      regularMarketPrice: 3200,
      regularMarketPreviousClose: 3150,
      regularMarketChange: 50,
      regularMarketChangePercent: 1.587,
      currency: 'JPY',
      marketState: 'CLOSED',
    })

    const results = await fetchQuotes(['7203.T'])
    expect(results[0].symbol).toBe('7203.T')
    expect(results[0].currency).toBe('JPY')
  })

  it('skips failed tickers and returns the rest', async () => {
    mockQuote
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({
        symbol: 'MSFT',
        regularMarketPrice: 400,
        regularMarketPreviousClose: 395,
        regularMarketChange: 5,
        regularMarketChangePercent: 1.27,
        currency: 'USD',
        marketState: 'REGULAR',
      })

    const results = await fetchQuotes(['BAD_TICKER', 'MSFT'])
    expect(results).toHaveLength(1)
    expect(results[0].symbol).toBe('MSFT')
  })

  it('returns empty array when all tickers fail', async () => {
    mockQuote.mockRejectedValue(new Error('Network error'))
    const results = await fetchQuotes(['BAD1', 'BAD2'])
    expect(results).toEqual([])
  })
})

describe('validateSymbol', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns true for a valid symbol with a market price', async () => {
    mockQuote.mockResolvedValueOnce({ symbol: 'AAPL', regularMarketPrice: 180.5 })
    expect(await validateSymbol('AAPL')).toBe(true)
  })

  it('returns false when quote result is null', async () => {
    mockQuote.mockResolvedValueOnce(null)
    expect(await validateSymbol('INVALID')).toBe(false)
  })

  it('returns false when regularMarketPrice is null', async () => {
    mockQuote.mockResolvedValueOnce({ symbol: 'X', regularMarketPrice: null })
    expect(await validateSymbol('X')).toBe(false)
  })

  it('returns false when quote throws an error', async () => {
    mockQuote.mockRejectedValueOnce(new Error('Not found'))
    expect(await validateSymbol('INVALID_XYZ')).toBe(false)
  })

  it('returns true for index symbol ^N225', async () => {
    mockQuote.mockResolvedValueOnce({ symbol: '^N225', regularMarketPrice: 38000 })
    expect(await validateSymbol('^N225')).toBe(true)
  })

  it('returns true for FX symbol USDJPY=X', async () => {
    mockQuote.mockResolvedValueOnce({ symbol: 'USDJPY=X', regularMarketPrice: 150.5 })
    expect(await validateSymbol('USDJPY=X')).toBe(true)
  })
})

describe('fetchChart', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns chart points for 1M timeframe', async () => {
    mockChart.mockResolvedValueOnce({
      quotes: [
        { date: new Date('2024-01-01'), close: 150.0 },
        { date: new Date('2024-01-02'), close: 152.0 },
        { date: new Date('2024-01-03'), close: null }, // null values should be filtered
      ],
    })

    const points = await fetchChart('AAPL', '1M')
    expect(points).toHaveLength(2)
    expect(points[0].value).toBe(150.0)
    expect(typeof points[0].time).toBe('number')
  })

  it('returns empty array when chart fetch fails', async () => {
    mockChart.mockRejectedValueOnce(new Error('API error'))
    const points = await fetchChart('AAPL', '1D')
    expect(points).toEqual([])
  })

  it('filters 1D data to only the most recent trading day', async () => {
    // 複数日の5分足データ（週末対応: 金曜+月曜を想定）
    mockChart.mockResolvedValueOnce({
      quotes: [
        // Friday bars (UTC)
        { date: new Date('2024-01-05T14:30:00Z'), close: 148.0 },
        { date: new Date('2024-01-05T15:00:00Z'), close: 149.0 },
        // Monday bars (UTC) — most recent trading day
        { date: new Date('2024-01-08T14:30:00Z'), close: 150.0 },
        { date: new Date('2024-01-08T15:00:00Z'), close: 151.0 },
      ],
    })

    const points = await fetchChart('AAPL', '1D')
    // 直近取引日(1/8)のみ返すこと
    expect(points).toHaveLength(2)
    expect(points[0].value).toBe(150.0)
    expect(points[1].value).toBe(151.0)
  })

  it('maps timeframes to correct yahoo parameters', async () => {
    mockChart.mockResolvedValue({ quotes: [] })

    await fetchChart('AAPL', '1D')
    expect(mockChart).toHaveBeenCalledWith(
      'AAPL',
      expect.objectContaining({ interval: '5m' })
    )

    await fetchChart('AAPL', '1Y')
    expect(mockChart).toHaveBeenCalledWith(
      'AAPL',
      expect.objectContaining({ interval: '1wk' })
    )
  })
})
