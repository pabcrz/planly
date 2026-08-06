import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useChurch } from '@/app/providers/ChurchProvider'
import type { MembershipWithPerson } from '@/services/peopleService'
import { updatePersonRolesAndProfile } from '@/services/peopleService'
import { RoleConfigDialog } from './RoleConfigDialog'
import { Settings } from 'lucide-react'

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

interface PersonRolesDialogProps {
  open: boolean
  member: MembershipWithPerson | null
  availableRoles: string[]
  onClose: () => void
}

export function PersonRolesDialog({ open, member, availableRoles, onClose }: PersonRolesDialogProps) {
  const { activeChurchId } = useChurch()
  const queryClient = useQueryClient()
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showRoleConfig, setShowRoleConfig] = useState(false)

  const catalog = availableRoles.length > 0 ? availableRoles : DEFAULT_ROLES

  useEffect(() => {
    if (member) {
      setSelectedRoles(member.person?.musical_roles || [])
      setDisplayName(member.person?.display_name || '')
    }
  }, [member])

  const mutation = useMutation({
    mutationFn: async (roles: string[]) => {
      if (!member) return
      return updatePersonRolesAndProfile(member.id, {
        display_name: displayName,
        musical_roles: roles,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['people', activeChurchId] })
      onClose()
    },
    onError: () => setError('Error al actualizar los roles de este miembro.'),
  })

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate(selectedRoles)
  }

  if (!member) return null

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 max-h-[85vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Asignar Roles Ministeriales
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Selecciona qué funciones ministeriales o instrumentos realiza este miembro en el equipo de la iglesia.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Nombre del Miembro</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ej. Juan Pérez"
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-xs font-semibold text-gray-700">Roles disponibles en la Iglesia</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRoleConfig(true)}
              className="gap-1 text-indigo-600 hover:text-indigo-800"
            >
              <Settings className="h-3.5 w-3.5" /> Editar catálogo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2.5 bg-gray-50/40">
            {catalog.map((role) => {
              const isSelected = selectedRoles.includes(role)
              return (
                <label
                  key={role}
                  className={`flex items-center gap-2 cursor-pointer p-2 rounded-md border text-xs font-medium select-none transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate">{role}</span>
                </label>
              )
            })}
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-2">
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
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Guardando…' : 'Guardar asignaciones'}
          </Button>
        </div>
      </form>
      <RoleConfigDialog open={showRoleConfig} onClose={() => setShowRoleConfig(false)} />
    </Modal>
  )
}
