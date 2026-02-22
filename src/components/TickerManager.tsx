'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Ticker } from '@/lib/types'

interface TickerManagerProps {
  isOpen: boolean
  onClose: () => void
  onChange: () => void
  watchlistId: number | null
}

function SortableTicker({
  ticker,
  onRemove,
}: {
  ticker: Ticker
  onRemove: (symbol: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticker.symbol,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between py-2 border-b border-gray-800"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-500 mr-2 select-none touch-none px-1"
        aria-label="Drag to reorder"
      >
        ⠿
      </div>
      <div className="flex-1">
        <span className="text-white text-sm font-medium">{ticker.symbol}</span>
        <span className="text-gray-500 text-xs ml-2">{ticker.name}</span>
      </div>
      <button
        onClick={() => onRemove(ticker.symbol)}
        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 touch-manipulation"
        aria-label={`Remove ${ticker.symbol}`}
      >
        Remove
      </button>
    </div>
  )
}

export function TickerManager({ isOpen, onClose, onChange, watchlistId }: TickerManagerProps) {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [market, setMarket] = useState<'US' | 'JP'>('US')
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )

  useEffect(() => {
    if (!isOpen || watchlistId === null) return
    fetch(`/api/tickers?watchlistId=${watchlistId}`)
      .then((r) => r.json())
      .then((json) => setTickers(json.data ?? []))
      .catch(() => setTickers([]))
  }, [isOpen, watchlistId])

  const handleAdd = async () => {
    if (watchlistId === null) return
    const sym = symbol.trim().toUpperCase()
    const nm = name.trim() || sym
    if (!sym) {
      setError('Symbol is required')
      return
    }

    setIsAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym, name: nm, market, watchlistId }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Failed to add ticker')
        return
      }
      setTickers((prev) => [...prev, json.data])
      setSymbol('')
      setName('')
      onChange()
    } catch {
      setError('Network error')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (sym: string) => {
    if (watchlistId === null) return
    try {
      const res = await fetch('/api/tickers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym, watchlistId }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Failed to remove ticker')
        return
      }
      setTickers((prev) => prev.filter((t) => t.symbol !== sym))
      onChange()
    } catch {
      setError('Network error')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (watchlistId === null) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tickers.findIndex((t) => t.symbol === active.id)
    const newIndex = tickers.findIndex((t) => t.symbol === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previousTickers = tickers
    const newOrder = arrayMove(tickers, oldIndex, newIndex)
    setTickers(newOrder)

    try {
      const res = await fetch('/api/tickers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder.map((t) => t.symbol), watchlistId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onChange()
    } catch {
      setTickers(previousTickers)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-20 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl z-30 transition-transform duration-300 max-h-[80vh] flex flex-col ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-white font-semibold">Manage Watchlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white touch-manipulation text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Add ticker form */}
        <div className="px-4 py-3 border-b border-gray-700 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Symbol (e.g. AAPL, ^N225, N225)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              aria-label="Ticker symbol"
            />
            <div className="flex rounded-lg border border-gray-600 overflow-hidden">
              {(['US', 'JP'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={`px-3 py-2 text-sm font-medium ${
                    market === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Company name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              aria-label="Company name"
            />
            <button
              onClick={handleAdd}
              disabled={isAdding || watchlistId === null}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium touch-manipulation"
            >
              Add
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Ticker list */}
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {tickers.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No tickers yet</p>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={tickers.map((t) => t.symbol)}
                strategy={verticalListSortingStrategy}
              >
                {tickers.map((t) => (
                  <SortableTicker key={t.symbol} ticker={t} onRemove={handleRemove} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </>
  )
}
