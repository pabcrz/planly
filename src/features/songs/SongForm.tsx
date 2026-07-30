import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { useChurch } from '@/app/providers/ChurchProvider'
import { createSong, getSong, updateSong } from '@/services/songService'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

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
  const queryClient = useQueryClient()
  const { activeChurchId } = useChurch()

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', id],
    queryFn: () => getSong(id!),
    enabled: isEdit,
  })

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [tempo, setTempo] = useState('')
  const [tags, setTags] = useState('')
  const [referenceUrls, setReferenceUrls] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!song) return
    setTitle(song.title)
    setAuthor(song.author ?? '')
    setTempo(song.tempo ? String(song.tempo) : '')
    setTags(song.tags.join(', '))
    setReferenceUrls(Array.isArray(song.reference_urls) ? song.reference_urls.join('\n') : '')
  }, [song])

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        title,
        author: author.trim() || null,
        tempo: tempo.trim() ? Number.parseInt(tempo, 10) : null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        reference_urls: referenceUrls.split('\n').map((u) => u.trim()).filter(Boolean),
      }
      if (isEdit) return updateSong(id!, input)
      return createSong({ ...input, church_id: activeChurchId!, is_canonical: false })
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] })
      await queryClient.invalidateQueries({ queryKey: ['song'] })
      navigate(`/songs/${saved.id}`)
    },
    onError: (error) => {
      const zodErrors = toFieldErrors(error)
      if (zodErrors) {
        setFieldErrors(zodErrors)
        setFormError(null)
      } else {
        setFieldErrors({})
        setFormError(error instanceof Error ? error.message : 'Something went wrong')
      }
    },
  })

  if (isEdit && isLoading) return <LoadingSpinner />

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700'
  const errorClass = 'mt-1 text-xs text-red-600'

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit song' : 'New song'} />
      <form
        className="flex max-w-xl flex-col gap-4 px-4 pb-6 md:px-6"
        onSubmit={(e) => {
          e.preventDefault()
          setFieldErrors({})
          setFormError(null)
          mutation.mutate()
        }}
      >
        <div>
          <label htmlFor="title" className={labelClass}>
            Title *
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            required
          />
          {fieldErrors.title ? <p className={errorClass}>{fieldErrors.title}</p> : null}
        </div>

        <div>
          <label htmlFor="author" className={labelClass}>
            Author
          </label>
          <input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={inputClass}
          />
          {fieldErrors.author ? <p className={errorClass}>{fieldErrors.author}</p> : null}
        </div>

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
            className={inputClass}
          />
          {fieldErrors.tempo ? <p className={errorClass}>{fieldErrors.tempo}</p> : null}
        </div>

        <div>
          <label htmlFor="tags" className={labelClass}>
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="worship, advent, spanish"
            className={inputClass}
          />
          {fieldErrors.tags ? <p className={errorClass}>{fieldErrors.tags}</p> : null}
        </div>

        <div>
          <label htmlFor="reference_urls" className={labelClass}>
            Reference URLs (one per line)
          </label>
          <textarea
            id="reference_urls"
            value={referenceUrls}
            onChange={(e) => setReferenceUrls(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {fieldErrors.reference_urls ? (
            <p className={errorClass}>{fieldErrors.reference_urls}</p>
          ) : null}
        </div>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create song'}
          </button>
          <Link
            to={isEdit ? `/songs/${id}` : '/songs'}
            className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
