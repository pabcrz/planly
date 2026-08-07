import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Plus, X, Trash2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { removeParticipant, removeParticipantRole } from '@/services/serviceService'
import type { ParticipantWithDetails } from '@/services/serviceService'
import { EmptyState } from '@/components/shared/EmptyState'
import { ParticipantForm } from './ParticipantForm'

interface ParticipantListProps {
  serviceId: string
  participants: ParticipantWithDetails[]
  canManage: boolean
}

export function ParticipantList({ serviceId, participants, canManage }: ParticipantListProps) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<ParticipantWithDetails | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['participants', serviceId] })
  }

  const removeMutation = useMutation({
    mutationFn: (participantId: string) => removeParticipant(participantId),
    onSuccess: invalidate,
    onError: () => setActionError('No se pudo eliminar al participante.'),
  })

  const removeRoleMutation = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      removeParticipantRole(participantId, role),
    onSuccess: invalidate,
    onError: () => setActionError('No se pudo eliminar el rol.'),
  })

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Participantes del equipo</h2>
            <p className="text-xs text-gray-400 font-medium">
              {participants.length === 1 ? '1 participante asignado' : `${participants.length} participantes asignados`}
            </p>
          </div>
        </div>

        {canManage ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Agregar participante
          </Button>
        ) : null}
      </div>

      {actionError ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{actionError}</p> : null}

      <div className="mt-5">
        {participants.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title="Aún no hay participantes asignados"
              message={canManage ? 'Asigna miembros de tu iglesia a este servicio para organizar los turnos y roles.' : undefined}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {participants.map((participant) => {
              const displayName = participant.membership.person?.display_name ?? 'Miembro sin nombre'
              return (
                <li
                  key={participant.id}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all duration-150"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs uppercase">
                        {displayName.charAt(0)}
                      </div>
                      <p className="truncate text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{displayName}</p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9">
                      {participant.roles.map(({ role }) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200/50 px-2.5 py-1 text-xs font-bold text-indigo-800 shadow-2xs"
                        >
                          <Shield className="h-3 w-3 text-indigo-500" />
                          <span>{role}</span>
                          {canManage ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 rounded-full"
                              aria-label={`Eliminar rol ${role}`}
                              onClick={() =>
                                removeRoleMutation.mutate({ participantId: participant.id, role })
                              }
                            >
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          ) : null}
                        </span>
                      ))}
                      {canManage ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-auto py-1 px-2.5 border-dashed"
                          onClick={() => setRoleTarget(participant)}
                        >
                          <Plus className="h-3 w-3" />
                          <span>Agregar rol</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {canManage ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="icon"
                      aria-label={`Eliminar a ${displayName}`}
                      onClick={() => removeMutation.mutate(participant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ParticipantForm
        open={addOpen}
        serviceId={serviceId}
        existingParticipants={participants}
        onClose={() => setAddOpen(false)}
      />

      <ParticipantForm
        open={!!roleTarget}
        serviceId={serviceId}
        participant={roleTarget ?? undefined}
        existingParticipants={participants}
        onClose={() => setRoleTarget(null)}
      />
    </div>
  )
}

