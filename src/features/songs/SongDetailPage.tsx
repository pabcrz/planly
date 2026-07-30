import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import {
  adoptSong,
  archiveSong,
  deleteSong,
  getRepertoire,
  getSong,
} from '@/services/songService'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SongVersions } from './SongVersions'
import { VersionForm } from './VersionForm'

export function SongDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeChurchId, activeMembership } = useChurch()
  const [showVersionForm, setShowVersionForm] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: song, isLoading, error } = useQuery({
    queryKey: ['song', id],
    queryFn: () => getSong(id!),
    enabled: !!id,
  })

  const { data: repertoire } = useQuery({
    queryKey: ['repertoire', activeChurchId],
    queryFn: () => getRepertoire(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const repertoireEntry = repertoire?.find((entry) => entry.song_id === id) ?? null
  const isChurchAdmin = activeMembership?.role === 'church_admin'
  // RLS: church-owned songs are admin-editable; canonical songs are curator-only.
  const canEditSong = isChurchAdmin && !!song && song.church_id === activeChurchId

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['songs'] })
    await queryClient.invalidateQueries({ queryKey: ['song', id] })
    await queryClient.invalidateQueries({ queryKey: ['repertoire', activeChurchId] })
  }

  const adoptMutation = useMutation({
    mutationFn: () => adoptSong(activeChurchId!, id!),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Adopt failed'),
  })

  const archiveMutation = useMutation({
    mutationFn: () => archiveSong(activeChurchId!, id!),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Archive failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSong(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] })
      navigate('/songs')
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Delete failed'),
  })

  if (isLoading) return <LoadingSpinner />
  if (error || !song) {
    return (
      <EmptyState
        title="Song not found"
        message={error?.message ?? 'This song does not exist or is not visible to your church.'}
        action={
          <Link to="/songs" className="text-sm font-medium text-indigo-600 hover:underline">
            Back to songs
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={song.title}
        description={song.author ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!repertoireEntry ? (
              <button
                type="button"
                onClick={() => adoptMutation.mutate()}
                disabled={adoptMutation.isPending}
                className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Adopt
              </button>
            ) : null}
            {repertoireEntry && isChurchAdmin ? (
              <button
                type="button"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Archive
              </button>
            ) : null}
            {canEditSong ? (
              <>
                <Link
                  to={`/songs/${song.id}/edit`}
                  className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="px-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          {song.tempo ? (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {song.tempo} BPM
            </span>
          ) : null}
          {song.is_canonical ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Canonical
            </span>
          ) : null}
          {repertoireEntry ? (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              In repertoire
            </span>
          ) : null}
          {song.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Versions</h2>
            {canEditSong && !showVersionForm ? (
              <button
                type="button"
                onClick={() => setShowVersionForm(true)}
                className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Add version
              </button>
            ) : null}
          </div>
          {showVersionForm ? (
            <div className="mb-4">
              <VersionForm
                songId={song.id}
                onSaved={() => setShowVersionForm(false)}
                onCancel={() => setShowVersionForm(false)}
              />
            </div>
          ) : null}
          <SongVersions songId={song.id} versions={song.versions} canManage={canEditSong} />
        </section>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete song"
        message={`Delete "${song.title}" and all its versions? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmingDelete(false)
          deleteMutation.mutate()
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}
