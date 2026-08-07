import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'

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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setActiveChurch(membership.church_id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium text-gray-900">{membership.church.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {membership.role.replace('_', ' ')}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => void refreshMemberships()}
            className="mt-4"
          >
            Actualizar lista
          </Button>
        </section>

      </div>
    </div>
  )
}
