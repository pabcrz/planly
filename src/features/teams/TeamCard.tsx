import { Link } from 'react-router-dom'
import type { TeamWithCount } from '@/services/teamService'

export function TeamCard({ team }: { team: TeamWithCount }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-gray-900">{team.name}</h3>
          {team.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{team.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
        </span>
      </div>
    </Link>
  )
}
