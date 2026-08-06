import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getChurchSettings, updateChurchMusicalRoles } from '@/services/peopleService'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const DEFAULT_ROLES = [
  'Director de alabanza',
  'Vocalista',
  'Guitarra acústica',
  'Guitarra eléctrica',
  'Bajo',
  'Batería',
  'Teclado',
  'Pastor',
  'Líder',
]

interface RoleConfigDialogProps {
  open: boolean
  onClose: () => void
}

export function RoleConfigDialog({ open, onClose }: RoleConfigDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { activeChurchId } = useChurch()
  const queryClient = useQueryClient()
  const [roles, setRoles] = useState<string[]>([])
  const [newRole, setNewRole] = useState('')
  const [error, setError] = useState<string | null>(null)

  // State for inline role renaming/editing
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['churchSettings', activeChurchId],
    queryFn: () => getChurchSettings(activeChurchId!),
    enabled: open && !!activeChurchId,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setEditingIdx(null)
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (settings) {
      if (settings.musical_roles && settings.musical_roles.length > 0) {
        setRoles(settings.musical_roles)
      } else {
        setRoles(DEFAULT_ROLES)
      }
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: (updated: string[]) => updateChurchMusicalRoles(activeChurchId!, updated),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['churchSettings', activeChurchId] })
      await queryClient.invalidateQueries({ queryKey: ['church-settings', activeChurchId] })
      onClose()
    },
    onError: () => setError('No se pudieron guardar los roles personalizados de la iglesia.'),
  })

  const addRole = () => {
    const trimmed = newRole.trim()
    if (!trimmed) return
    if (!roles.includes(trimmed)) {
      setRoles([...roles, trimmed])
      setNewRole('')
    }
  }

  const removeRole = (targetIdx: number) => {
    setRoles(roles.filter((_, idx) => idx !== targetIdx))
    if (editingIdx === targetIdx) setEditingIdx(null)
  }

  const startEdit = (idx: number, currentName: string) => {
    setEditingIdx(idx)
    setEditValue(currentName)
  }

  const saveEdit = (idx: number) => {
    const trimmed = editValue.trim()
    if (!trimmed) return
    const nextRoles = [...roles]
    nextRoles[idx] = trimmed
    setRoles(nextRoles)
    setEditingIdx(null)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate(roles)
  }

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="w-full max-w-lg rounded-2xl p-0 shadow-2xl backdrop:bg-black/40 border border-gray-200 bg-white"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-5 p-6 max-h-[88vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Administrar Catálogo de Roles
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Crea nuevos roles, edita el nombre de los existentes o elimina aquellos que tu iglesia ya no necesite en el equipo.
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            {/* Quick add section */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Agregar nuevo rol o instrumento:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addRole()
                    }
                  }}
                  placeholder="Ej. Saxofón, Sonido, Traducción, Ujier..."
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addRole}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Editable role items list */}
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-gray-700">Roles actuales del catálogo ({roles.length}):</span>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                {roles.map((role, idx) => {
                  const isEditing = editingIdx === idx
                  return (
                    <div key={`${idx}-${role}`} className="flex items-center justify-between p-3 hover:bg-gray-50/80 transition-colors">
                      {isEditing ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveEdit(idx)
                              } else if (e.key === 'Escape') {
                                setEditingIdx(null)
                              }
                            }}
                            className="min-h-9 flex-1 rounded border border-indigo-400 px-2.5 py-1 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveEdit(idx)}
                            className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs hover:bg-emerald-200 transition-colors"
                            title="Confirmar cambio"
                          >
                            ✓ Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIdx(null)}
                            className="px-2.5 py-1 rounded bg-gray-200 text-gray-700 font-medium text-xs hover:bg-gray-300 transition-colors"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-gray-800 tracking-tight flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                            {role}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(idx, role)}
                              className="inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
                              title="Editar nombre del rol"
                            >
                              ✎ Editar
                            </button>
                            <button
                              type="button"
                              aria-label={`Eliminar rol ${role}`}
                              onClick={() => removeRole(idx)}
                              className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                              title="Eliminar del catálogo"
                            >
                              🗑 Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
                {roles.length === 0 ? (
                  <p className="p-6 text-center text-xs text-amber-600 font-medium">
                    El catálogo está vacío. Si guardas sin roles, se restablecerán los predeterminados del sistema.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">{error}</p> : null}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || isLoading}
            className="min-h-11 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-all hover:shadow-md"
          >
            {mutation.isPending ? 'Guardando catálogo…' : 'Guardar cambios del catálogo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
