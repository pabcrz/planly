import type { MembershipWithPerson } from '@/services/peopleService'

const ROLE_LABELS: Record<string, string> = {
  church_admin: 'Admin',
  worship_director: 'Worship director',
  member: 'Member',
}

export function PersonCard({ membership }: { membership: MembershipWithPerson }) {
  const person = membership.person

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-900">
          {person?.display_name ?? 'Unnamed member'}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {ROLE_LABELS[membership.role] ?? membership.role}
        </span>
      </div>
      {person ? (
        person.instruments.length > 0 || person.musical_roles.length > 0 ? (
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
        ) : (
          <p className="mt-1 text-xs text-gray-400">No instruments or roles listed yet.</p>
        )
      ) : (
        <p className="mt-1 text-xs text-gray-400">No profile yet.</p>
      )}
    </div>
  )
}
