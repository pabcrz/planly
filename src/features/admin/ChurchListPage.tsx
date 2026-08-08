import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { adminApi } from '@/services/adminService'
import { CreateChurchForm } from './CreateChurchForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { toastPromise } from '@/lib/toast'
import type { Church } from '@/types/models'
import { Users, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function EditChurchModal({ church, onClose, onUpdated }: { church: Church | null; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (church) {
      setName(church.name)
      setSlug(church.slug)
    }
  }, [church])

  if (!church) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('churches').update({ name: name.trim(), slug: slug.trim() }).eq('id', church.id)
      if (error) {
        throw error
      }
      toastPromise(Promise.resolve(), { loading: '', success: 'Iglesia actualizada.' })
      onUpdated()
      onClose()
    } catch {
      // Handled
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!church} onClose={onClose} title="Editar Iglesia">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la iglesia</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ChurchListPage() {
  const [page, setPage] = useState(1)
  const [deletingChurch, setDeletingChurch] = useState<Church | null>(null)
  const [editingChurch, setEditingChurch] = useState<Church | null>(null)

  const churchesQuery = useQuery({ queryKey: ['admin-churches', page], queryFn: () => adminApi.listChurches(page, 25) })
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers(1, 100) })

  if (churchesQuery.isLoading || usersQuery.isLoading) return <p className="text-sm text-gray-600">Cargando iglesias...</p>
  if (churchesQuery.isError || usersQuery.isError || !churchesQuery.data || !usersQuery.data)
    return <p role="alert" className="text-sm text-red-700">No fue posible cargar las iglesias.</p>

  const { churches, next_page: nextPage, total } = churchesQuery.data

  const handleDelete = async (churchId: string) => {
    try {
      await toastPromise(adminApi.deleteChurch(churchId), {
        loading: 'Eliminando iglesia y sus datos de plataforma...',
        success: 'Iglesia eliminada permanentemente.',
      })
      setDeletingChurch(null)
      void churchesQuery.refetch()
    } catch {}
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="mb-4 text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">Registrar nueva Iglesia</h2>
        <CreateChurchForm users={usersQuery.data.users} onComplete={() => void churchesQuery.refetch()} />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Iglesias en la Plataforma</h2>
            <p className="text-xs text-gray-500 mt-0.5">Administración global y monitoreo de congregaciones</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/60">
            {total} iglesias activas
          </span>
        </div>

        {churches.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 font-medium">No hay iglesias registradas en la plataforma.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {churches.map((church) => (
              <li key={church.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <strong className="text-base font-bold text-gray-900 truncate">{church.name}</strong>
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">/{church.slug}</span>
                  </span>
                  <span className="block mt-1 text-xs text-gray-400 font-mono">UUID: {church.id}</span>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-end border-t sm:border-0 pt-2 sm:pt-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100/80 border border-gray-200 px-3 py-1 rounded-full">
                    <Users className="h-3.5 w-3.5 text-gray-500" />
                    <span>{church.member_count} miembros</span>
                  </span>
                  <Button
                    type="button"
                    aria-label={`Editar ${church.name}`}
                    onClick={() => setEditingChurch(church)}
                    variant="secondary"
                    size="sm"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    type="button"
                    aria-label={`Eliminar ${church.name}`}
                    onClick={() => setDeletingChurch(church)}
                    variant="danger"
                    size="sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eliminar</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <Button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
            variant="secondary"
          >
            ← Página Anterior
          </Button>
          <span className="text-xs font-semibold text-gray-500">Página {page}</span>
          <Button
            type="button"
            disabled={!nextPage}
            onClick={() => nextPage && setPage(nextPage)}
            variant="secondary"
          >
            Siguiente Página →
          </Button>
        </div>
      </section>

      <EditChurchModal
        church={editingChurch}
        onClose={() => setEditingChurch(null)}
        onUpdated={() => void churchesQuery.refetch()}
      />

      <ConfirmDialog
        open={!!deletingChurch}
        title="Eliminar Iglesia Permanentemente"
        message={`¿Estás completamente seguro de que deseas eliminar la iglesia "${deletingChurch?.name}"? Esta acción eliminará permanentemente todos los servicios programados, repertorios y membresías de este equipo de la plataforma. Esta acción NO se puede deshacer.`}
        onConfirm={() => deletingChurch && void handleDelete(deletingChurch.id)}
        onCancel={() => setDeletingChurch(null)}
      />
    </div>
  )
}
