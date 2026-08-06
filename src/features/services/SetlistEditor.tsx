import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Lock, ListMusic } from 'lucide-react'
import { useChurch } from '@/app/providers/ChurchProvider'
import {
  addSetlistItem,
  freezeSetlist,
  getSetlistItems,
  removeSetlistItem,
  reorderSetlistItem,
  updateSetlistItem,
} from '@/services/serviceService'
import { getSongs, getSong } from '@/services/songService'
import type { Setlist, Song, SongVersion } from '@/types/models'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { SetlistItemRow } from './SetlistItem'
import { KeyPicker } from '@/features/songs/KeyPicker'

interface SetlistEditorProps {
  setlist: Setlist
  canManage: boolean
}

export function SetlistEditor({ setlist, canManage }: SetlistEditorProps) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [freezeOpen, setFreezeOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isFrozen = !!setlist.frozen_at
  const canEdit = canManage && !isFrozen

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['setlistItems', setlist.id],
    queryFn: () => getSetlistItems(setlist.id),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['setlistItems', setlist.id] })
    await queryClient.invalidateQueries({ queryKey: ['setlist'] })
  }

  const moveMutation = useMutation({
    mutationFn: ({ itemId, newSortOrder }: { itemId: string; newSortOrder: number }) =>
      reorderSetlistItem(itemId, newSortOrder),
    onSuccess: invalidate,
    onError: () => setActionError('No se pudo reordenar el setlist.'),
  })

  const keyMutation = useMutation({
    mutationFn: ({ itemId, key }: { itemId: string; key: string }) => updateSetlistItem(itemId, { key }),
    onSuccess: invalidate,
    onError: () => setActionError('No se pudo actualizar la tonalidad.'),
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeSetlistItem(itemId),
    onSuccess: invalidate,
    onError: () => setActionError('No se pudo eliminar la canción.'),
  })

  const freezeMutation = useMutation({
    mutationFn: () => freezeSetlist(setlist.service_id),
    onSuccess: async () => {
      setFreezeOpen(false)
      await invalidate()
    },
    onError: () => {
      setFreezeOpen(false)
      setActionError('No se pudo congelar el setlist.')
    },
  })

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ListMusic className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Canciones en el orden
              {isFrozen ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                  <Lock className="h-3 w-3" />
                  Congelado
                </span>
              ) : null}
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              {items ? `${items.length} ${items.length === 1 ? 'canción agregada' : 'canciones agregadas'}` : 'Cargando...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Agregar canción
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setFreezeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-gray-500" />
              Congelar setlist
            </button>
          ) : null}
        </div>
      </div>

      {actionError ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{actionError}</p> : null}

      <div className="mt-5">
        {isLoading ? <LoadingSpinner /> : null}
        {error ? <EmptyState title="No fue posible cargar el setlist" message="Intenta de nuevo." /> : null}
        {items && items.length === 0 ? (
          <div className="py-8">
            <EmptyState title="Aún no hay canciones en el setlist" message={canEdit ? 'Haz clic en "Agregar canción" para seleccionar temas del catálogo.' : undefined} />
          </div>
        ) : null}
        {items && items.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {items.map((item, index) => (
              <SetlistItemRow
                key={item.id}
                item={item}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                canEdit={canEdit}
                onMove={(itemId, newSortOrder) => moveMutation.mutate({ itemId, newSortOrder })}
                onUpdateKey={(itemId, key) => keyMutation.mutate({ itemId, key })}
                onRemove={(itemId) => removeMutation.mutate(itemId)}
              />
            ))}
          </ul>
        ) : null}
      </div>

      <SongPickerDialog
        open={pickerOpen}
        setlistId={setlist.id}
        onClose={() => setPickerOpen(false)}
        onAdded={invalidate}
      />

      <ConfirmDialog
        open={freezeOpen}
        title="Congelar setlist"
        message="Congelar guarda una copia de las canciones actuales y bloquea la edición. Esta acción no se puede deshacer."
        confirmLabel="Congelar"
        onConfirm={() => freezeMutation.mutate()}
        onCancel={() => setFreezeOpen(false)}
      />
    </div>
  )
}

// --- Song picker: catalog search → version select → key ---

interface SongPickerDialogProps {
  open: boolean
  setlistId: string
  onClose: () => void
  onAdded: () => Promise<void>
}

