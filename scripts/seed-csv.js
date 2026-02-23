#!/usr/bin/env node
/**
 * seed-csv.js — seed.json ↔ CSV 相互変換ツール
 *
 * 使い方:
 *   node scripts/seed-csv.js export [seed.json] [output.csv]
 *   node scripts/seed-csv.js import [input.csv]  [seed.json]
 *
 * デフォルトパス:
 *   seed.json  → ./seed.json
 *   CSV        → ./seed.csv
 *
 * CSVフォーマット (UTF-8, ヘッダー行あり):
 *   watchlist,symbol,name,market
 *   マーケット概況,^GSPC,S&P 500,US
 *   マイウォッチリスト,AAPL,Apple Inc.,US
 */

'use strict'

const fs = require('fs')
const path = require('path')

const SEED_JSON = path.resolve(process.cwd(), 'seed.json')
const SEED_CSV  = path.resolve(process.cwd(), 'seed.csv')

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/** RFC 4180 準拠: カンマ・ダブルクォート・改行を含む場合はクォートする */
function csvCell(value) {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function csvRow(cells) {
  return cells.map(csvCell).join(',')
}

/** 最低限のCSVパーサ (ダブルクォートのエスケープに対応) */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows = []
  for (const line of lines) {
    if (line.trim() === '') continue
    rows.push(splitCSVLine(line))
  }
  return rows
}

function splitCSVLine(line) {
  const cells = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      // クォートフィールド
      i++ // opening quote
      let cell = ''
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            cell += '"'
            i += 2
          } else {
            i++ // closing quote
            break
          }
        } else {
          cell += line[i++]
        }
      }
      cells.push(cell)
      if (line[i] === ',') i++ // skip separator
    } else {
      // 非クォートフィールド
      const end = line.indexOf(',', i)
      if (end === -1) {
        cells.push(line.slice(i))
        break
      } else {
        cells.push(line.slice(i, end))
        i = end + 1
      }
    }
  }
  return cells
}

// ---------------------------------------------------------------------------
// export: seed.json → CSV
// ---------------------------------------------------------------------------

function exportCmd(jsonPath, csvPath) {
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: ${jsonPath} が見つかりません`)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  // レガシーフォーマット (フラット配列) もサポート
  const watchlists =
    Array.isArray(raw) && raw.length > 0 && 'tickers' in raw[0]
      ? raw
      : [{ name: 'Default', tickers: raw }]

  const csvLines = [csvRow(['watchlist', 'symbol', 'name', 'market'])]

  for (const wl of watchlists) {
    for (const t of wl.tickers) {
      csvLines.push(csvRow([wl.name, t.symbol, t.name, t.market]))
    }
  }

  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf-8')
  console.log(`exported: ${jsonPath} → ${csvPath}  (${csvLines.length - 1} 銘柄)`)
}

// ---------------------------------------------------------------------------
// import: CSV → seed.json
// ---------------------------------------------------------------------------

function importCmd(csvPath, jsonPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: ${csvPath} が見つかりません`)
    process.exit(1)
  }

  const text = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(text)

  if (rows.length === 0) {
    console.error('Error: CSVが空です')
    process.exit(1)
  }

  // ヘッダー行を検証
  const [wlCol, symCol, nameCol, mktCol] = rows[0].map(h => h.trim().toLowerCase())
  if (wlCol !== 'watchlist' || symCol !== 'symbol' || nameCol !== 'name' || mktCol !== 'market') {
    console.error('Error: CSVの1行目はヘッダー行 (watchlist,symbol,name,market) である必要があります')
    process.exit(1)
  }

  /** @type {Map<string, Array<{symbol:string,name:string,market:string}>>} */
  const watchlistMap = new Map()
  const watchlistOrder = []

  let skipped = 0
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const watchlistName = row[0]?.trim()
    const symbol        = row[1]?.trim()
    const name          = row[2]?.trim()
    const market        = row[3]?.trim().toUpperCase()

    if (!watchlistName || !symbol || !name) {
      console.warn(`  警告: ${i + 1}行目をスキップ (必須列が空) →`, row)
      skipped++
      continue
    }

    if (market !== 'US' && market !== 'JP') {
      console.warn(`  警告: ${i + 1}行目をスキップ (market は US または JP) →`, row)
      skipped++
      continue
    }

    if (!watchlistMap.has(watchlistName)) {
      watchlistMap.set(watchlistName, [])
      watchlistOrder.push(watchlistName)
    }
    watchlistMap.get(watchlistName).push({ symbol, name, market })
  }

  const output = watchlistOrder.map(n => ({ name: n, tickers: watchlistMap.get(n) }))

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n', 'utf-8')

  const total = rows.length - 1 - skipped
  console.log(`imported: ${csvPath} → ${jsonPath}  (${total} 銘柄, スキップ ${skipped} 行)`)
}

// ---------------------------------------------------------------------------
// CLI エントリポイント
// ---------------------------------------------------------------------------

const [,, cmd, arg1, arg2] = process.argv

if (cmd === 'export') {
  exportCmd(arg1 ?? SEED_JSON, arg2 ?? SEED_CSV)
} else if (cmd === 'import') {
  importCmd(arg1 ?? SEED_CSV, arg2 ?? SEED_JSON)
} else {
  console.log(`
使い方:
  node scripts/seed-csv.js export [seed.json] [output.csv]
    seed.json を CSV に変換します

  node scripts/seed-csv.js import [input.csv] [seed.json]
    CSV を seed.json に変換します

デフォルトパス:
  seed.json → ./seed.json
  CSV       → ./seed.csv
`.trim())
  process.exit(1)
}
