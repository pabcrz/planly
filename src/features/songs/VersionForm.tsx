import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { createVersion } from '@/services/songService'
import { ChordProEditor } from './ChordProEditor'

interface VersionFormProps {
  songId: string
  onSaved: () => void
  onCancel: () => void
}

export function VersionForm({ songId, onSaved, onCancel }: VersionFormProps) {
  const queryClient = useQueryClient()
  const [versionName, setVersionName] = useState('')
  const [songKey, setSongKey] = useState('')
  const [notes, setNotes] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createVersion({
        song_id: songId,
        version_name: versionName,
        key: songKey,
        chordpro_content: content,
        notes: notes.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['song', songId] })
      onSaved()
    },
    onError: (err) => {
      if (err instanceof ZodError) setError(err.issues[0]?.message ?? 'Invalid input')
      else setError(err instanceof Error ? err.message : 'Something went wrong')
    },
  })

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        mutation.mutate()
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="version_name" className={labelClass}>
            Version name *
          </label>
          <input
            id="version_name"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="Original"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="version_key" className={labelClass}>
            Key *
          </label>
          <input
            id="version_key"
            value={songKey}
            onChange={(e) => setSongKey(e.target.value)}
            placeholder="G"
            className={inputClass}
            required
          />
        </div>
      </div>

      <ChordProEditor value={content} onChange={setContent} />

      <div>
        <label htmlFor="version_notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="version_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Add version'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
