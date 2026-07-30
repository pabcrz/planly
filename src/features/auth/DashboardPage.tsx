import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { PageHeader } from '@/components/shared/PageHeader'
import { ChurchSelect } from '@/features/auth/ChurchSelect'

const STAT_CARDS = [
  { label: 'Songs', hint: 'Catalog size' },
  { label: 'Teams', hint: 'Active teams' },
  { label: 'Services', hint: 'Upcoming' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { activeChurchId, activeMembership } = useChurch()

  if (!activeChurchId) return <ChurchSelect />

  return (
    <div>
      <PageHeader
        title={activeMembership ? `Welcome to ${activeMembership.church.name}` : 'Welcome'}
        description={user?.email ? `Signed in as ${user.email}` : undefined}
      />
      <div className="grid gap-4 px-4 md:grid-cols-3 md:px-6">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">—</p>
            <p className="mt-1 text-xs text-gray-400">{card.hint}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
