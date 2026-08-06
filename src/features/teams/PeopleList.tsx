import { useQuery } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getPeople } from '@/services/peopleService'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PersonCard } from './PersonCard'

export function PeopleList() {
  const { activeChurchId } = useChurch()

  const { data: people, isLoading, error } = useQuery({
    queryKey: ['people', activeChurchId],
    queryFn: () => getPeople(activeChurchId!),
    enabled: !!activeChurchId,
  })

  return (
    <section className="px-4 pb-6 md:px-6">
      <h2 className="text-base font-semibold text-gray-900">Personas</h2>
      <p className="mt-1 text-sm text-gray-500">Todas las personas de tu iglesia y sus roles musicales.</p>

      <div className="mt-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState title="No fue posible cargar las personas" message="Intenta de nuevo." />
        ) : !people || people.length === 0 ? (
          <EmptyState title="No hay personas" message="Los miembros de la iglesia aparecerán aquí." />
        ) : (
          <ul className="flex flex-col gap-3">
            {people.map((membership) => (
              <li key={membership.id}>
                <PersonCard membership={membership} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
