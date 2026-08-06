import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { createVersion, updateVersion } from '@/services/songService'
import { ChordProEditor } from './ChordProEditor'
import { KeyPicker } from './KeyPicker'
import type { SongVersion } from '@/types/models'

interface VersionFormProps {
  songId: string
  onSaved: () => void
  onCancel: () => void
  version?: SongVersion | null
}

export function VersionForm({ songId, onSaved, onCancel, version }: VersionFormProps) {
  const queryClient = useQueryClient()
  const [versionName, setVersionName] = useState(version?.version_name ?? '')
  const [songKey, setSongKey] = useState(version?.key ?? '')
  const [notes, setNotes] = useState(version?.notes ?? '')
  const [content, setContent] = useState(version?.chordpro_content ?? '')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      version ? updateVersion(version.id, {
        version_name: versionName,
        key: songKey,
        chordpro_content: content,
        notes: notes.trim() || null,
      }) : createVersion({
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
      if (err instanceof ZodError) setError(err.issues[0]?.message ?? 'Datos no válidos')
      else setError('No se pudo guardar la versión. Intenta de nuevo.')
    },
  })

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1.5 block text-sm font-semibold text-gray-700'

  return (
    <form
      className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        mutation.mutate()
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div>
            <label htmlFor="version_name" className={labelClass}>
              Nombre de la versión *
            </label>
            <input
              id="version_name"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Ej. Original, Acústica, Tonalidad baja"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              Tonalidad *
            </label>
            <KeyPicker value={songKey} onChange={setSongKey} />
            {!songKey ? <p className="mt-1.5 text-xs text-amber-600">Selecciona la tonalidad en la parrilla.</p> : null}
          </div>

          <div>
            <label htmlFor="version_notes" className={labelClass}>
              Notas / Observaciones
            </label>
            <textarea
              id="version_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ej. Entra solo teclado, capo en 2, repetición al final"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col min-w-0">
          <ChordProEditor value={content} onChange={setContent} />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || !songKey || !versionName.trim() || !content.trim()}
          className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
        >
          {mutation.isPending ? 'Guardando…' : version ? 'Guardar versión' : 'Agregar versión'}
        </button>
      </div>
    </form>
  )
}
