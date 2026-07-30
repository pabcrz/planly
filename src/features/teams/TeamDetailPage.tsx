import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { deleteTeam, getTeam } from '@/services/teamService'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { TeamForm } from './TeamForm'
import { TeamMembers } from './TeamMembers'

const MANAGER_ROLES = new Set(['church_admin', 'worship_director'])

export function TeamDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeChurchId, activeMembership } = useChurch()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const canManage = activeMembership ? MANAGER_ROLES.has(activeMembership.role) : false
  // Spec: team deletion is church_admin-only (RLS teams_delete_admin).
  const canDelete = activeMembership?.role === 'church_admin'

  const { data: team, isLoading, error } = useQuery({
    queryKey: ['team', id],
    queryFn: () => getTeam(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTeam(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teams'] })
      navigate('/teams')
    },
    onError: (err) => {
      setDeleteOpen(false)
      setDeleteError(err instanceof Error ? err.message : 'Could not delete team')
    },
  })

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return (
      <div>
        <PageHeader title="Team" />
        <EmptyState title="Could not load team" message={error.message} />
      </div>
    )
  }
  if (!team) return null

  return (
    <div>
      <PageHeader
        title={team.name}
        description={team.description ?? undefined}
        action={
          <>
            <Link
              to="/teams"
              className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Back
            </Link>
            {canManage ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex min-h-11 items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            ) : null}
          </>
        }
      />

      {deleteError ? <p className="px-4 pb-2 text-sm text-red-600 md:px-6">{deleteError}</p> : null}

      <TeamMembers teamId={team.id} members={team.members} canManage={canManage} />

      {activeChurchId ? (
        <TeamForm
          open={editOpen}
          churchId={activeChurchId}
          team={team}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete team"
        message={`Delete "${team.name}"? Its member roster will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
