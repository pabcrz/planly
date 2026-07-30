import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { parseChordPro } from '@/lib/chordpro/parser'
import { ChordProRenderer } from '@/lib/chordpro/renderer'
import { transposeChord } from '@/lib/transposition/transposer'
import { getPublicService, getPublicSongLyrics } from '@/services/publicService'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

type ViewMode = 'lyrics' | 'chords'

const VIEW_MODE_STORAGE_KEY = 'planly:public-lyrics-mode'

// Default is lyrics-only for readability during a service; the visitor's
// toggle choice is remembered across songs via localStorage.
function readInitialMode(): ViewMode {
  try {
    return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'chords' ? 'chords' : 'lyrics'
  } catch {
    return 'lyrics'
  }
}

export function PublicLyrics() {
  const { serviceId, versionId } = useParams<{ serviceId: string; versionId: string }>()

  // Transpose is transient useState — it resets on reload and never persists
  // (spec: in-view-transposition). The view mode persists only in localStorage
  // (spec: view-toggle). Neither touches the database.
  const [semitones, setSemitones] = useState(0)
  const [mode, setMode] = useState<ViewMode>(readInitialMode)

  const serviceQuery = useQuery({
    queryKey: ['publicService', serviceId],
    queryFn: () => getPublicService(serviceId!),
    enabled: !!serviceId,
  })

  const churchId = serviceQuery.data?.church_id
  const lyricsQuery = useQuery({
    queryKey: ['publicLyrics', versionId, churchId ?? null],
    queryFn: () => getPublicSongLyrics(versionId!, churchId),
    enabled: !!versionId && serviceQuery.isSuccess,
  })

  const document = useMemo(
    () => (lyricsQuery.data ? parseChordPro(lyricsQuery.data.chordpro_content) : null),
    [lyricsQuery.data],
  )

  function changeMode(next: ViewMode) {
    setMode(next)
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next)
    } catch {
      // Storage disabled (private browsing): the preference just won't persist.
    }
  }

  if (serviceQuery.isLoading || lyricsQuery.isLoading) {
    return <LoadingSpinner label="Loading lyrics…" />
  }

  if (lyricsQuery.error) {
    return <EmptyState title="Could not load lyrics" message={lyricsQuery.error.message} />
  }

  const lyrics = lyricsQuery.data
  if (!lyrics || !document) {
    return (
      <EmptyState
        title="Lyrics unavailable"
        message="This song isn't available for public viewing."
        action={
          <Link to={`/s/${serviceId}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Back to setlist
          </Link>
        }
      />
    )
  }

  // transposeChord normalizes flats to sharps, so at 0 semitones we show the
  // original key as written.
  const displayKey = lyrics.key ? (semitones === 0 ? lyrics.key : transposeChord(lyrics.key, semitones)) : null

  return (
    <div className="pt-2">
      <Link
        to={`/s/${serviceId}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← Back to setlist
      </Link>

      <header className="mt-1">
        {lyrics.title ? <h1 className="text-2xl font-semibold tracking-tight">{lyrics.title}</h1> : null}
        <p className="mt-1 text-sm text-gray-500">{lyrics.version_name}</p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mt-3 border-y border-gray-100 bg-white px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Transpose">
            <button
              type="button"
              onClick={() => setSemitones((s) => s - 1)}
              aria-label="Transpose down"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-200 text-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              −
            </button>
            <span className="min-w-16 text-center text-sm font-semibold text-gray-900" aria-live="polite">
              {displayKey ?? '—'}
            </span>
            <button
              type="button"
              onClick={() => setSemitones((s) => s + 1)}
              aria-label="Transpose up"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-200 text-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => changeMode(mode === 'lyrics' ? 'chords' : 'lyrics')}
            aria-pressed={mode === 'chords'}
            className="inline-flex min-h-11 items-center rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {mode === 'lyrics' ? 'Show chords' : 'Lyrics only'}
          </button>
        </div>
      </div>

      <div className="mt-4 text-lg">
        <ChordProRenderer document={document} mode={mode} semitones={semitones} />
      </div>
    </div>
  )
}
