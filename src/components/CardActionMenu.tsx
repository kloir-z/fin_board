'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Watchlist, Market } from '@/lib/types'

type MenuState = 'main' | 'copy-picker' | 'move-picker'

interface CardActionMenuProps {
  symbol: string
  name: string
  currency: string
  anchorRect: DOMRect
  watchlists: Watchlist[]
  activeWatchlistId: number
  onClose: () => void
  onCopy: (symbol: string, name: string, market: Market, destWatchlistId: number) => Promise<void>
  onMove: (symbol: string, name: string, market: Market, srcWatchlistId: number, destWatchlistId: number) => Promise<void>
  onDelete: (symbol: string, watchlistId: number) => Promise<void>
}

function marketFromCurrency(currency: string): Market {
  switch (currency) {
    case 'JPY': return 'JP'
    case 'KRW': return 'KR'
    case 'MYR': return 'MY'
    case 'THB': return 'TH'
    case 'VND': return 'VN'
    default: return 'US'
  }
}

export function CardActionMenu({
  symbol,
  name,
  currency,
  anchorRect,
  watchlists,
  activeWatchlistId,
  onClose,
  onCopy,
  onMove,
  onDelete,
}: CardActionMenuProps) {
  const [menuState, setMenuState] = useState<MenuState>('main')
  const [busy, setBusy] = useState(false)

  const otherLists = watchlists.filter((w) => w.id !== activeWatchlistId)
  const trashList = watchlists.find((w) => w.name === 'ゴミ箱')
  const market = marketFromCurrency(currency)

  // ポップアップ位置
  const pickerWidth = 176
  const gap = 6
  const isPicker = menuState === 'copy-picker' || menuState === 'move-picker'

  // main: 価格エリアの右上に、画面端クランプ付き（幅は内容に合わせて自動）
  // 右端を anchor の右端に合わせてから画面端クランプ
  const estimatedMainWidth = 120
  let anchoredLeft = anchorRect.right - estimatedMainWidth
  anchoredLeft = Math.max(8, Math.min(anchoredLeft, window.innerWidth - estimatedMainWidth - 8))
  let anchoredTop = anchorRect.top - 148 - gap
  if (anchoredTop < 8) anchoredTop = anchorRect.bottom + gap

  // picker: 画面中央固定（スクロール対応）
  const popupStyle: React.CSSProperties = isPicker
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: pickerWidth,
        maxHeight: '60vh',
        zIndex: 60,
      }
    : {
        position: 'fixed',
        top: anchoredTop,
        left: anchoredLeft,
        width: 'max-content',
        minWidth: estimatedMainWidth,
        zIndex: 60,
      }

  const exec = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = (destId: number) =>
    exec(() => onCopy(symbol, name, market, destId))

  const handleMove = (destId: number) =>
    exec(() => onMove(symbol, name, market, activeWatchlistId, destId))

  const handleDelete = () =>
    exec(() => onDelete(symbol, activeWatchlistId))

  const handleTrash = () => {
    if (!trashList) return
    exec(() => onMove(symbol, name, market, activeWatchlistId, trashList.id))
  }

  const content = (
    <>
      {/* 透明 backdrop: メニュー開放中に他をタップすると閉じる */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 58 }}
        onClick={onClose}
      />
    <div
      style={popupStyle}
      className={`bg-gray-800 border border-gray-600 rounded-xl shadow-2xl ${isPicker ? 'overflow-y-auto' : 'overflow-hidden'}`}
    >
      {menuState === 'main' && (
        <div className="py-1">
          <div className="px-3 py-1.5 text-[10px] text-gray-500 border-b border-gray-700">
            {symbol}
          </div>

          {otherLists.length > 0 && (
            <button
              disabled={busy}
              onClick={() => setMenuState('copy-picker')}
              className="w-full flex items-center px-3 py-2.5 text-xs text-gray-200 hover:bg-gray-700 touch-manipulation"
            >
              <span>コピー</span>
              <span className="ml-auto text-gray-500 text-[10px]">▶</span>
            </button>
          )}

          {otherLists.length > 0 && (
            <button
              disabled={busy}
              onClick={() => setMenuState('move-picker')}
              className="w-full flex items-center px-3 py-2.5 text-xs text-gray-200 hover:bg-gray-700 touch-manipulation"
            >
              <span>移動</span>
              <span className="ml-auto text-gray-500 text-[10px]">▶</span>
            </button>
          )}

          {trashList && trashList.id !== activeWatchlistId && (
            <button
              disabled={busy}
              onClick={handleTrash}
              className="w-full text-left px-3 py-2.5 text-xs text-gray-200 hover:bg-gray-700 touch-manipulation"
            >
              ゴミ箱へ
            </button>
          )}

          <div className="border-t border-gray-700 mt-1" />
          <button
            disabled={busy}
            onClick={handleDelete}
            className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-gray-700 touch-manipulation"
          >
            削除
          </button>
        </div>
      )}

      {(menuState === 'copy-picker' || menuState === 'move-picker') && (
        <>
          <button
            onClick={() => setMenuState('main')}
            className="sticky top-0 w-full flex items-center gap-1.5 px-3 py-2 text-[10px] text-gray-400 hover:text-white bg-gray-800 border-b border-gray-700 touch-manipulation"
          >
            <span>◀</span>
            <span>{menuState === 'copy-picker' ? 'コピー先を選択' : '移動先を選択'}</span>
          </button>
          <div className="py-1">
            {otherLists.map((w) => (
              <button
                key={w.id}
                disabled={busy}
                onClick={() => menuState === 'copy-picker' ? handleCopy(w.id) : handleMove(w.id)}
                className="w-full block text-left px-3 py-2.5 text-xs text-gray-200 hover:bg-gray-700 touch-manipulation leading-snug"
              >
                {w.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
    </>
  )

  return createPortal(content, document.body)
}
