import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { addMember, removeMember } from '@/services/teamService'
import type { TeamMemberWithPerson } from '@/services/teamService'
import { getPeople } from '@/services/peopleService'
import { EmptyState } from '@/components/shared/EmptyState'

const ROLE_LABELS: Record<string, string> = {
  church_admin: 'Admin',
  worship_director: 'Worship director',
  member: 'Member',
}

interface TeamMembersProps {
  teamId: string
  members: TeamMemberWithPerson[]
  canManage: boolean
}

export function TeamMembers({ teamId, members, canManage }: TeamMembersProps) {
  const { activeChurchId } = useChurch()
  const queryClient = useQueryClient()
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  // Full church roster so the dropdown can offer members not yet on the team.
  const { data: people } = useQuery({
    queryKey: ['people', activeChurchId],
    queryFn: () => getPeople(activeChurchId!),
    enabled: !!activeChurchId && canManage,
  })

  const memberIds = new Set(members.map((m) => m.membership_id))
  const candidates = (people ?? []).filter((p) => !memberIds.has(p.id))

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['team', teamId] })
    await queryClient.invalidateQueries({ queryKey: ['teams'] })
  }

  const addMutation = useMutation({
    mutationFn: (membershipId: string) => addMember(teamId, membershipId),
    onSuccess: async () => {
      setSelectedMembershipId('')
      setActionError(null)
      await invalidate()
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : 'Could not add member')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) => removeMember(teamId, membershipId),
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : 'Could not remove member')
    },
  })

  return (
    <section className="px-4 pb-6 md:px-6">
      <h2 className="text-base font-semibold text-gray-900">Members</h2>

      {canManage ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedMembershipId}
            onChange={(e) => setSelectedMembershipId(e.target.value)}
            className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:max-w-xs"
            aria-label="Add member"
          >
            <option value="">Select a church member…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.person?.display_name ?? 'Unnamed member'}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedMembershipId || addMutation.isPending}
            onClick={() => addMutation.mutate(selectedMembershipId)}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {addMutation.isPending ? 'Adding…' : 'Add member'}
          </button>
        </div>
      ) : null}

      {actionError ? <p className="mt-2 text-sm text-red-600">{actionError}</p> : null}

      <div className="mt-4">
        {members.length === 0 ? (
          <EmptyState title="No members yet" message="Add church members to build the roster." />
        ) : (
          <ul className="flex flex-col gap-3">
            {members.map((member) => {
              const person = member.membership.person
              return (
                <li
                  key={member.membership_id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {person?.display_name ?? 'Unnamed member'}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {ROLE_LABELS[member.membership.role] ?? member.membership.role}
                        </span>
                      </div>
                      {person && (person.instruments.length > 0 || person.musical_roles.length > 0) ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {person.instruments.map((instrument) => (
                            <span
                              key={instrument}
                              className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                            >
                              {instrument}
                            </span>
                          ))}
                          {person.musical_roles.map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(member.membership_id)}
                        className="min-h-11 shrink-0 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
