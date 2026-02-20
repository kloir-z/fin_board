# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server (port 3000)
npm run build        # Production build (Next.js standalone)
npm run lint         # ESLint

# After build — copy runtime assets to standalone (required every build)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp -r db .next/standalone/db
cp seed.json .next/standalone/seed.json

# Tests
npx jest --no-coverage                          # All unit + integration tests
npx jest --testPathPatterns="path/to/file"      # Single test file
npx jest --no-coverage --watch                  # Watch mode
npx jest --coverage                             # Coverage report (threshold: 80%)
npx playwright test                             # E2E tests (requires server running)

# Process management (production)
pm2 start ecosystem.config.js   # Start
pm2 restart fin-board            # Restart after rebuild
pm2 logs fin-board               # View logs
pm2 status                       # Check status
```

## Architecture

### Data Flow

```
iPhone (Edge) → Tailscale → Pi :3000
                                │
                     Next.js App Router
                    /           |          \
            /api/tickers  /api/quotes  /api/chart
                    \           |          /
                    createCacheOrchestrator(db)
                          /          \
               CacheRepository    yahoo-finance2 v3
               (SQLite TTL)        (lazy singleton)
                    |
              better-sqlite3
              data/fin_board.db
```

### Request Lifecycle

1. `page.tsx` mounts → `useQuotes()` polls `/api/quotes` every 60 seconds
2. `/api/quotes` calls `runSeedIfEmpty()` (inserts `seed.json` on first boot), then `getCachedQuotes(symbols)`
3. Cache hit (TTL: quote=5min, chart=15–720min by timeframe) → returns SQLite data
4. Cache miss → `fetchQuotes()` calls Yahoo Finance per-symbol via `Promise.allSettled`, stores results
5. `StockCard` mounts → `useChartData(symbol, timeframe)` debounces 300ms → fetches `/api/chart`
6. `Sparkline` renders with `IntersectionObserver` lazy init (only creates canvas when card is visible)

### Key Design Decisions

**Cache storage trick:** Quotes (non-time-series) are stored in `price_cache` with timeframe key `__quote__`, serialized as a single-element JSON array. This reuses the cache table for both quote and chart data.

**yahoo-finance2 v3:** The library's default export is a class (not a plain object). It's instantiated lazily via `getYf()` in `src/lib/yahoo.ts` so that Jest mocks can intercept `require('yahoo-finance2')` before instantiation. The mock in `yahoo.test.ts` must mock the default export as a constructor (`jest.fn().mockImplementation(() => ({ quote, chart }))`).

**Repository factories:** `createTickerRepository(db)` and `createCacheRepository(db)` take a DB instance as a parameter (not a singleton). This allows tests to pass an in-memory SQLite DB (`:memory:`) without touching the filesystem.

**Standalone output:** `next.config.ts` uses `output: 'standalone'`. After every build, `db/`, `seed.json`, `public/`, and `.next/static/` must be manually copied into `.next/standalone/` — Next.js does not do this automatically.

### Test Architecture

Two Jest projects run in parallel:

| Project | Environment | Covers |
|---------|-------------|--------|
| `node`  | Node.js     | `src/lib/`, `src/repositories/`, `__tests__/integration/` |
| `jsdom` | jsdom       | `src/components/`, `src/hooks/` |

**Mocking conventions:**
- `lightweight-charts` → `__mocks__/lightweight-charts.ts` (auto-applied in jsdom project via `moduleNameMapper`)
- `IntersectionObserver` / `ResizeObserver` → set on `global` in each test that needs them (see `Sparkline.test.tsx`)
- `yahoo-finance2` → `jest.mock('yahoo-finance2', ...)` with constructor mock pattern
- API calls in component/hook tests → `global.fetch = jest.fn()`
- Integration tests use in-memory SQLite, never the real `data/fin_board.db`

**Coverage exclusions** (configured in `jest.config.ts`): `src/app/page.tsx`, API route handlers, `src/lib/db.ts`, `src/lib/seed.ts`, error/loading pages.

### SQLite Schema

```sql
tickers       -- watchlist: symbol (UNIQUE), name, market ('US'|'JP'), created_at
price_cache   -- TTL cache: (symbol, timeframe) PK, data (JSON), fetched_at
```

The DB file lives at `data/fin_board.db` (gitignored). Schema is applied idempotently on first `getDb()` call via `db/schema.sql`.

### Stock Symbol Conventions

- Japanese stocks use Yahoo Finance suffix: `7203.T`, `6758.T` etc.
- `market` field on `Ticker` is `'JP'` or `'US'` — used for display only, not for routing
- Prices: USD stocks display with `$` and 2 decimals; JPY stocks with `¥` and 0 decimals (rounded)
