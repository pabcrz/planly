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
}

export function SongVersions({ songId, versions, canManage }: SongVersionsProps) {
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
    return <p className="text-sm text-gray-500">No versions yet.</p>
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
            onToggle={() => setExpandedId((cur) => (cur === version.id ? null : version.id))}
            onDelete={() => setPendingDelete(version)}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete version"
        message={`Delete "${pendingDelete?.version_name}"? This cannot be undone.`}
        confirmLabel="Delete"
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
}

function VersionRow({ version, expanded, canManage, onToggle, onDelete }: VersionRowProps) {
  const document = useMemo(
    () => (expanded ? parseChordPro(version.chordpro_content) : null),
    [expanded, version.chordpro_content],
  )

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {version.key}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900">
              {version.version_name}
            </span>
            {version.notes ? (
              <span className="block truncate text-xs text-gray-500">{version.notes}</span>
            ) : null}
          </span>
          <span className="shrink-0 text-xs text-gray-400">{expanded ? 'Hide' : 'View'}</span>
        </button>
        {canManage ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        ) : null}
      </div>
      {expanded && document ? (
        <div className="border-t border-gray-100 p-4">
          <ChordProRenderer document={document} mode="chords" />
        </div>
      ) : null}
    </li>
  )
}
