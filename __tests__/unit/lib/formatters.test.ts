import { formatPrice, formatChartDate } from '@/lib/formatters'

describe('formatPrice', () => {
  it('formats USD price with $ prefix and 2 decimals', () => {
    expect(formatPrice(180.5, 'USD')).toBe('$180.50')
  })

  it('formats USD price with 2 decimals even when whole number', () => {
    expect(formatPrice(100, 'USD')).toBe('$100.00')
  })

  it('formats JPY price with ¥ prefix and no decimals', () => {
    expect(formatPrice(3100, 'JPY')).toBe('¥3,100')
  })

  it('rounds JPY price to nearest integer', () => {
    expect(formatPrice(3100.7, 'JPY')).toBe('¥3,101')
  })

  it('formats non-JPY currencies as USD style', () => {
    expect(formatPrice(50.123, 'EUR')).toBe('$50.12')
  })
})

describe('formatChartDate', () => {
  const dateTimePattern = /^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/

  it('formats all timeframes as YY/MM/DD HH:MM', () => {
    const timestamp = 1699963200 // 2023-11-14T12:00:00Z
    for (const tf of ['1D', '1W', '1M', '3M', '1Y', '5Y'] as const) {
      expect(formatChartDate(timestamp, tf)).toMatch(dateTimePattern)
    }
  })

  it('zero-pads month, day, hours and minutes', () => {
    // 2023-01-05T04:05:00Z — month=1, day=5, hour=4, min=5 (local may vary but pattern holds)
    const timestamp = 1672891500 // 2023-01-05T04:05:00Z
    const result = formatChartDate(timestamp, '1D')
    expect(result).toMatch(dateTimePattern)
  })
})
