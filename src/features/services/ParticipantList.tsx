import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not remove participant'),
  })

  const removeRoleMutation = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      removeParticipantRole(participantId, role),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Could not remove role'),
  })

  return (
    <section className="px-4 pb-6 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">Participants</h2>
        {canManage ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add participant
          </button>
        ) : null}
      </div>

      {actionError ? <p className="mt-2 text-sm text-red-600">{actionError}</p> : null}

      <div className="mt-3">
        {participants.length === 0 ? (
          <EmptyState
            title="No participants yet"
            message={canManage ? 'Assign church members to this service.' : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {participants.map((participant) => {
              const displayName = participant.membership.person?.display_name ?? 'Unnamed member'
              return (
                <li
                  key={participant.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {participant.roles.map(({ role }) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                        >
                          {role}
                          {canManage ? (
                            <button
                              type="button"
                              aria-label={`Remove role ${role}`}
                              onClick={() =>
                                removeRoleMutation.mutate({ participantId: participant.id, role })
                              }
                              className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full hover:bg-indigo-200"
                            >
                              ✕
                            </button>
                          ) : null}
                        </span>
                      ))}
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => setRoleTarget(participant)}
                          className="inline-flex min-h-6 items-center rounded-full border border-dashed border-gray-300 px-2.5 text-xs font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                        >
                          + Role
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      aria-label={`Remove ${displayName}`}
                      onClick={() => removeMutation.mutate(participant.id)}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-red-500 hover:bg-red-50"
                    >
                      ✕
                    </button>
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
    </section>
  )
}
