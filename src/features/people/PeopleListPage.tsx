import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChurch } from '@/app/providers/ChurchProvider'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate } from '@/lib/formatDate'
import type { MembershipWithPerson } from '@/services/peopleService'
import { deleteMembership, getChurchSettings, getPeople, updateMembershipRole } from '@/services/peopleService'
import type { ChurchRole } from '@/types/models'
import { RoleConfigDialog } from './RoleConfigDialog'
import { PersonRolesDialog } from './PersonRolesDialog'
import { Settings, UserPlus, Trash2 } from 'lucide-react'

const DEFAULT_ROLES = [
  'Director de alabanza',
  'Vocalista',
  'Guitarra acústica',
  'Guitarra eléctrica',
  'Bajo',
  'Batería',
  'Teclado',
  'Pastor',
  'Líder',
]

export function PeopleListPage() {
  const { activeChurchId, activeMembership } = useChurch()
  const userRole = activeMembership?.role
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  
  const [showRoleConfig, setShowRoleConfig] = useState(false)
  const [editingMemberRoles, setEditingMemberRoles] = useState<MembershipWithPerson | null>(null)
  const [deletingMember, setDeletingMember] = useState<MembershipWithPerson | null>(null)

  const canManage = userRole === 'church_admin' || userRole === 'worship_director'
  const isChurchAdmin = userRole === 'church_admin'

  const { data: people, isLoading: isPeopleLoading } = useQuery({
    queryKey: ['people', activeChurchId],
    queryFn: () => getPeople(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const { data: settings } = useQuery({
    queryKey: ['churchSettings', activeChurchId],
    queryFn: () => getChurchSettings(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const availableRoles = useMemo(() => {
    if (settings && settings.musical_roles && settings.musical_roles.length > 0) {
      return settings.musical_roles
    }
    return DEFAULT_ROLES
  }, [settings])

  const roleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: ChurchRole }) =>
      updateMembershipRole(id, newRole),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['people', activeChurchId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMembership(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['people', activeChurchId] })
      setDeletingMember(null)
    },
  })

  const filteredPeople = useMemo(() => {
    if (!people) return []
    return people.filter((m) => {
      const name = m.person?.display_name || 'Miembro'
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase())
      const matchesProfile = profileFilter === 'all' || m.role === profileFilter
      const matchesRole =
        roleFilter === 'all' || (m.person?.musical_roles && m.person.musical_roles.includes(roleFilter))
      return matchesSearch && matchesProfile && matchesRole
    })
  }, [people, search, profileFilter, roleFilter])

  const counts = useMemo(() => {
    const total = people?.length || 0
    const profileCounts: Record<string, number> = {
      all: total,
      church_admin: 0,
      worship_director: 0,
      member: 0,
    }
    const roleCounts: Record<string, number> = {
      all: total,
    }
    availableRoles.forEach((r) => {
      roleCounts[r] = 0
    })

    people?.forEach((m) => {
      profileCounts[m.role] = (profileCounts[m.role] || 0) + 1
      m.person?.musical_roles?.forEach((r) => {
        roleCounts[r] = (roleCounts[r] || 0) + 1
      })
    })

    return { profileCounts, roleCounts }
  }, [people, availableRoles])

  if (!activeChurchId) return null

  if (isPeopleLoading) {
    return (
      <div className="flex justify-center p-12">
        <LoadingSpinner />
      </div>
    )
  }

  const getProfileLabel = (role: ChurchRole) => {
    switch (role) {
      case 'church_admin':
        return 'Admin'
      case 'worship_director':
        return 'Editor'
      default:
        return 'Viewer'
    }
  }

  const getProfileBadgeClass = (role: ChurchRole) => {
    switch (role) {
      case 'church_admin':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'worship_director':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Personas y Roles"
        description="Administra los miembros del equipo de tu iglesia, define sus perfiles de seguridad en la plataforma y asigna sus roles ministeriales o instrumentos."
        action={
          <div className="flex flex-wrap gap-3">
            {canManage ? (
              <button
                type="button"
                onClick={() => setShowRoleConfig(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4 text-gray-600" />
                <span>Configurar Roles</span>
              </button>
            ) : null}
            {isChurchAdmin ? (
              <Link
                to="/invite"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invitar Persona</span>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1 flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="people-search" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Buscar
            </label>
            <input
              id="people-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre del miembro..."
              className="min-h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Perfiles de Seguridad
            </span>
            <ul className="flex flex-col gap-1 text-sm">
              {[
                { id: 'all', label: 'Todos los perfiles' },
                { id: 'church_admin', label: 'Admin (Administradores)' },
                { id: 'worship_director', label: 'Editor (Directores)' },
                { id: 'member', label: 'Viewer (Miembros)' },
              ].map((item) => {
                const active = profileFilter === item.id
                const count = counts.profileCounts[item.id] || 0
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setProfileFilter(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                        active
                          ? 'bg-indigo-50 text-indigo-900 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      <span
                        className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full font-bold ${
                          active ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Roles Ministeriales
            </span>
            <ul className="flex flex-col gap-1 text-sm max-h-72 overflow-y-auto pr-1">
              <li>
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                    roleFilter === 'all'
                      ? 'bg-indigo-50 text-indigo-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Todos los roles</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full font-bold ${
                      roleFilter === 'all' ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {counts.roleCounts.all || 0}
                  </span>
                </button>
              </li>
              {availableRoles.map((role) => {
                const active = roleFilter === role
                const count = counts.roleCounts[role] || 0
                return (
                  <li key={role}>
                    <button
                      type="button"
                      onClick={() => setRoleFilter(role)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                        active
                          ? 'bg-indigo-50 text-indigo-900 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate mr-2">{role}</span>
                      <span
                        className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full font-bold ${
                          active ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* Roster Main List */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 text-sm text-gray-600">
            <span className="font-medium">
              Mostrando <strong className="text-gray-900">{filteredPeople.length}</strong> de {people?.length || 0} miembros
            </span>
          </div>

          {filteredPeople.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sm font-medium text-gray-700">No se encontraron personas con los filtros seleccionados.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setProfileFilter('all')
                  setRoleFilter('all')
                }}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
              {filteredPeople.map((m) => {
                const name = m.person?.display_name || 'Miembro de Iglesia'
                const initials = name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                const musicalRoles = m.person?.musical_roles || []

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Person Info */}
                    <div className="flex items-center gap-4 min-w-0 sm:w-1/3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-sm font-bold text-white shadow-inner">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-gray-900 text-base">{name}</p>
                        <p className="text-xs text-gray-500">
                          Unido el {formatDate(m.joined_at)}
                        </p>
                      </div>
                    </div>

                    {/* Roles Ministeriales */}
                    <div className="flex-1 flex flex-wrap items-center gap-1.5 sm:justify-center min-w-0">
                      {musicalRoles.length === 0 ? (
                        <span className="text-xs italic text-gray-400">Sin roles asignados</span>
                      ) : (
                        musicalRoles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 border border-gray-200/60"
                          >
                            {r}
                          </span>
                        ))
                      )}
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => setEditingMemberRoles(m)}
                          aria-label={`Modificar roles del equipo para ${name}`}
                          className="inline-flex items-center rounded-full bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/60 transition-colors"
                        >
                          + Roles
                        </button>
                      ) : null}
                    </div>

                    {/* Perfil (Acceso) & Actions */}
                    <div className="flex items-center gap-3 justify-end sm:w-1/4 shrink-0 border-t sm:border-0 pt-3 sm:pt-0">
                      {isChurchAdmin ? (
                        <select
                          aria-label="Perfil de seguridad en la plataforma"
                          value={m.role}
                          onChange={(e) => roleMutation.mutate({ id: m.id, newRole: e.target.value as ChurchRole })}
                          disabled={roleMutation.isPending}
                          className="min-h-9 text-xs font-semibold rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 shadow-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        >
                          <option value="church_admin">Admin (All)</option>
                          <option value="worship_director">Editor (Director)</option>
                          <option value="member">Viewer (Miembro)</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getProfileBadgeClass(
                            m.role
                          )}`}
                        >
                          {getProfileLabel(m.role)}
                        </span>
                      )}

                      {isChurchAdmin ? (
                        <button
                          type="button"
                          aria-label="Eliminar miembro de la iglesia"
                          onClick={() => setDeletingMember(m)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <RoleConfigDialog open={showRoleConfig} onClose={() => setShowRoleConfig(false)} />
      
      <PersonRolesDialog
        open={!!editingMemberRoles}
        member={editingMemberRoles}
        availableRoles={availableRoles}
        onClose={() => setEditingMemberRoles(null)}
      />

      <ConfirmDialog
        open={!!deletingMember}
        title="Eliminar Miembro del Equipo"
        message={`¿Estás seguro de que deseas eliminar la membresía de "${deletingMember?.person?.display_name || 'este usuario'}" en esta iglesia? Esta acción lo removerá de la lista de personas y roles.`}
        onConfirm={() => deletingMember && deleteMutation.mutate(deletingMember.id)}
        onCancel={() => setDeletingMember(null)}
      />
    </div>
  )
}
