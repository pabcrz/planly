import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getTeams } from '@/services/teamService'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { TeamCard } from './TeamCard'
import { TeamForm } from './TeamForm'
import { PeopleList } from './PeopleList'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

export function TeamList() {
  const { activeChurchId, activeMembership } = useChurch()
  const [formOpen, setFormOpen] = useState(false)
  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams', activeChurchId],
    queryFn: () => getTeams(activeChurchId!),
    enabled: !!activeChurchId,
  })

  return (
    <div>
      <PageHeader
        title="Equipos"
        description="Musical teams in your church."
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              New team
            </button>
          ) : undefined
        }
      />

      <div className="px-4 pb-6 md:px-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState title="No fue posible cargar los equipos" message="Intenta de nuevo." />
        ) : !teams || teams.length === 0 ? (
          <EmptyState
            title="No teams yet"
            message={
              canManage
                ? 'Crea tu primer equipo para comenzar a organizar músicos.'
                : 'Tu director de alabanza aún no ha creado equipos.'
            }
            action={
              canManage ? (
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  New team
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {teams.map((team) => (
              <li key={team.id}>
                <TeamCard team={team} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <PeopleList />

      {activeChurchId ? (
        <TeamForm open={formOpen} churchId={activeChurchId} onClose={() => setFormOpen(false)} />
      ) : null}
    </div>
  )
}
