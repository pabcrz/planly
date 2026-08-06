import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getSongs } from '@/services/songService'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { SongCard } from './SongCard'
import { usePlatformAdmin } from '@/features/auth/platformAdmin'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])
const PAGE_SIZE = 10

export function SongList() {
  const { activeChurchId, activeMembership } = useChurch()
  const { data: isPlatformAdmin } = usePlatformAdmin()
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const isCanonicalCatalog = !activeChurchId && isPlatformAdmin === true
  const canManage = isCanonicalCatalog || (activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false)

  const filters = useMemo(
    () => ({ search: search.trim() || undefined, tag: tag || undefined }),
    [search, tag],
  )

  const { data: songs, isLoading, error } = useQuery({
    queryKey: ['songs', activeChurchId, filters],
    queryFn: () => getSongs(activeChurchId, filters),
    enabled: !!activeChurchId || isCanonicalCatalog,
  })

  const { data: allSongs } = useQuery({
    queryKey: ['songs', activeChurchId, 'tags'],
    queryFn: () => getSongs(activeChurchId),
    enabled: !!activeChurchId || isCanonicalCatalog,
  })

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const song of allSongs ?? []) for (const t of song.tags) set.add(t)
    return [...set].sort()
  }, [allSongs])

  const totalSongs = songs ? songs.length : 0
  const totalPages = Math.ceil(totalSongs / PAGE_SIZE) || 1
  const paginatedSongs = useMemo(() => {
    if (!songs) return []
    const start = (currentPage - 1) * PAGE_SIZE
    return songs.slice(start, start + PAGE_SIZE)
  }, [songs, currentPage])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const handleTagChange = (val: string) => {
    setTag(val)
    setCurrentPage(1)
  }

  return (
    <div>
      <PageHeader
        title={isCanonicalCatalog ? 'Catálogo base global' : 'Canciones y repertorio'}
        description={isCanonicalCatalog ? 'Administra las canciones base globales de Planly.' : 'Repertorio de tu iglesia y catálogo general.'}
        action={
          canManage ? (
            <Link
              to={isCanonicalCatalog ? '/admin/songs/new' : '/songs/new'}
              className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              {isCanonicalCatalog ? 'Nueva canción base' : 'Nueva canción'}
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 px-4 pb-4 md:flex-row md:px-6 max-w-6xl">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por título o autor..."
          className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none md:max-w-xs"
        />
        <select
          value={tag}
          onChange={(e) => handleTagChange(e.target.value)}
          className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Todas las etiquetas</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pb-12 md:px-6 max-w-6xl">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState title="No fue posible cargar las canciones" message="Intenta de nuevo." />
        ) : !songs || songs.length === 0 ? (
          <EmptyState
            title="No hay canciones"
            message={
              filters.search || filters.tag
                ? 'Prueba otra búsqueda o etiqueta.'
                : 'Agrega tu primera canción para comenzar a crear el catálogo.'
            }
            action={
              canManage && !filters.search && !filters.tag ? (
                <Link
                  to={isCanonicalCatalog ? '/admin/songs/new' : '/songs/new'}
                  className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  {isCanonicalCatalog ? 'Nueva canción base' : 'Nueva canción'}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col gap-3">
              {paginatedSongs.map((song) => (
                <li key={song.id}>
                  <SongCard song={song} />
                </li>
              ))}
            </ul>
            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-1.5 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex min-h-10 items-center px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  « Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-h-10 min-w-10 rounded-md text-xs font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex min-h-10 items-center px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  Siguiente »
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
