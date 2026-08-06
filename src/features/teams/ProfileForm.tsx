import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { useAuth } from '@/app/providers/AuthProvider'
import { useChurch } from '@/app/providers/ChurchProvider'
import { getChurchSettings, getPerson, upsertProfile } from '@/services/peopleService'
import { getServices } from '@/services/serviceService'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatServiceDateOnly, formatServiceDay, formatServiceTime } from '@/features/services/serviceFormat'

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

type TabType = 'roles' | 'services' | 'permissions'

export function ProfileForm() {
  const { user } = useAuth()
  const { activeChurchId, activeMembership } = useChurch()
  const queryClient = useQueryClient()
  const membershipId = activeMembership?.id

  const { data: person, isLoading: isPersonLoading } = useQuery({
    queryKey: ['person', membershipId],
    queryFn: () => getPerson(membershipId!),
    enabled: !!membershipId,
  })

  const { data: settings } = useQuery({
    queryKey: ['church-settings', activeChurchId],
    queryFn: () => getChurchSettings(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const { data: services } = useQuery({
    queryKey: ['services', activeChurchId],
    queryFn: () => getServices(activeChurchId!),
    enabled: !!activeChurchId,
  })

  const availableRoles: string[] = settings?.musical_roles && settings.musical_roles.length > 0
    ? settings.musical_roles
    : DEFAULT_ROLES

  const defaultDisplayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Miembro'

  const [displayName, setDisplayName] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('roles')
  const [isEditingRoles, setIsEditingRoles] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const autoCreateStarted = useRef(false)
  useEffect(() => {
    if (person !== null || !membershipId || autoCreateStarted.current) return
    autoCreateStarted.current = true
    upsertProfile({ membership_id: membershipId, display_name: defaultDisplayName })
      .then(() => queryClient.invalidateQueries({ queryKey: ['person', membershipId] }))
      .catch(() => {
        autoCreateStarted.current = false
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, membershipId])

  useEffect(() => {
    if (person === undefined) return
    setDisplayName(person?.display_name ?? defaultDisplayName)
    const combinedRoles = Array.from(
      new Set([...(person?.musical_roles || []), ...(person?.instruments || [])])
    )
    setSelectedRoles(combinedRoles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person])

  const mutation = useMutation({
    mutationFn: () =>
      upsertProfile({
        membership_id: membershipId!,
        display_name: displayName,
        instruments: [],
        musical_roles: selectedRoles,
      }),
    onSuccess: async () => {
      setSaved(true)
      setFormError(null)
      setIsEditingRoles(false)
      await queryClient.invalidateQueries({ queryKey: ['person', membershipId] })
      await queryClient.invalidateQueries({ queryKey: ['people'] })
      await queryClient.invalidateQueries({ queryKey: ['teams'] })
      setTimeout(() => setSaved(false), 4000)
    },
    onError: (error) => {
      setSaved(false)
      if (error instanceof ZodError) {
        setFormError(error.issues[0]?.message || 'Datos inválidos.')
      } else {
        setFormError('No se pudo guardar el perfil. Intenta de nuevo.')
      }
    },
  })

  if (isPersonLoading) return <LoadingSpinner />

  const roleLabel =
    activeMembership?.role === 'church_admin'
      ? 'Admin (Administrador)'
      : activeMembership?.role === 'worship_director'
      ? 'Editor (Director de Alabanza)'
      : 'Viewer (Miembro)'

  const userServices = (services || []).filter((s) => s.status !== 'completed').slice(0, 5)

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Perfil y Ministerial"
        description="Gestión de tu identidad en el equipo musical, roles funcionales y nivel de permisos en la congregación."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Profile Identity Column */}
        <div className="md:col-span-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-200 flex flex-col items-center md:items-start text-center md:text-left relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-sm mb-4">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="w-full">
            <label htmlFor="display-name-input" className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              Nombre en la Plataforma
            </label>
            <div className="flex items-center gap-2">
              <input
                id="display-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                className="min-h-11 w-full rounded-lg border border-gray-300 bg-gray-50/50 px-3 py-2 text-lg font-bold text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div className="mt-4 w-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Correo Electrónico</p>
            <p className="mt-1 text-sm font-medium text-gray-600 select-all truncate bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 font-mono">
              {user?.email ?? 'Sin correo'}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 w-full">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Nivel de Permiso</span>
            <span className="mt-1.5 inline-flex items-center rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/60">
              🛡️ {roleLabel}
            </span>
          </div>

          <div className="mt-8 w-full">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="w-full min-h-11 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {mutation.isPending ? 'Guardando cambios…' : 'Guardar perfil'}
            </button>
            {saved ? <p className="mt-2 text-center text-xs font-semibold text-emerald-600">✓ Perfil actualizado correctamente.</p> : null}
            {formError ? <p className="mt-2 text-center text-xs font-semibold text-red-600">{formError}</p> : null}
          </div>
        </div>

        {/* Right Tabbed Content Column */}
        <div className="md:col-span-8">
          {/* Tabs header */}
          <div className="flex border-b border-gray-200 gap-6 px-2">
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'roles'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Roles y Funciones
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'services'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Servicios Próximos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'permissions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Permisos del Perfil
            </button>
          </div>

          {/* Tab 1: Roles */}
          {activeTab === 'roles' ? (
            <div className="mt-6 rounded-2xl bg-white text-gray-900 p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-wide">
                    {activeMembership?.church.name ?? 'Iglesia Activa'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tus roles ministeriales, instrumentos y funciones asignadas</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingRoles(!isEditingRoles)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60 transition-colors"
                >
                  {isEditingRoles ? 'Cerrar edición' : '✎ Editar Roles'}
                </button>
              </div>

              {isEditingRoles ? (
                <div className="space-y-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-700 font-semibold">
                    Selecciona de la lista oficial de tu iglesia los roles ministeriales o instrumentos en los que participas:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {availableRoles.map((role) => {
                      const isChecked = selectedRoles.includes(role)
                      return (
                        <label
                          key={role}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRole(role)}
                            className="h-4 w-4 rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{role}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => mutation.mutate()}
                      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Guardar roles seleccionados
                    </button>
                  </div>
                </div>
              ) : selectedRoles.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-500 font-medium">Aún no tienes roles o instrumentos asignados en esta iglesia.</p>
                  <button
                    type="button"
                    onClick={() => setIsEditingRoles(true)}
                    className="mt-3 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    + Agregar mis primeros roles
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedRoles.map((role) => (
                    <div
                      key={role}
                      className="rounded-xl bg-gray-50/90 px-4 py-3.5 text-sm font-bold text-gray-800 border border-gray-200/80 flex items-center justify-between hover:bg-white hover:shadow-2xs transition-all"
                    >
                      <span>{role}</span>
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Tab 2: Services */}
          {activeTab === 'services' ? (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-2">Próximas participaciones</h3>
              <p className="text-xs text-gray-500 mb-6">Servicios activos o programados para los próximos días en esta congregación</p>

              {userServices.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 italic">No hay servicios próximos programados por el momento.</p>
              ) : (
                <div className="space-y-3">
                  {userServices.map((srv) => (
                    <div key={srv.id} className="p-4 rounded-xl border border-gray-200 hover:border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors">
                      <div>
                        <span className="text-xs font-bold text-indigo-700 uppercase">{srv.service_type || 'General'}</span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {formatServiceDay(srv.service_date)}, {formatServiceDateOnly(srv.service_date)} · {formatServiceTime(srv.start_time)} hrs
                        </p>
                        {srv.director ? <p className="text-xs text-gray-500">Director: {srv.director}</p> : null}
                      </div>
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 self-start sm:self-center">
                        Confirmado en equipo
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Tab 3: Permissions */}
          {activeTab === 'permissions' ? (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Capacidades de tu perfil ({roleLabel})</h3>
              <p className="text-xs text-gray-500">El nivel de permiso define qué acciones administrativas o de edición tienes habilitadas en Planly.</p>
              
              <div className="divide-y divide-gray-100 pt-2 text-sm">
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-gray-700">Visualizar repertorios y letras con tonos (ChordPro)</span>
                  <span className="text-emerald-600 font-bold">✓ Permitido</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-gray-700">Consultar próximas fechas y setlists de servicios</span>
                  <span className="text-emerald-600 font-bold">✓ Permitido</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-gray-700">Crear y editar canciones en el catálogo (Transposición y Tonos)</span>
                  <span className={activeMembership?.role === 'member' ? 'text-gray-400 font-medium' : 'text-emerald-600 font-bold'}>
                    {activeMembership?.role === 'member' ? '✕ Solo Editores/Admins' : '✓ Permitido'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-gray-700">Programar servicios y estructurar órdenes de culto (Setlists)</span>
                  <span className={activeMembership?.role === 'member' ? 'text-gray-400 font-medium' : 'text-emerald-600 font-bold'}>
                    {activeMembership?.role === 'member' ? '✕ Solo Editores/Admins' : '✓ Permitido'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-gray-700">Administrar catálogo de personas, perfiles de seguridad y roles ministeriales</span>
                  <span className={activeMembership?.role !== 'church_admin' && activeMembership?.role !== 'worship_director' ? 'text-gray-400 font-medium' : 'text-emerald-600 font-bold'}>
                    {activeMembership?.role !== 'church_admin' && activeMembership?.role !== 'worship_director' ? '✕ Solo Editores/Admins' : '✓ Permitido'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
