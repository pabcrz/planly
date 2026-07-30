import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import {
  addSetlistItem,
  freezeSetlist,
  getSetlistItems,
  removeSetlistItem,
  reorderSetlistItem,
  updateSetlistItem,
} from '@/services/serviceService'
import { getRepertoire, getSong } from '@/services/songService'
import type { Setlist, Song, SongVersion } from '@/types/models'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { SetlistItemRow } from './SetlistItem'

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
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not reorder'),
  })

  const keyMutation = useMutation({
    mutationFn: ({ itemId, key }: { itemId: string; key: string }) => updateSetlistItem(itemId, { key }),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not update key'),
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeSetlistItem(itemId),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not remove song'),
  })

  const freezeMutation = useMutation({
    mutationFn: () => freezeSetlist(setlist.service_id),
    onSuccess: async () => {
      setFreezeOpen(false)
      await invalidate()
    },
    onError: (err) => {
      setFreezeOpen(false)
      setActionError(err instanceof Error ? err.message : 'Could not freeze setlist')
    },
  })

  return (
    <section className="px-4 pb-6 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          Setlist
          {isFrozen ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Frozen
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add song
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setFreezeOpen(true)}
              className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Freeze
            </button>
          ) : null}
        </div>
      </div>

      {actionError ? <p className="mt-2 text-sm text-red-600">{actionError}</p> : null}

      <div className="mt-3">
        {isLoading ? <LoadingSpinner /> : null}
        {error ? <EmptyState title="Could not load setlist" message={error.message} /> : null}
        {items && items.length === 0 ? (
          <EmptyState title="No songs yet" message={canEdit ? 'Add a song from your repertoire to start the setlist.' : undefined} />
        ) : null}
        {items && items.length > 0 ? (
          <ul className="flex flex-col gap-2">
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
        title="Freeze setlist"
        message="Freezing snapshots the current songs and locks the setlist for editing. This cannot be undone."
        confirmLabel="Freeze"
        onConfirm={() => freezeMutation.mutate()}
        onCancel={() => setFreezeOpen(false)}
      />
    </section>
  )
}

// --- Song picker: repertoire search → version select → key ---

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

  const { data: repertoire, isLoading } = useQuery({
    queryKey: ['repertoire', activeChurchId],
    queryFn: () => getRepertoire(activeChurchId!),
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
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Could not add song'),
  })

  const term = search.trim().toLowerCase()
  const matches = (repertoire ?? [])
    .map((entry) => entry.song)
    .filter(
      (song) =>
        !term || song.title.toLowerCase().includes(term) || (song.author ?? '').toLowerCase().includes(term),
    )

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="w-full max-w-lg rounded-lg p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-gray-900">Add song to setlist</h2>

        {!selectedSong ? (
          <>
            <input
              type="search"
              aria-label="Search repertoire"
              placeholder="Search by title or author"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
            {isLoading ? <LoadingSpinner /> : null}
            {!isLoading && matches.length === 0 ? (
              <EmptyState title="No songs found" message="Your church repertoire has no matching songs." />
            ) : null}
            <ul className="flex flex-col gap-1">
              {matches.map((song) => (
                <li key={song.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSong(song)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-indigo-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{song.title}</span>
                      {song.author ? <span className="block truncate text-xs text-gray-500">{song.author}</span> : null}
                    </span>
                    <span className="text-gray-400">→</span>
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
              className="self-start text-sm text-indigo-600 hover:underline"
            >
              ← Back to search
            </button>
            <p className="text-sm font-medium text-gray-900">{selectedSong.title} — choose a version</p>
            {!songDetail ? <LoadingSpinner /> : null}
            {songDetail && songDetail.versions.length === 0 ? (
              <EmptyState title="No versions" message="This song has no versions yet." />
            ) : null}
            <ul className="flex flex-col gap-1">
              {songDetail?.versions.map((version) => (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedVersion(version)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-indigo-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{version.version_name}</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
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
              className="self-start text-sm text-indigo-600 hover:underline"
            >
              ← Back to versions
            </button>
            <p className="text-sm text-gray-700">
              {selectedSong.title} · {selectedVersion.version_name}
            </p>
            <div>
              <label htmlFor="setlist-item-key" className="mb-1 block text-sm font-medium text-gray-700">
                Key *
              </label>
              <input
                id="setlist-item-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="setlist-item-notes" className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <input
                id="setlist-item-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. shortened bridge"
                className={inputClass}
              />
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Adding…' : 'Add to setlist'}
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
              Cancel
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
