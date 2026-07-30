import { useEffect, useState } from 'react'
import type { SetlistItemWithSong } from '@/services/serviceService'

interface SetlistItemRowProps {
  item: SetlistItemWithSong
  isFirst: boolean
  isLast: boolean
  /** Read-only rows (members, frozen setlists) hide all edit controls. */
  canEdit: boolean
  onMove: (itemId: string, newSortOrder: number) => void
  onUpdateKey: (itemId: string, key: string) => void
  onRemove: (itemId: string) => void
}

const iconButtonClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30'

export function SetlistItemRow({ item, isFirst, isLast, canEdit, onMove, onUpdateKey, onRemove }: SetlistItemRowProps) {
  const [keyDraft, setKeyDraft] = useState(item.key)

  useEffect(() => {
    setKeyDraft(item.key)
  }, [item.key])

  const commitKey = () => {
    const trimmed = keyDraft.trim()
    if (trimmed && trimmed !== item.key) onUpdateKey(item.id, trimmed)
    else setKeyDraft(item.key)
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <span className="w-7 shrink-0 text-center text-sm font-semibold text-gray-400">{item.sort_order}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{item.song.title}</p>
        <p className="truncate text-xs text-gray-500">{item.version.version_name}</p>
        {item.notes ? <p className="mt-0.5 truncate text-xs text-gray-400">{item.notes}</p> : null}
      </div>

      {canEdit ? (
        <input
          aria-label={`Key for ${item.song.title}`}
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={commitKey}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="w-16 shrink-0 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none"
        />
      ) : (
        <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
          {item.key}
        </span>
      )}

      {canEdit ? (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label="Move up"
            disabled={isFirst}
            onClick={() => onMove(item.id, item.sort_order - 1)}
            className={iconButtonClass}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={isLast}
            onClick={() => onMove(item.id, item.sort_order + 1)}
            className={iconButtonClass}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`Remove ${item.song.title}`}
            onClick={() => onRemove(item.id)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-red-500 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      ) : null}
    </li>
  )
}
