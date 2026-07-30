import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getSongs } from '@/services/songService'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { SongCard } from './SongCard'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

export function SongList() {
  const { activeChurchId, activeMembership } = useChurch()
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false

  const filters = useMemo(
    () => ({ search: search.trim() || undefined, tag: tag || undefined }),
    [search, tag],
  )

  const { data: songs, isLoading, error } = useQuery({
    queryKey: ['songs', activeChurchId, filters],
    queryFn: () => getSongs(activeChurchId!, filters),
    enabled: !!activeChurchId,
  })

  // Unfiltered fetch so the tag cloud keeps all options while filtering.
  const { data: allSongs } = useQuery({
    queryKey: ['songs', activeChurchId, 'tags'],
    queryFn: () => getSongs(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const song of allSongs ?? []) for (const t of song.tags) set.add(t)
    return [...set].sort()
  }, [allSongs])

  return (
    <div>
      <PageHeader
        title="Songs"
        description="Your church catalog and the canonical library."
        action={
          canManage ? (
            <Link
              to="/songs/new"
              className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              New song
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 px-4 pb-4 md:flex-row md:px-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or author"
          className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none md:max-w-xs"
        />
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pb-6 md:px-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState title="Could not load songs" message={error.message} />
        ) : !songs || songs.length === 0 ? (
          <EmptyState
            title="No songs found"
            message={
              filters.search || filters.tag
                ? 'Try a different search or tag.'
                : 'Add your first song to start building the catalog.'
            }
            action={
              canManage && !filters.search && !filters.tag ? (
                <Link
                  to="/songs/new"
                  className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  New song
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {songs.map((song) => (
              <li key={song.id}>
                <SongCard song={song} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
