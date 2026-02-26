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
import type { Quote, Timeframe } from '@/lib/types'
import { StockCard } from './StockCard'

interface StockGridProps {
  quotes: Quote[]
  watchlistId: number | null
  globalTimeframe?: Timeframe
}

function SortableCard({ quote, isDraggingThis, globalTimeframe }: { quote: Quote; isDraggingThis: boolean; globalTimeframe?: Timeframe }) {
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
      <StockCard quote={quote} globalTimeframe={globalTimeframe} />
    </div>
  )
}

export function StockGrid({ quotes, watchlistId, globalTimeframe }: StockGridProps) {
  // Manage order separately from quote data.
  // This prevents server refreshes (new prices) from resetting the user-defined order.
  const [symbolOrder, setSymbolOrder] = useState<string[]>(() => quotes.map((q) => q.symbol))
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Derive display order: user-defined symbol sequence with latest price data
  const ordered = symbolOrder
    .map((sym) => quotes.find((q) => q.symbol === sym))
    .filter((q): q is Quote => q !== undefined)

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

    const oldIndex = symbolOrder.indexOf(String(active.id))
    const newIndex = symbolOrder.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const newSymbolOrder = arrayMove(symbolOrder, oldIndex, newIndex)
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

  const activeQuote = quotes.find((q) => q.symbol === activeSymbol) ?? null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map((q) => q.symbol)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fill,160px)] gap-2 p-2 isolate">
          {ordered.map((quote) => (
            <SortableCard
              key={quote.symbol}
              quote={quote}
              isDraggingThis={quote.symbol === activeSymbol}
              globalTimeframe={globalTimeframe}
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
  )
}
