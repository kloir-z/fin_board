---
name: watchlist-ops
description: ウォッチリスト(リスト)や銘柄(ticker)の追加・削除・作成操作を行う。ユーザーが銘柄の追加・削除・ウォッチリストの作成・削除を依頼したときに使う。
---

# Watchlist & Ticker Operations

## Symbol format

| Type | Format | Examples | market |
|------|--------|---------|--------|
| US stocks | Uppercase | `AAPL`, `NVDA`, `TSLA`, `MSFT` | `US` |
| JP stocks | Code + `.T` | `7203.T` (Toyota), `6758.T` (Sony) | `JP` |
| MY stocks | Code + `.KL` | `1155.KL` (Maybank), `1818.KL` (KLK) | `MY` |
| TH stocks | Code + `.BK` | `PTT.BK` (PTT), `SCB.BK` (SCB) | `TH` |
| VN stocks | Code + `.VN` | `VNM.VN` (Vinamilk), `VIC.VN` (Vingroup) | `VN` |
| KR stocks | Code + `.KS` | `005930.KS` (Samsung), `000660.KS` (SK Hynix) | `KR` |
| US indices | `^` prefix | `^GSPC`, `^IXIC`, `^DJI`, `^VIX` | `US` |
| JP indices | `^` prefix | `^N225` | `JP` |
| FX | `PAIR=X` | `USDJPY=X`, `EURUSD=X`, `EURJPY=X` | `US` |
| Futures | `SYM=F` | `GC=F` (Gold), `CL=F` (WTI) | `US` |
| Crypto | `SYM-USD` | `BTC-USD`, `ETH-USD` | `US` |

## Add a ticker

**Step 1 — Get watchlist IDs:**
```bash
curl -s http://localhost:3000/api/watchlists | jq '.data[] | {id, name}'
```

**Step 2 — POST ticker (one curl call per ticker; never chain with `&&` before `jq`):**
```bash
curl -s -X POST http://localhost:3000/api/tickers \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","name":"Apple Inc.","market":"US","watchlistId":1}' | jq .
```
- `409 Ticker already exists` → skip, already registered
- `404 Symbol not found` → wrong symbol
- `400 Invalid` → fix casing / format

**Step 3 — Append to seed.json (use `map(if ...)` form; `(map(...)|.[0].tickers)+=` is invalid):**
```bash
jq 'map(if .name == "<WATCHLIST_NAME>" then .tickers += [
  {"symbol":"AAPL","name":"Apple Inc.","market":"US"}
] else . end)' /home/user/code/fin_board/seed.json \
  > /tmp/seed_new.json && mv /tmp/seed_new.json /home/user/code/fin_board/seed.json
```

## Remove a ticker

**Step 1 — Confirm symbol is in the list:**
```bash
curl -s "http://localhost:3000/api/tickers?watchlistId=<ID>" | jq '.data[] | {symbol, name}'
```

**Step 2 — DELETE:**
```bash
curl -s -X DELETE http://localhost:3000/api/tickers \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","watchlistId":1}' | jq .
```

**Step 3 — Remove from seed.json:**
```bash
jq 'map(if .name == "<WATCHLIST_NAME>" then .tickers |= map(select(.symbol != "AAPL")) else . end)' \
  /home/user/code/fin_board/seed.json > /tmp/seed_new.json && mv /tmp/seed_new.json /home/user/code/fin_board/seed.json
```

## Create a watchlist

**Step 1 — POST:**
```bash
curl -s -X POST http://localhost:3000/api/watchlists \
  -H "Content-Type: application/json" \
  -d '{"name":"リスト名"}' | jq .
```

**Step 2 — Append to seed.json:**
```bash
jq '. += [{"name":"リスト名","tickers":[]}]' \
  /home/user/code/fin_board/seed.json > /tmp/seed_new.json && mv /tmp/seed_new.json /home/user/code/fin_board/seed.json
```

## Delete a watchlist

Always confirm with the user first (irreversible, cascades to all tickers in the list).

**Step 1 — Show contents before deleting:**
```bash
curl -s "http://localhost:3000/api/tickers?watchlistId=<ID>" | jq '.data[] | {symbol, name}'
```

**Step 2 — DELETE:**
```bash
curl -s -X DELETE http://localhost:3000/api/watchlists \
  -H "Content-Type: application/json" \
  -d '{"id":<ID>}' | jq .
```
- `400` → cannot delete the last watchlist

**Step 3 — Remove from seed.json:**
```bash
jq 'map(select(.name != "<WATCHLIST_NAME>"))' \
  /home/user/code/fin_board/seed.json > /tmp/seed_new.json && mv /tmp/seed_new.json /home/user/code/fin_board/seed.json
```
