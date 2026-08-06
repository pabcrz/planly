import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteVersion } from '@/services/songService'
import { parseChordPro } from '@/lib/chordpro/parser'
import { ChordProRenderer } from '@/lib/chordpro/renderer'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { SongVersion } from '@/types/models'

interface SongVersionsProps {
  songId: string
  versions: SongVersion[]
  canManage: boolean
  onEdit: (version: SongVersion) => void
}

export function SongVersions({ songId, versions, canManage, onEdit }: SongVersionsProps) {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SongVersion | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (versionId: string) => deleteVersion(versionId),
    onSuccess: async () => {
      setPendingDelete(null)
      await queryClient.invalidateQueries({ queryKey: ['song', songId] })
    },
  })

  if (versions.length === 0) {
    return <p className="text-sm text-gray-500">Aún no hay versiones.</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {versions.map((version) => (
          <VersionRow
            key={version.id}
            version={version}
            expanded={expandedId === version.id}
            canManage={canManage}
            onEdit={() => onEdit(version)}
            onToggle={() => setExpandedId((cur) => (cur === version.id ? null : version.id))}
            onDelete={() => setPendingDelete(version)}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar versión"
        message={`¿Eliminar "${pendingDelete?.version_name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

interface VersionRowProps {
  version: SongVersion
  expanded: boolean
  canManage: boolean
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
}

function VersionRow({ version, expanded, canManage, onToggle, onDelete, onEdit }: VersionRowProps) {
  const [viewMode, setViewMode] = useState<'chords' | 'lyrics'>('chords')
  const document = useMemo(
    () => (expanded ? parseChordPro(version.chordpro_content) : null),
    [expanded, version.chordpro_content],
  )

  return (
    <li className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-3.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
            {version.key}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900">
              {version.version_name}
            </span>
            {version.notes ? (
              <span className="block truncate text-xs text-gray-500">{version.notes}</span>
            ) : null}
          </span>
          <span className="shrink-0 text-xs font-medium text-indigo-600">{expanded ? 'Ocultar' : 'Ver versión'}</span>
        </button>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-1 border-l border-gray-200 pl-3">
            <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">Editar</button>
            <button type="button" onClick={onDelete} className="inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Eliminar</button>
          </div>
        ) : null}
      </div>
      {expanded && document ? (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-200/60 pb-3">
            <button
              type="button"
              onClick={() => setViewMode('chords')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'chords' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
            >
              Acordes y Letra
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lyrics')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'lyrics' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
            >
              Solo Letra
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <ChordProRenderer document={document} mode={viewMode} />
          </div>
        </div>
      ) : null}
    </li>
  )
}
