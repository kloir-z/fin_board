'use client'

import { useState, useRef, useEffect } from 'react'
import type { Watchlist, Timeframe } from '@/lib/types'

const ALL_TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '2Y', '3Y', '5Y']

interface RefreshIndicatorProps {
  lastUpdated: Date | null
  onRefresh: () => void
  isLoading: boolean
  watchlists: Watchlist[]
  activeWatchlistId: number | null
  onSelectWatchlist: (id: number) => void
  onAddTicker: () => void
  onCreateWatchlist: (name: string) => Promise<void>
  onRenameWatchlist: (id: number, name: string) => Promise<void>
  onDeleteWatchlist: (id: number) => Promise<void>
  globalTimeframe: Timeframe
  onGlobalTimeframeChange: (tf: Timeframe) => void
}

export function RefreshIndicator({
  lastUpdated,
  onRefresh,
  isLoading,
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  onAddTicker,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  globalTimeframe,
  onGlobalTimeframeChange,
}: RefreshIndicatorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [tfDropdownOpen, setTfDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const tfDropdownRef = useRef<HTMLDivElement>(null)

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId)

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--'

  // Close dropdowns on outside tap/click
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setCreating(false)
        setRenamingId(null)
        setConfirmDeleteId(null)
      }
      if (tfDropdownRef.current && !tfDropdownRef.current.contains(e.target as Node)) {
        setTfDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const handleSelect = (id: number) => {
    onSelectWatchlist(id)
    setDropdownOpen(false)
    setRenamingId(null)
    setConfirmDeleteId(null)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await onCreateWatchlist(newName.trim())
    setNewName('')
    setCreating(false)
    setDropdownOpen(false)
  }

  const handleRename = async (id: number) => {
    if (!renameValue.trim()) return
    await onRenameWatchlist(id, renameValue.trim())
    setRenamingId(null)
    setRenameValue('')
  }

  const handleDeleteConfirm = async (id: number) => {
    await onDeleteWatchlist(id)
    setConfirmDeleteId(null)
    setDropdownOpen(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700 sticky top-0 z-20">
      {/* Watchlist dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setDropdownOpen((o) => !o)
            setRenamingId(null)
            setConfirmDeleteId(null)
            setCreating(false)
          }}
          className="flex items-center gap-1 text-sm text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-lg touch-manipulation max-w-[140px]"
        >
          <span className="truncate">{activeWatchlist?.name ?? '...'}</span>
          <span className="text-gray-400 text-xs flex-shrink-0">{dropdownOpen ? '▴' : '▾'}</span>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[220px] z-50 py-1 overflow-y-auto max-h-[70vh]">
            {watchlists.map((w) => (
              <div key={w.id}>
                {renamingId === w.id ? (
                  /* ── Rename row ── */
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-750">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(w.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1 outline-none border border-blue-500"
                    />
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => handleRename(w.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 touch-manipulation"
                    >
                      保存
                    </button>
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => setRenamingId(null)}
                      className="text-gray-500 hover:text-gray-300 text-sm px-1 py-1 touch-manipulation"
                    >
                      ✕
                    </button>
                  </div>
                ) : confirmDeleteId === w.id ? (
                  /* ── Delete confirm row ── */
                  <div className="flex items-center gap-1 px-3 py-2 bg-red-900/30">
                    <span className="flex-1 text-red-300 text-xs">「{w.name}」を削除しますか？</span>
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => handleDeleteConfirm(w.id)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 touch-manipulation font-medium"
                    >
                      削除
                    </button>
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 touch-manipulation"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  /* ── Normal row ── */
                  <div className="flex items-center">
                    <button
                      onClick={() => handleSelect(w.id)}
                      className="flex-1 flex items-center gap-1.5 text-left px-3 py-2.5 text-sm hover:bg-gray-700 touch-manipulation"
                    >
                      {w.id === activeWatchlistId
                        ? <span className="text-blue-400 text-xs w-3">✓</span>
                        : <span className="w-3" />
                      }
                      <span className={w.id === activeWatchlistId ? 'text-white font-medium' : 'text-gray-300'}>
                        {w.name}
                      </span>
                    </button>
                    {/* Rename button — always visible */}
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => { setRenamingId(w.id); setRenameValue(w.name); setConfirmDeleteId(null) }}
                      className="px-2.5 py-2.5 text-gray-400 hover:text-white active:text-white touch-manipulation text-sm"
                      aria-label={`${w.name}を名前変更`}
                    >
                      ✎
                    </button>
                    {/* Delete button — always visible, hidden if only 1 list */}
                    {watchlists.length > 1 && (
                      <button
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => { setConfirmDeleteId(w.id); setRenamingId(null) }}
                        className="px-2.5 py-2.5 text-red-500 hover:text-red-300 active:text-red-300 touch-manipulation text-sm"
                        aria-label={`${w.name}を削除`}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Create new watchlist */}
            <div className="border-t border-gray-700 mt-1 pt-1">
              {creating ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <input
                    autoFocus
                    placeholder="リスト名を入力"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') setCreating(false)
                    }}
                    className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1 outline-none border border-blue-500"
                  />
                  <button
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={handleCreate}
                    className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 touch-manipulation"
                  >
                    作成
                  </button>
                  <button
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setCreating(false)}
                    className="text-gray-500 hover:text-gray-300 text-sm px-1 touch-manipulation"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setCreating(true); setRenamingId(null); setConfirmDeleteId(null) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-gray-700 touch-manipulation"
                >
                  ＋ 新規作成
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add ticker button */}
      <button
        onClick={onAddTicker}
        aria-label="Manage watchlist"
        className="w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white text-lg leading-none touch-manipulation flex-shrink-0"
      >
        +
      </button>

      {/* Global timeframe dropdown */}
      <div className="relative" ref={tfDropdownRef}>
        <button
          onClick={() => setTfDropdownOpen((o) => !o)}
          className="flex items-center gap-0.5 text-[10px] font-medium text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded touch-manipulation"
        >
          <span>{globalTimeframe}</span>
          <span className="text-gray-400 text-[8px]">{tfDropdownOpen ? '▴' : '▾'}</span>
        </button>
        {tfDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden min-w-[56px]">
            {ALL_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => { onGlobalTimeframeChange(tf); setTfDropdownOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs touch-manipulation ${
                  globalTimeframe === tf
                    ? 'text-blue-400 font-semibold bg-gray-700'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Updated time + refresh */}
      <span className="text-xs text-gray-500">
        <span className="text-gray-400">{timeStr}</span>
        <span className="ml-1 text-gray-600 text-[10px]">(15-20m)</span>
      </span>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 touch-manipulation px-2 py-1"
      >
        {isLoading ? '...' : '↺'}
      </button>
    </div>
  )
}
