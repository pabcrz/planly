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
import { Button } from '@/components/ui/Button'
import { SongVersions } from './SongVersions'
import { VersionForm } from './VersionForm'
import { MediaReferenceCard } from './MediaReferenceCard'
import { usePlatformAdmin } from '@/features/auth/platformAdmin'
import type { SongVersion } from '@/types/models'

export function SongDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeChurchId, activeMembership } = useChurch()
  const { data: isPlatformAdmin } = usePlatformAdmin()
  const [showVersionForm, setShowVersionForm] = useState(false)
  const [editingVersion, setEditingVersion] = useState<SongVersion | null>(null)
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
  const isCanonicalAdmin = isPlatformAdmin === true && song?.is_canonical === true && song.church_id === null
  const canEditSong = isCanonicalAdmin || (isChurchAdmin && !!song && song.church_id === activeChurchId)
  const songBasePath = isCanonicalAdmin ? '/admin/songs' : '/songs'

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['songs'] })
    await queryClient.invalidateQueries({ queryKey: ['song', id] })
    await queryClient.invalidateQueries({ queryKey: ['repertoire', activeChurchId] })
  }

  const adoptMutation = useMutation({
    mutationFn: () => adoptSong(activeChurchId!, id!),
    onSuccess: invalidate,
    onError: () => setActionError('No se pudo adoptar la canción.'),
  })

  const archiveMutation = useMutation({
    mutationFn: () => archiveSong(activeChurchId!, id!),
    onSuccess: invalidate,
    onError: () => setActionError('No se pudo archivar la canción.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSong(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] })
      navigate(songBasePath)
    },
    onError: () => setActionError('No se pudo eliminar la canción.'),
  })

  if (isLoading) return <LoadingSpinner />
  if (error || !song) {
    return (
      <EmptyState
        title="No encontramos la canción"
        message="Esta canción no existe o no está disponible para tu iglesia."
        action={
          <Link to="/songs" className="text-sm font-medium text-indigo-600 hover:underline">
            Volver a canciones
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
              <Button
                type="button"
                variant="primary"
                onClick={() => adoptMutation.mutate()}
                disabled={adoptMutation.isPending}
              >
                Añadir a biblioteca
              </Button>
            ) : null}
            {repertoireEntry && isChurchAdmin ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
              >
                Archivar
              </Button>
            ) : null}
            {canEditSong ? (
              <>
                <Link
                  to={`${songBasePath}/${song.id}/edit`}
                  className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Editar
                </Link>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Eliminar
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="px-4 pb-12 md:px-6 max-w-6xl">
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          {song.tempo ? (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
              {song.tempo} BPM
            </span>
          ) : null}
          {song.is_canonical ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/60">
              Canción Base
            </span>
          ) : null}
          {repertoireEntry ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
              En repertorio
            </span>
          ) : null}
          {song.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Versiones y tonos</h2>
              {canEditSong && !showVersionForm ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowVersionForm(true)}
                >
                  Agregar versión
                </Button>
              ) : null}
            </div>
            {showVersionForm || editingVersion ? (
              <div className="mb-2">
                <VersionForm
                  songId={song.id}
                  version={editingVersion}
                  onSaved={() => { setShowVersionForm(false); setEditingVersion(null) }}
                  onCancel={() => { setShowVersionForm(false); setEditingVersion(null) }}
                />
              </div>
            ) : null}
            <SongVersions songId={song.id} versions={song.versions} canManage={canEditSong} onEdit={setEditingVersion} />
          </div>

          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Archivos multimedia</h2>
            {!(Array.isArray(song.reference_urls) && song.reference_urls.length > 0) ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 text-center text-xs text-gray-500">
                No hay enlaces multimedia para esta canción.
              </div>
            ) : (
              (song.reference_urls as string[]).map((url: string, i: number) => (
                <MediaReferenceCard key={`${url}-${i}`} url={url} readOnly={true} />
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Eliminar canción"
        message={`¿Eliminar "${song.title}" y todas sus versiones? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
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
