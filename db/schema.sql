CREATE TABLE IF NOT EXISTS tickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('US', 'JP')),
  position INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_cache (
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  data TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (symbol, timeframe)
);
