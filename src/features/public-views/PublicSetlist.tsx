import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicService, getPublicSetlist } from '@/services/publicService'
import type { PublicSetlistEntry } from '@/services/publicService'
import { formatServiceDate, formatServiceTime } from '@/features/services/serviceFormat'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ShareButton } from '@/components/shared/ShareButton'

function SetlistEntryRow({ serviceId, item }: { serviceId: string; item: PublicSetlistEntry }) {
  const inner = (
    <>
      <span className="w-6 shrink-0 text-center text-sm font-medium text-gray-400">{item.sort_order}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-gray-900">
          {item.title ?? 'Song unavailable'}
        </span>
        {item.version_name ? <span className="block truncate text-sm text-gray-500">{item.version_name}</span> : null}
      </span>
      <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-700">
        {item.key}
      </span>
    </>
  )

  // Songs hidden from anon by RLS (church-owned, unpublished) render without
  // a link — there are no public lyrics to navigate to.
  if (!item.title) {
    return (
      <div className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 opacity-60">
        {inner}
      </div>
    )
  }
  return (
    <Link
      to={`/s/${serviceId}/song/${item.song_version_id}`}
      className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40"
    >
      {inner}
    </Link>
  )
}

export function PublicSetlist() {
  const { serviceId } = useParams<{ serviceId: string }>()

  const serviceQuery = useQuery({
    queryKey: ['publicService', serviceId],
    queryFn: () => getPublicService(serviceId!),
    enabled: !!serviceId,
  })
  const setlistQuery = useQuery({
    queryKey: ['publicSetlist', serviceId],
    queryFn: () => getPublicSetlist(serviceId!),
    enabled: !!serviceId,
  })

  if (serviceQuery.isLoading || setlistQuery.isLoading) {
    return <LoadingSpinner label="Loading setlist…" />
  }

  const error = serviceQuery.error ?? setlistQuery.error
  if (error) {
    return <EmptyState title="Could not load this setlist" message={error.message} />
  }

  const service = serviceQuery.data
  if (!service) {
    return (
      <EmptyState
        title="Setlist not found"
        message="This link may be invalid, or the setlist is no longer available."
      />
    )
  }

  const items = setlistQuery.data?.items ?? []

  return (
    <div>
      <header className="pt-2">
        <p className="text-sm font-medium text-indigo-600">{service.church_name ?? 'Shared setlist'}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{formatServiceDate(service.service_date)}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {formatServiceTime(service.start_time)} · {service.timezone}
        </p>
        <div className="mt-3">
          <ShareButton />
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState title="No songs yet" message="This setlist doesn't have any songs yet." />
      ) : (
        <ol className="mt-6 flex flex-col gap-2">
          {items.map((item) => (
            <li key={`${item.sort_order}-${item.song_version_id}`}>
              <SetlistEntryRow serviceId={serviceId!} item={item} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
