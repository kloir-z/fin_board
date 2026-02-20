import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Yahoo Finance calls to avoid real network requests
    await page.route('**/api/quotes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              symbol: 'AAPL',
              price: 180.5,
              previousClose: 178.0,
              change: 2.5,
              changePercent: 1.4,
              currency: 'USD',
              marketState: 'REGULAR',
              updatedAt: new Date().toISOString(),
            },
            {
              symbol: '7203.T',
              price: 3200,
              previousClose: 3100,
              change: 100,
              changePercent: 3.22,
              currency: 'JPY',
              marketState: 'CLOSED',
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      })
    })

    await page.route('**/api/chart**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { time: 1700000000, value: 175.0 },
            { time: 1700086400, value: 180.5 },
          ],
        }),
      })
    })
  })

  test('shows dashboard with stock cards', async ({ page }) => {
    await page.goto('/')
    // Wait for quotes to load
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('7203.T')).toBeVisible()
  })

  test('shows price and change for US stock', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('$180.50')).toBeVisible()
  })

  test('shows price and change for JP stock', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('7203.T')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('¥3,200')).toBeVisible()
  })

  test('shows refresh indicator', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Updated:/)).toBeVisible({ timeout: 10000 })
  })

  test('has floating + button to open ticker manager', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('Manage watchlist')).toBeVisible()
  })

  test('timeframe selector buttons are visible on stock cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 10000 })
    // Multiple cards may have timeframe buttons
    const oneDButtons = page.getByRole('button', { name: '1D' })
    await expect(oneDButtons.first()).toBeVisible()
  })
})
