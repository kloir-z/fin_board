---
name: syncing-descriptions
description: DBの全銘柄とsrc/lib/descriptions.tsを突合し、説明文が未登録のシンボルに簡潔な日本語説明を追記する。銘柄（ticker）を新規追加したあと、または/sync-descriptionsと言われたときに使う。
---

# Syncing Descriptions

## 概要

銘柄をウォッチリストに追加するたびに `src/lib/descriptions.ts` への説明文登録が必要です。
このスキルは未登録シンボルを自動検出し、説明文を補完します。

## Step 1 — 未登録シンボルを検出

```bash
node .claude/skills/syncing-descriptions/scripts/check_descriptions.cjs
```

出力が `✓ 全シンボルに説明文が登録されています。` なら作業不要。終了してください。

未登録シンボルが表示された場合は Step 2 へ。

## Step 2 — 説明文を作成

未登録シンボルごとに **日本語1〜2文** の説明文を作成する。

**参考にする情報：**
- シンボル名・銘柄名（スクリプト出力から取得）
- 所属ウォッチリスト名（業種・地域の手がかり）
- 自身の知識（事業内容・代表製品・業界での位置づけ）

**説明文の基準：**
- 投資家が「何をしている会社か」を即座に理解できる内容
- 企業名・ブランド名・代表的な製品/サービスを含める
- 日本株は日本語社名を優先して記載
- 末尾は句点「。」で終える

## Step 3 — descriptions.ts に追記

`src/lib/descriptions.ts` の末尾の `}` 直前に、既存書式に合わせて追記する：

```typescript
  // ── カテゴリ名 ──────
  SYMBOL:
    '説明文。',
```

**書式の注意：**
- キーに `^` `.` `=` `-` が含まれる場合はシングルクォートで囲む（例: `'^GSPC'`）
- 値の末尾にカンマ `,` を付ける

## Step 4 — 再突合で確認

```bash
node .claude/skills/syncing-descriptions/scripts/check_descriptions.cjs
```

`✓` が表示されたら Step 5 へ。

## Step 5 — コミット

```bash
git add src/lib/descriptions.ts
git commit -m "feat: 説明文を追加（新規銘柄 N件）"
```
