'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Quote, Timeframe, Watchlist, Market } from '@/lib/types'
import type { SortKey } from './RefreshIndicator'
import { useChartDataBulk } from '@/hooks/useChartDataBulk'
import { StockCard } from './StockCard'
import { CardActionMenu } from './CardActionMenu'

// 通貨コードを市場グループ番号にマッピング（同一グループは同順位）
const CURRENCY_ORDER: Record<string, number> = {
  USD: 0, // US・暗号・先物・FX
  JPY: 1,
  KRW: 2,
  MYR: 3,
  THB: 4,
  VND: 5,
}

function applySortKey(
  quotes: Quote[],
  key: SortKey,
  periodPctMap: Map<string, number>
): Quote[] {
  if (key === 'default') return quotes
  const sorted = [...quotes]
  if (key === 'change_desc') {
    // 表示中の期間変動率（高い順）。未取得はマップに存在しないので後ろに
    sorted.sort((a, b) => {
      const pa = periodPctMap.get(a.symbol) ?? -Infinity
      const pb = periodPctMap.get(b.symbol) ?? -Infinity
      return pb - pa
    })
  } else if (key === 'change_asc') {
    // 表示中の期間変動率（低い順）。未取得はマップに存在しないので後ろに
    sorted.sort((a, b) => {
      const pa = periodPctMap.get(a.symbol) ?? Infinity
      const pb = periodPctMap.get(b.symbol) ?? Infinity
      return pa - pb
    })
  } else if (key === 'market') {
    sorted.sort((a, b) => {
      const oa = CURRENCY_ORDER[a.currency] ?? 99
      const ob = CURRENCY_ORDER[b.currency] ?? 99
      if (oa !== ob) return oa - ob
      const pa = periodPctMap.get(a.symbol) ?? 0
      const pb = periodPctMap.get(b.symbol) ?? 0
      return pb - pa
    })
  }
  return sorted
}

interface StockGridProps {
  quotes: Quote[]
  watchlistId: number | null
  globalTimeframe?: Timeframe
  sortKey?: SortKey
  isFrozen?: boolean
  watchlists?: Watchlist[]
  onRefresh?: () => void
}

function SortableCard({
  quote,
  isDraggingThis,
  globalTimeframe,
  onMenuOpen,
}: {
  quote: Quote
  isDraggingThis: boolean
  globalTimeframe?: Timeframe
  onMenuOpen?: (symbol: string, name: string, currency: string, rect: DOMRect) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: quote.symbol,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDraggingThis ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Transparent drag handle — covers only the top ~40px (name/price rows).
          The chart and timeframe selector below are unaffected. */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 right-0 h-10 z-10 touch-none cursor-grab active:cursor-grabbing select-none"
        aria-label="ドラッグして並べ替え"
      />
      <StockCard quote={quote} globalTimeframe={globalTimeframe} onMenuOpen={onMenuOpen} />
    </div>
  )
}

