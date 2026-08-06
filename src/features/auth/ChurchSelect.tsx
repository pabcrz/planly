import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { PageHeader } from '@/components/shared/PageHeader'

export function ChurchSelect() {
  const { memberships, refreshMemberships } = useAuth()
  const { setActiveChurch } = useChurch()

  return (
    <div>
      <PageHeader title="Tus iglesias" description="Selecciona una iglesia para trabajar." />

      <div className="grid gap-6 px-4 pb-6 md:grid-cols-2 md:px-6">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Membresías</h2>
          {memberships.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Contacta al administrador de Planly para que te asigne a una iglesia.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {memberships.map((membership) => (
                <li key={membership.id}>
                  <button
                    type="button"
                    onClick={() => setActiveChurch(membership.church_id)}
                    className="flex min-h-11 w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{membership.church.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {membership.role.replace('_', ' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => void refreshMemberships()}
            className="mt-4 min-h-11 rounded-md px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Actualizar lista
          </button>
        </section>

      </div>
    </div>
  )
}
