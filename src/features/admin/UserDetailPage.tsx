import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChurchRole } from '@/types/models'
import { toastPromise, toastSuccess } from '@/lib/toast'
import { adminApi } from '@/services/adminService'
import { useAuth } from '@/app/providers/AuthProvider'

const roles: ChurchRole[] = ['member', 'worship_director', 'church_admin']

function getRoleLabel(role: ChurchRole): string {
  switch (role) {
    case 'church_admin':
      return 'Admin (Administrador)'
    case 'worship_director':
      return 'Editor (Director de Alabanza)'
    case 'member':
      return 'Viewer (Miembro)'
    default:
      return role
  }
}

export function UserDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  
  const query = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers(1, 100) })
  const churchesQuery = useQuery({ queryKey: ['admin-churches'], queryFn: () => adminApi.listChurches(1, 100) })
  
  const [churchId, setChurchId] = useState('')
  const [role, setRole] = useState<ChurchRole>('member')
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null)

  if (query.isLoading || churchesQuery.isLoading) return <p className="text-sm text-gray-600">Cargando usuario e iglesias...</p>
  
  const user = query.data?.users.find((candidate) => candidate.id === userId)
  if (!user) return <p role="alert" className="text-sm text-red-700">No encontramos este usuario.</p>
  
  const churchMap = new Map(churchesQuery.data?.churches.map((c) => [c.id, c.name]))
  const isSelf = currentUser?.id === user.id

  const refresh = () => void query.refetch()
  const mutate = async (promise: Promise<unknown>, loading: string, success: string) => {
    await toastPromise(promise, { loading, success })
    refresh()
  }

  return (
    <div className="space-y-6">
      <header>
        <button onClick={() => navigate('/admin/users')} className="text-sm font-semibold text-indigo-700 hover:underline">
          ← Volver a usuarios
        </button>
        <h2 className="mt-2 text-xl font-bold text-gray-900">
          {user.email ?? 'Sin correo'} {isSelf ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 ml-2">Tu cuenta (Super Admin)</span> : null}
        </h2>
        <p className="text-sm text-gray-600 mt-1">Estado en plataforma: <strong className="text-gray-800 uppercase">{user.status}</strong></p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {user.status !== 'active' ? (
          <button
            onClick={() => void mutate(adminApi.reactivateUser(user.id), 'Reactivando usuario...', 'Usuario reactivado.')}
            className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Reactivar usuario
          </button>
        ) : (
          <button
            onClick={() => !isSelf && void mutate(adminApi.deactivateUser(user.id, 'retain'), 'Desactivando usuario...', 'Usuario desactivado.')}
            disabled={isSelf}
            title={isSelf ? 'No puedes desactivarte a ti mismo como Super Admin.' : undefined}
            className="min-h-11 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSelf ? 'Desactivar (Prohibido a Super Admin)' : 'Desactivar usuario'}
          </button>
        )}
        <button
          onClick={async () => {
            try {
              const res = await toastPromise(adminApi.generateRecoveryLink(user.id), {
                loading: 'Generando enlace...',
                success: 'Enlace de recuperación generado.',
              })
              setRecoveryLink(res.action_link)
            } catch {}
          }}
          className="min-h-11 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          Generar enlace de recuperación de contraseña
        </button>
      </div>

      {recoveryLink ? (
        <div className="rounded-xl bg-indigo-50 p-4 shadow-sm ring-1 ring-indigo-200">
          <p className="text-sm font-semibold text-indigo-950">Enlace de recuperación generado:</p>
          <p className="mt-1 text-xs text-indigo-800">
            Copia este enlace y envíalo por WhatsApp o correo de forma segura al usuario para que restablezca su contraseña.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={recoveryLink}
              className="min-h-11 min-w-64 flex-1 select-all rounded-md border border-indigo-300 bg-white px-3 py-2 text-xs font-mono text-gray-800"
            />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(recoveryLink)
                toastSuccess('Enlace copiado al portapapeles.')
              }}
              className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Copiar enlace
            </button>
            <button
              type="button"
              onClick={() => setRecoveryLink(null)}
              className="min-h-11 rounded-md border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Iglesias en las que participa</h3>
        <p className="text-xs text-gray-500 mb-4">Membresías activas de este usuario en diferentes iglesias registradas</p>
        
        {user.memberships.length === 0 ? (
          <p className="text-sm italic text-gray-500 py-4 border-t border-gray-100">Este usuario no participa actualmente en ninguna iglesia.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {user.memberships.map((membership) => {
              const churchName = churchMap.get(membership.church_id) ?? `Iglesia (${membership.church_id.slice(0, 8)}...)`
              return (
                <li key={membership.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-48 flex-1">
                    <span className="text-sm font-bold text-gray-900 block">{churchName}</span>
                    <span className="text-xs text-gray-400 font-mono">ID: {membership.church_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={membership.role}
                      onChange={(event) =>
                        void mutate(
                          adminApi.updateMembershipRole(membership.id, event.target.value as ChurchRole),
                          'Actualizando rol de iglesia...',
                          'Rol de iglesia actualizado.'
                        )
                      }
                      className="min-h-11 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium shadow-sm focus:border-indigo-500 focus:outline-none"
                    >
                      {roles.map((val) => (
                        <option key={val} value={val}>
                          {getRoleLabel(val)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void mutate(adminApi.revokeMembership(membership.id), 'Revocando membresía...', 'Membresía revocada.')}
                      className="min-h-11 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Quitar de Iglesia
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (churchId) {
            void mutate(adminApi.createMembership(user.id, churchId, role), 'Añadiendo a iglesia...', 'Usuario añadido a la iglesia exitosamente.')
            setChurchId('')
          }
        }}
        className="flex flex-wrap items-end gap-4 rounded-xl bg-gray-50/70 p-6 shadow-sm border border-gray-200"
      >
        <div className="w-full sm:flex-1">
          <h4 className="text-sm font-bold text-gray-900 mb-1">Añadir usuario a otra Iglesia</h4>
          <p className="text-xs text-gray-600 mb-3">Selecciona una iglesia y el perfil de acceso en plataforma</p>
          <div className="flex flex-col gap-1">
            <label htmlFor="church-select" className="text-xs font-semibold text-gray-700">
              Seleccionar Iglesia *
            </label>
            <select
              id="church-select"
              value={churchId}
              onChange={(event) => setChurchId(event.target.value)}
              required
              className="mt-1 block min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none shadow-sm"
            >
              <option value="">-- Elige una iglesia --</option>
              {churchesQuery.data?.churches
                .filter((c) => !user.memberships.some((m) => m.church_id === c.id))
                .map((church) => (
                  <option key={church.id} value={church.id}>
                    {church.name} ({church.slug})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="w-full sm:w-56 flex flex-col gap-1">
          <label htmlFor="role-select" className="text-xs font-semibold text-gray-700">
            Perfil de Seguridad *
          </label>
          <select
            id="role-select"
            value={role}
            onChange={(event) => setRole(event.target.value as ChurchRole)}
            className="mt-1 block min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none shadow-sm"
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {getRoleLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!churchId}
          className="min-h-11 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          + Añadir a Iglesia
        </button>
      </form>
    </div>
  )
}
