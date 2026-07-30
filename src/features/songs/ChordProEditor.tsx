import { useMemo, useState } from 'react'
import { parseChordPro } from '@/lib/chordpro/parser'
import { ChordProRenderer } from '@/lib/chordpro/renderer'

interface ChordProEditorProps {
  value: string
  onChange: (value: string) => void
}

export function ChordProEditor({ value, onChange }: ChordProEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  const preview = useMemo(() => {
    if (!showPreview) return null
    try {
      return { document: parseChordPro(value), error: null }
    } catch (error) {
      return { document: null, error: error instanceof Error ? error.message : 'Parse error' }
    }
  }, [showPreview, value])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="chordpro_content" className="block text-sm font-medium text-gray-700">
          ChordPro content *
        </label>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          {showPreview ? 'Hide preview' : 'Preview'}
        </button>
      </div>
      <textarea
        id="chordpro_content"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder={'{title: Amazing Grace}\n{key: G}\n\n[G]Amazing [D]grace'}
        className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
      />
      {showPreview ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          {preview?.error ? (
            <p className="text-sm text-red-600">{preview.error}</p>
          ) : preview?.document ? (
            <ChordProRenderer document={preview.document} mode="chords" />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
