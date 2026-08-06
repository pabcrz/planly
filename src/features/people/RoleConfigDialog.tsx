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

  const { data: settings, isLoading } = useQuery({
    queryKey: ['churchSettings', activeChurchId],
    queryFn: () => getChurchSettings(activeChurchId!),
    enabled: open && !!activeChurchId,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
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

  const removeRole = (target: string) => {
    setRoles(roles.filter((r) => r !== target))
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
      className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/40 border border-gray-100"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-4 p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
          Catálogo de Roles Ministeriales
        </h2>
        <p className="text-xs text-gray-600">
          Personaliza los roles funcionales (instrumentos y ministerio) disponibles para asignar a los miembros en tu iglesia.
        </p>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
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
                placeholder="Ej. Sonido, Ujier, Violín..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={addRole}
                className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Agregar
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 px-3 py-1 text-xs font-semibold text-indigo-900"
                >
                  {role}
                  <button
                    type="button"
                    aria-label={`Eliminar rol ${role}`}
                    onClick={() => removeRole(role)}
                    className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-100 hover:text-red-600 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {roles.length === 0 ? (
              <p className="text-xs text-amber-600 font-medium">
                No has dejado ningún rol. Si guardas, se usarán los roles predeterminados de la plataforma.
              </p>
            ) : null}
          </>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || isLoading}
            className="min-h-11 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {mutation.isPending ? 'Guardando…' : 'Guardar roles'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
