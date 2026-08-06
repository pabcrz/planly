import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Music } from 'lucide-react'
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
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors'

export function SetlistItemRow({ item, isFirst, isLast, canEdit, onMove, onUpdateKey, onRemove }: SetlistItemRowProps) {
  const [keyDraft, setKeyDraft] = useState(item.key)

  useEffect(() => {
    setKeyDraft(item.key)
  }, [item.key])

  return (
    <li className="group flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all duration-150">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-bold text-xs text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        {item.sort_order}
      </div>

      <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
        <Music className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="truncate text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.song.title}</span>
          {item.song.author ? (
            <span className="text-xs text-gray-400 font-normal">· {item.song.author}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {item.version.version_name}
          </span>
          {item.notes ? <span className="truncate text-xs text-gray-400 font-medium">· {item.notes}</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider hidden md:inline-block">Tono</span>
        {canEdit ? (
          <select
            aria-label={`Tonalidad para ${item.song.title}`}
            value={keyDraft}
            onChange={(e) => {
              const newKey = e.target.value
              setKeyDraft(newKey)
              if (newKey !== item.key) onUpdateKey(item.id, newKey)
            }}
            className="w-16 shrink-0 rounded-lg border border-indigo-200 px-2 py-1 text-center text-xs font-black text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100/70 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer shadow-2xs"
          >
            {!['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'C#m', 'Dm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'].includes(keyDraft) ? (
              <option value={keyDraft}>{keyDraft}</option>
            ) : null}
            {['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'C#m', 'Dm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        ) : (
          <span className="shrink-0 rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-900 border border-indigo-200/50">
            {item.key}
          </span>
        )}
      </div>

      {canEdit ? (
        <div className="flex shrink-0 items-center gap-0.5 border-l border-gray-100 pl-2">
          <button
            type="button"
            aria-label="Mover arriba"
            disabled={isFirst}
            onClick={() => onMove(item.id, item.sort_order - 1)}
            className={iconButtonClass}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mover abajo"
            disabled={isLast}
            onClick={() => onMove(item.id, item.sort_order + 1)}
            className={iconButtonClass}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${item.song.title}`}
            onClick={() => onRemove(item.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </li>
  )
}