function SongPickerDialog({ open, setlistId, onClose, onAdded }: SongPickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { activeChurchId } = useChurch()
  const [search, setSearch] = useState('')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<SongVersion | null>(null)
  const [key, setKey] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: songs, isLoading } = useQuery({
    queryKey: ['songs', activeChurchId],
    queryFn: () => getSongs(activeChurchId!),
    enabled: open && !!activeChurchId,
  })

  const { data: songDetail } = useQuery({
    queryKey: ['song', selectedSong?.id],
    queryFn: () => getSong(selectedSong!.id),
    enabled: open && !!selectedSong,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelectedSong(null)
    setSelectedVersion(null)
    setKey('')
    setNotes('')
    setFormError(null)
  }, [open])

  // Default the item key to the version's key when a version is picked.
  useEffect(() => {
    if (selectedVersion) setKey(selectedVersion.key)
  }, [selectedVersion])

  const addMutation = useMutation({
    mutationFn: () =>
      addSetlistItem({
        setlist_id: setlistId,
        song_id: selectedSong!.id,
        song_version_id: selectedVersion!.id,
        key,
        notes: notes.trim() || null,
      }),
    onSuccess: async () => {
      await onAdded()
      onClose()
    },
    onError: (error: any) => {
      console.error('Error adding setlist item:', error)
      const msg = error?.message || error?.error_description || error?.details || (typeof error === 'string' ? error : 'Error desconocido al agregar')
      setFormError(`No se pudo agregar: ${msg}`)
    },
  })

  const term = search.trim().toLowerCase()
  const matches = (songs ?? []).filter(
    (song) =>
      !term || song.title.toLowerCase().includes(term) || (song.author ?? '').toLowerCase().includes(term),
  )

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="m-auto w-full max-w-xl rounded-xl p-0 shadow-xl backdrop:bg-black/40 border border-gray-100"
    >
      <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
          Agregar canción al setlist
        </h2>

        {!selectedSong ? (
          <>
            <input
              type="search"
              aria-label="Buscar en el catálogo de canciones"
              placeholder="Buscar por título o autor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
            {isLoading ? <LoadingSpinner /> : null}
            {!isLoading && matches.length === 0 ? (
              <EmptyState title="No hay canciones" message="No se encontraron canciones que coincidan en el catálogo." />
            ) : null}
            <ul className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {matches.map((song) => (
                <li key={song.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSong(song)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-gray-100 px-3.5 py-2.5 text-left hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors shadow-2xs"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{song.title}</span>
                      {song.author ? <span className="block truncate text-xs text-gray-500 mt-0.5">{song.author}</span> : null}
                    </span>
                    <span className="text-indigo-600 text-base font-bold">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : !selectedVersion ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedSong(null)}
              className="self-start text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center min-h-9"
            >
              ← Volver a la búsqueda
            </button>
            <p className="text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedSong.title} — Elige una versión</p>
            {!songDetail ? <LoadingSpinner /> : null}
            {songDetail && songDetail.versions.length === 0 ? (
              <EmptyState title="No hay versiones" message="Esta canción aún no tiene versiones configuradas." />
            ) : null}
            <ul className="flex flex-col gap-1.5">
              {songDetail?.versions.map((version) => (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedVersion(version)}
                    className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border border-gray-100 px-3.5 py-2.5 text-left hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors shadow-2xs"
                  >
                    <span className="text-sm font-semibold text-gray-900">{version.version_name}</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                      {version.key}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              setFormError(null)
              addMutation.mutate()
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedVersion(null)}
              className="self-start text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center min-h-9"
            >
              ← Volver a las versiones
            </button>
            <div className="rounded-lg bg-indigo-50/60 p-3 border border-indigo-100">
              <p className="text-sm font-bold text-indigo-950">
                {selectedSong.title}
              </p>
              <p className="text-xs text-indigo-700 font-medium">
                Versión: {selectedVersion.version_name} · Tonalidad original: <strong className="font-bold">{selectedVersion.key}</strong>
              </p>
            </div>
            <div>
              <label htmlFor="setlist-item-key" className="mb-1.5 block text-sm font-semibold text-gray-800">
                Tonalidad para este servicio *
              </label>
              <KeyPicker value={key} onChange={setKey} id="setlist-item-key" />
            </div>
            <div>
              <label htmlFor="setlist-item-notes" className="mb-1 block text-sm font-semibold text-gray-700">
                Notas (opcional)
              </label>
              <input
                id="setlist-item-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Empezar con solo de teclado, puente corto..."
                className={inputClass}
              />
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={addMutation.isPending || !key}
                className="min-h-11 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                {addMutation.isPending ? 'Agregando…' : 'Agregar al setlist'}
              </button>
            </div>
          </form>
        )}

        {selectedSong ? null : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
