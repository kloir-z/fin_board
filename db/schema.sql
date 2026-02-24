CREATE TABLE IF NOT EXISTS watchlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  position INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('US', 'JP', 'MY', 'TH', 'VN')),
  position INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(symbol, watchlist_id)
);

CREATE TABLE IF NOT EXISTS price_cache (
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  data TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (symbol, timeframe)
);
