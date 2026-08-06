import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getChurchSettings, updateChurchMusicalRoles } from '@/services/peopleService'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Plus, Check, X, Pencil, Trash2 } from 'lucide-react'

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
    if (open) {
      setEditingIdx(null)
    }
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
    <Modal open={open} onClose={onClose}>
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
                <Button
                  type="button"
                  variant="primary"
                  onClick={addRole}
                  className="shrink-0 gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
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
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => saveEdit(idx)}
                            className="gap-1"
                            title="Confirmar cambio"
                          >
                            <Check className="h-3.5 w-3.5" /> Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => setEditingIdx(null)}
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-gray-800 tracking-tight flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                            {role}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(idx, role)}
                              className="gap-1.5"
                              title="Editar nombre del rol"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              aria-label={`Eliminar rol ${role}`}
                              onClick={() => removeRole(idx)}
                              className="gap-1.5"
                              title="Eliminar del catálogo"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </Button>
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
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending || isLoading}
          >
            {mutation.isPending ? 'Guardando catálogo…' : 'Guardar cambios del catálogo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
