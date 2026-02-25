/**
 * DB内の全シンボルと src/lib/descriptions.ts のキーを突合し、
 * 説明文が未登録のシンボルを一覧表示するスクリプト。
 *
 * 使い方（プロジェクトルートから）:
 *   node .claude/skills/syncing-descriptions/scripts/check_descriptions.cjs
 */
const { readFileSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '../../../..');
const Database = require(resolve(root, 'node_modules/better-sqlite3'));

const db = new Database(resolve(root, 'data/fin_board.db'), { readonly: true });

const rows = db.prepare(`
  SELECT t.symbol, t.name, w.name as watchlist
  FROM tickers t
  JOIN watchlists w ON t.watchlist_id = w.id
  ORDER BY t.symbol
`).all();
db.close();

const src = readFileSync(resolve(root, 'src/lib/descriptions.ts'), 'utf8');
const keys = new Set(
  [...src.matchAll(/^\s+'?([A-Za-z0-9^.=\-]+)'?\s*:/gm)].map(m => m[1])
);

const missing = new Map();
for (const { symbol, name, watchlist } of rows) {
  if (!keys.has(symbol) && !missing.has(symbol)) {
    missing.set(symbol, { name, watchlist });
  }
}

if (missing.size === 0) {
  console.log('✓ 全シンボルに説明文が登録されています。');
  process.exit(0);
}

console.log(`=== 説明文未登録シンボル一覧 (${missing.size}件) ===`);
for (const [sym, { name, watchlist }] of missing) {
  console.log(`${sym.padEnd(16)}${name.padEnd(36)}${watchlist}`);
}
process.exit(1);
