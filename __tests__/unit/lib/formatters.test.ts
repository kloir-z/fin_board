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
  // Use a timestamp well in the middle of the day (UTC noon) so date is stable across most timezones
  const noonUtc = 1699963200 // 2023-11-14T12:00:00Z

  it('formats 1D timeframe as HH:MM time', () => {
    expect(formatChartDate(noonUtc, '1D')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('formats 1W timeframe as YYYY/MM/DD date', () => {
    expect(formatChartDate(noonUtc, '1W')).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })

  it('formats 1M timeframe as YYYY/MM/DD date', () => {
    expect(formatChartDate(noonUtc, '1M')).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })

  it('formats 3M timeframe as YYYY/MM/DD date', () => {
    expect(formatChartDate(noonUtc, '3M')).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })

  it('formats 1Y timeframe as YYYY/MM/DD date', () => {
    expect(formatChartDate(noonUtc, '1Y')).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })

  it('date format has correct zero-padded month and day', () => {
    // 2023-01-05T12:00:00Z — month=1, day=5, should pad to 01 and 05
    const timestamp = 1672920000 // 2023-01-05T12:00:00Z
    const result = formatChartDate(timestamp, '1M')
    expect(result).toMatch(/^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/)
  })
})
