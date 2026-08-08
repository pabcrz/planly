import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/adminService'
import { supabase } from '@/lib/supabase'
import { InviteUserForm } from './InviteUserForm'

export function UserListPage() {
  const query = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers(1, 100) })

  const churchesQuery = useQuery({
    queryKey: ['admin-churches-select'],
    queryFn: async () => {
      try {
        const res = await adminApi.listChurches(1, 100)
        return res.churches.map((c) => ({ id: c.id, name: c.name }))
      } catch {
        const { data } = await supabase.from('churches').select('id, name').order('name', { ascending: true })
        return data || []
      }
    },
  })

  if (query.isLoading) return <p className="text-sm text-gray-600">Cargando usuarios...</p>
  if (query.isError || !query.data) return <p role="alert" className="text-sm text-red-700">No fue posible cargar los usuarios.</p>

  const churches = churchesQuery.data || []

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Invitar usuario</h2>
        <InviteUserForm churches={churches} onComplete={() => void query.refetch()} />
      </section>
      <section className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3">Correo</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Membresías</th>
              <th className="p-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {query.data.users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100">
                <td className="p-3">{user.email ?? 'Sin correo'}</td>
                <td className="p-3">{user.status}</td>
                <td className="p-3">{user.memberships.length}</td>
                <td className="p-3"><Link className="text-indigo-700 underline" to={`/admin/users/${user.id}`}>Gestionar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