export function StockGrid({ quotes, watchlistId, globalTimeframe, sortKey = 'default', isFrozen = false, watchlists = [], onRefresh }: StockGridProps) {
  // Manage order separately from quote data.
  // This prevents server refreshes (new prices) from resetting the user-defined order.
  const [symbolOrder, setSymbolOrder] = useState<string[]>(() => quotes.map((q) => q.symbol))
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null)
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Card action menu state
  const [menuTarget, setMenuTarget] = useState<{
    symbol: string
    name: string
    currency: string
    rect: DOMRect
  } | null>(null)

  const handleMenuOpen = (symbol: string, name: string, currency: string, rect: DOMRect) => {
    setMenuTarget({ symbol, name, currency, rect })
  }

  const handleCopy = async (symbol: string, name: string, market: Market, destWatchlistId: number) => {
    await fetch('/api/tickers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name, market, watchlistId: destWatchlistId }),
    })
  }

  const handleMove = async (symbol: string, name: string, market: Market, srcWatchlistId: number, destWatchlistId: number) => {
    await fetch('/api/tickers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name, market, watchlistId: destWatchlistId }),
    })
    await fetch('/api/tickers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, watchlistId: srcWatchlistId }),
    })
    onRefresh?.()
  }

  const handleDelete = async (symbol: string, fromWatchlistId: number) => {
    await fetch('/api/tickers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, watchlistId: fromWatchlistId }),
    })
    onRefresh?.()
  }

  // 期間変動率マップ（ソート用）。sortKey が default/market 以外のときのみ有効活用
  const symbols = quotes.map((q) => q.symbol)
  const periodPctMap = useChartDataBulk(symbols, globalTimeframe ?? '1D')

  // When quotes change, sync symbolOrder for additions/removals only — never reorder.
  useEffect(() => {
    setSymbolOrder((prev) => {
      const incoming = new Set(quotes.map((q) => q.symbol))
      const existing = new Set(prev)
      const kept = prev.filter((s) => incoming.has(s))
      const added = quotes.filter((q) => !existing.has(q.symbol)).map((q) => q.symbol)
      return [...kept, ...added]
    })
  }, [quotes])

  // Derive display order: user-defined order → apply sort if active
  const baseOrdered = symbolOrder
    .map((sym) => quotes.find((q) => q.symbol === sym))
    .filter((q): q is Quote => q !== undefined)
  const sortedOrdered = applySortKey(baseOrdered, sortKey, periodPctMap)

  // 固定中は frozenOrder を使う（quotes に存在するシンボルのみ）
  const ordered = isFrozen && frozenOrder !== null
    ? frozenOrder
        .map((sym) => quotes.find((q) => q.symbol === sym))
        .filter((q): q is Quote => q !== undefined)
    : sortedOrdered

  // isFrozen の変化を検知してスナップショットを管理
  useEffect(() => {
    if (isFrozen) {
      // false → true: 現在の表示順をスナップショット
      setFrozenOrder(sortedOrdered.map((q) => q.symbol))
    } else {
      // true → false: クリア（次フレームで sortedOrdered が使われる）
      setFrozenOrder(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFrozen])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg">No stocks in watchlist</p>
        <p className="text-sm mt-1">Tap + to add tickers</p>
      </div>
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveSymbol(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSymbol(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    // 表示ベース（ordered）のインデックスで計算する
    const displayedSymbols = ordered.map((q) => q.symbol)
    const oldIndex = displayedSymbols.indexOf(String(active.id))
    const newIndex = displayedSymbols.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    if (isFrozen && frozenOrder !== null) {
      // 固定中: frozenOrder のみ更新（server への PATCH は行わない）
      setFrozenOrder(arrayMove(frozenOrder, oldIndex, newIndex))
    } else {
      // 通常: symbolOrder を更新して server に保存
      const newSymbolOrder = arrayMove(displayedSymbols, oldIndex, newIndex)
      setSymbolOrder(newSymbolOrder)

      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (watchlistId === null) return

      saveTimer.current = setTimeout(async () => {
        try {
          await fetch('/api/tickers', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: newSymbolOrder, watchlistId }),
          })
        } catch {
          // order will re-sync on next server refresh
        }
      }, 500)
    }
  }

  const activeQuote = quotes.find((q) => q.symbol === activeSymbol) ?? null

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((q) => q.symbol)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,160px))] gap-2 p-2 isolate">
            {ordered.map((quote) => (
              <SortableCard
                key={quote.symbol}
                quote={quote}
                isDraggingThis={quote.symbol === activeSymbol}
                globalTimeframe={globalTimeframe}
                onMenuOpen={handleMenuOpen}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeQuote && (
            <div className="rotate-2 shadow-2xl opacity-90 scale-105">
              <StockCard quote={activeQuote} globalTimeframe={globalTimeframe} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {menuTarget && watchlistId !== null && (
        <CardActionMenu
          symbol={menuTarget.symbol}
          name={menuTarget.name}
          currency={menuTarget.currency}
          anchorRect={menuTarget.rect}
          watchlists={watchlists}
          activeWatchlistId={watchlistId}
          onClose={() => setMenuTarget(null)}
          onCopy={handleCopy}
          onMove={handleMove}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
