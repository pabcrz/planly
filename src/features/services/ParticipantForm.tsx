import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getPeople } from '@/services/peopleService'
import { addParticipant, addParticipantRole } from '@/services/serviceService'
import type { ParticipantWithDetails } from '@/services/serviceService'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// Suggested roles per user requirements; free-text roles can be added on top.
const SUGGESTED_ROLES = [
  'Director de alabanza',
  'Vocalista',
  'Guitarra acústica',
  'Guitarra eléctrica',
  'Bajo',
  'Batería',
  'Teclado',
  'Líder',
  'Pastor',
]

interface ParticipantFormProps {
  open: boolean
  serviceId: string
  /** Role-only mode: add roles to an existing participant. */
  participant?: ParticipantWithDetails
  existingParticipants: ParticipantWithDetails[]
  onClose: () => void
}

export function ParticipantForm({ open, serviceId, participant, existingParticipants, onClose }: ParticipantFormProps) {
  const roleOnly = !!participant
  const queryClient = useQueryClient()
  const { activeChurchId } = useChurch()

  const [membershipId, setMembershipId] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [customRole, setCustomRole] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: people, isLoading: peopleLoading } = useQuery({
    queryKey: ['people', activeChurchId],
    queryFn: () => getPeople(activeChurchId!),
    enabled: open && !roleOnly && !!activeChurchId,
  })

  useEffect(() => {
    if (!open) return
    setMembershipId('')
    setSelectedRoles([])
    setCustomRole('')
    setFormError(null)
  }, [open])

  // Members not already on the roster; UNIQUE(service_id, membership_id)
  // would reject duplicates anyway, this avoids the error path.
  const takenIds = new Set(existingParticipants.map((p) => p.membership_id))
  const available = (people ?? []).filter((m) => !takenIds.has(m.id))

  // In role-only mode, hide roles the participant already has. Selected roles
  // stay visible so they can be toggled back off.
  const existingRoles = new Set(participant?.roles.map((r) => r.role) ?? [])
  const suggestions = SUGGESTED_ROLES.filter((r) => !existingRoles.has(r))

  const toggleRole = (role: string) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    )
  }

  const addCustomRole = () => {
    const role = customRole.trim()
    if (!role) return
    if (!selectedRoles.includes(role) && !existingRoles.has(role)) {
      setSelectedRoles((current) => [...current, role])
    }
    setCustomRole('')
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (roleOnly) {
        for (const role of selectedRoles) await addParticipantRole(participant.id, role)
        return
      }
      const created = await addParticipant(serviceId, membershipId)
      for (const role of selectedRoles) await addParticipantRole(created.id, role)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['participants', serviceId] })
      onClose()
    },
    onError: () => setFormError('No se pudo guardar el participante.'),
  })

  const canSubmit = roleOnly ? selectedRoles.length > 0 : !!membershipId
  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          setFormError(null)
          mutation.mutate()
        }}
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {roleOnly
            ? `Agregar roles — ${participant.membership.person?.display_name ?? 'Miembro sin nombre'}`
            : 'Agregar participante'}
        </h2>

        {!roleOnly ? (
          <div>
            <label htmlFor="participant-member" className="mb-1 block text-sm font-medium text-gray-700">
              Miembro *
            </label>
            {peopleLoading ? (
              <LoadingSpinner />
            ) : (
              <select
                id="participant-member"
                value={membershipId}
                onChange={(e) => setMembershipId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Selecciona un miembro de la iglesia</option>
                {available.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    {membership.person?.display_name ?? 'Miembro sin nombre'}
                  </option>
                ))}
              </select>
            )}
            {!peopleLoading && available.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">Todos los miembros de la iglesia ya participan.</p>
            ) : null}
          </div>
        ) : null}

        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-gray-700">Roles</legend>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((role) => (
              <Button
                key={role}
                type="button"
                variant={selectedRoles.includes(role) ? 'primary' : 'secondary'}
                size="sm"
                className="rounded-full"
                onClick={() => toggleRole(role)}
                aria-pressed={selectedRoles.includes(role)}
              >
                {role}
              </Button>
            ))}
          </div>
          {selectedRoles.filter((r) => !SUGGESTED_ROLES.includes(r)).length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedRoles
                .filter((r) => !SUGGESTED_ROLES.includes(r))
                .map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant="primary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => toggleRole(role)}
                  >
                    {role} ✕
                  </Button>
                ))}
            </div>
          ) : null}
          <div className="mt-2 flex gap-2">
            <input
              aria-label="Rol personalizado"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomRole()
                }
              }}
              placeholder="Rol personalizado"
              className={inputClass}
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={addCustomRole}
            >
              Agregar
            </Button>
          </div>
        </fieldset>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <div className="flex justify-end gap-3">
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
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? 'Guardando…' : roleOnly ? 'Agregar roles' : 'Agregar participante'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
