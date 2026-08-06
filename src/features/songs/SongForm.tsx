import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { useChurch } from '@/app/providers/ChurchProvider'
import { createSong, getSong, updateSong } from '@/services/songService'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MediaReferenceCard } from './MediaReferenceCard'

type FieldErrors = Partial<Record<'title' | 'author' | 'tempo' | 'tags' | 'reference_urls', string>>

function toFieldErrors(error: unknown): FieldErrors | null {
  if (!(error instanceof ZodError)) return null
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && field in errors === false) {
      errors[field as keyof FieldErrors] = issue.message
    }
  }
  return errors
}

export function SongForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { activeChurchId } = useChurch()
  const isCanonical = location.pathname.startsWith('/admin/songs')

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', id],
    queryFn: () => getSong(id!),
    enabled: isEdit,
  })

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [tempo, setTempo] = useState('')
  const [tags, setTags] = useState('')
  const [referenceUrls, setReferenceUrls] = useState<string[]>([])
  const [newUrl, setNewUrl] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!song) return
    setTitle(song.title)
    setAuthor(song.author ?? '')
    setTempo(song.tempo ? String(song.tempo) : '')
    setTags(song.tags.join(', '))
    setReferenceUrls(Array.isArray(song.reference_urls) ? (song.reference_urls as string[]) : [])
  }, [song])

  const addUrl = () => {
    const trimmed = newUrl.trim()
    if (trimmed && !referenceUrls.includes(trimmed)) {
      setReferenceUrls([...referenceUrls, trimmed])
      setNewUrl('')
    }
  }

  const removeUrl = (index: number) => {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== index))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        title,
        author: author.trim() || null,
        tempo: tempo.trim() ? Number.parseInt(tempo, 10) : null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        reference_urls: referenceUrls.filter(Boolean),
      }
      if (isEdit) return updateSong(id!, input)
      return createSong({ ...input, church_id: isCanonical ? null : activeChurchId!, is_canonical: isCanonical })
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] })
      await queryClient.invalidateQueries({ queryKey: ['song'] })
      navigate(isCanonical ? `/admin/songs/${saved.id}` : `/songs/${saved.id}`)
    },
    onError: (error) => {
      const zodErrors = toFieldErrors(error)
      if (zodErrors) {
        setFieldErrors(zodErrors)
        setFormError(null)
      } else {
        setFieldErrors({})
        setFormError('No se pudo guardar la canción. Intenta de nuevo.')
      }
    },
  })

  if (isEdit && isLoading) return <LoadingSpinner />

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1.5 block text-sm font-semibold text-gray-700'
  const errorClass = 'mt-1 text-xs text-red-600'

  return (
    <div>
      <PageHeader title={isEdit ? 'Editar canción' : isCanonical ? 'Nueva canción base' : 'Nueva canción'} />
      <form
        className="px-4 pb-12 md:px-6 max-w-6xl"
        onSubmit={(e) => {
          e.preventDefault()
          setFieldErrors({})
          setFormError(null)
          mutation.mutate()
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Song Metadata */}
          <div className="lg:col-span-6 flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Información general
            </h2>
            <div>
              <label htmlFor="title" className={labelClass}>
                Título *
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Cuán grande es Él"
                className={inputClass}
                required
              />
              {fieldErrors.title ? <p className={errorClass}>{fieldErrors.title}</p> : null}
            </div>

            <div>
              <label htmlFor="author" className={labelClass}>
                Autor / Artista
              </label>
              <input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ej. Carl Boberg, En Espíritu y en Verdad"
                className={inputClass}
              />
              {fieldErrors.author ? <p className={errorClass}>{fieldErrors.author}</p> : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tempo" className={labelClass}>
                  Tempo (BPM)
                </label>
                <input
                  id="tempo"
                  type="number"
                  inputMode="numeric"
                  min={20}
                  max={400}
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="Ej. 72"
                  className={inputClass}
                />
                {fieldErrors.tempo ? <p className={errorClass}>{fieldErrors.tempo}</p> : null}
              </div>
              <div>
                <label htmlFor="tags" className={labelClass}>
                  Etiquetas (separadas por comas)
                </label>
                <input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="adoración, domingo, himno"
                  className={inputClass}
                />
                {fieldErrors.tags ? <p className={errorClass}>{fieldErrors.tags}</p> : null}
              </div>
            </div>
          </div>

          {/* Right Column: Multimedia references */}
          <div className="lg:col-span-6 flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Archivos Multimedia y Referencias
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Añade enlaces de Spotify, YouTube Music, YouTube o Apple Music como referencia para el equipo de alabanza.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://open.spotify.com/... o https://youtube.com/..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addUrl()
                  }
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={addUrl}
                className="shrink-0 rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Añadir
              </button>
            </div>
            {fieldErrors.reference_urls ? (
              <p className={errorClass}>{fieldErrors.reference_urls}</p>
            ) : null}

            <div className="flex flex-col gap-3 mt-1">
              {referenceUrls.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                  No has añadido referencias multimedia.
                </div>
              ) : (
                referenceUrls.map((url, i) => (
                  <MediaReferenceCard
                    key={`${url}-${i}`}
                    url={url}
                    readOnly={false}
                    onDelete={() => removeUrl(i)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {formError ? <p className="mt-4 text-sm text-red-600">{formError}</p> : null}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear canción'}
          </button>
          <Link
            to={isCanonical ? (isEdit ? `/admin/songs/${id}` : '/admin/songs') : isEdit ? `/songs/${id}` : '/songs'}
            className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
