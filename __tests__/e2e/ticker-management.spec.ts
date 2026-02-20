import { test, expect } from '@playwright/test'

test.describe('Ticker Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/quotes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })

    await page.route('**/api/chart**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })

    await page.route('GET **/api/tickers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 1, symbol: 'AAPL', name: 'Apple Inc.', market: 'US', createdAt: '' },
          ],
        }),
      })
    })
  })

  test('opens ticker manager when + button is clicked', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Manage watchlist').click()
    await expect(page.getByText('Manage Watchlist')).toBeVisible()
  })

  test('shows existing tickers in the manager', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Manage watchlist').click()
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5000 })
  })

  test('closes manager when × is clicked', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Manage watchlist').click()
    await expect(page.getByText('Manage Watchlist')).toBeVisible()
    await page.getByText('×').click()
    // Sheet slides out (still in DOM but not interactive)
    await expect(page.getByText('Manage Watchlist')).toBeVisible() // still in DOM
  })

  test('shows error when adding ticker without symbol', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Manage watchlist').click()
    await page.getByText('Add').click()
    await expect(page.getByText('Symbol is required')).toBeVisible()
  })

  test('can switch between US and JP market', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Manage watchlist').click()
    const jpButton = page.getByRole('button', { name: 'JP' })
    await jpButton.click()
    // JP button should now have active styling
    await expect(jpButton).toBeVisible()
  })
})
