import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { MembershipWithPerson } from '@/services/peopleService'
import type { Json } from '@/types/database'
import type {
  Service,
  ServiceParticipant,
  ServiceStatus,
  Setlist,
  SetlistItem,
  Song,
  SongVersion,
  Team,
} from '@/types/models'

export interface ServiceFilters {
  dateFrom?: string
  dateTo?: string
  teamId?: string
  status?: ServiceStatus
}

export type ServiceWithTeam = Service & { team: Pick<Team, 'id' | 'name'> }
export type SetlistItemWithSong = SetlistItem & {
  song: Pick<Song, 'id' | 'title' | 'author'>
  version: Pick<SongVersion, 'id' | 'version_name' | 'key'>
}
export type ParticipantWithDetails = ServiceParticipant & {
  membership: MembershipWithPerson
  roles: { role: string }[]
}

// Snapshot persisted to setlists.frozen_content on freeze; the public view
// renders from this shape post-freeze (spec: setlist-freeze).
export interface FrozenSetlistItem {
  sort_order: number
  song_id: string
  song_version_id: string
  title: string
  version_name: string
  key: string
  notes: string | null
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM')

const createServiceSchema = z.object({
  church_id: z.string().uuid(),
  team_id: z.string().uuid('Team is required'),
  service_date: dateSchema,
  start_time: timeSchema,
  timezone: z.string().trim().min(1, 'Timezone is required').max(60),
  notes: z.string().trim().max(2000).nullish(),
})

const updateServiceSchema = z.object({
  team_id: z.string().uuid().optional(),
  service_date: dateSchema.optional(),
  start_time: timeSchema.optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
  notes: z.string().trim().max(2000).nullish(),
})

const addSetlistItemSchema = z.object({
  setlist_id: z.string().uuid(),
  song_id: z.string().uuid(),
  song_version_id: z.string().uuid(),
  key: z.string().trim().min(1, 'Key is required').max(10),
  notes: z.string().trim().max(500).nullish(),
})

const updateSetlistItemSchema = z.object({
  key: z.string().trim().min(1, 'Key is required').max(10).optional(),
  notes: z.string().trim().max(500).nullish(),
})

const roleSchema = z.string().trim().min(1, 'Role is required').max(50)

export type CreateServiceInput = z.input<typeof createServiceSchema>
export type UpdateServiceInput = z.input<typeof updateServiceSchema>
export type AddSetlistItemInput = z.input<typeof addSetlistItemSchema>
export type UpdateSetlistItemInput = z.input<typeof updateSetlistItemSchema>

// Role enforcement lives in RLS (services_*_leader / services_delete_admin /
// items_*_leader / participants_*_leader); these functions throw on denial.

export async function getServices(churchId: string, filters: ServiceFilters = {}): Promise<ServiceWithTeam[]> {
  let query = supabase
    .from('services')
    .select('*, team:teams(id, name)')
    .eq('church_id', churchId)
  if (filters.dateFrom) query = query.gte('service_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('service_date', filters.dateTo)
  if (filters.teamId) query = query.eq('team_id', filters.teamId)
  if (filters.status) query = query.eq('status', filters.status)
  const { data, error } = await query.order('service_date').order('start_time')
  if (error) throw error
  return data as ServiceWithTeam[]
}

export async function getService(id: string): Promise<ServiceWithTeam> {
  const { data, error } = await supabase
    .from('services')
    .select('*, team:teams(id, name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as ServiceWithTeam
}

// The setlist row is created right after the service (1:1 per spec); if the
// second insert fails we roll back the service row to avoid orphans.
export async function createService(input: CreateServiceInput): Promise<Service> {
  const parsed = createServiceSchema.parse(input)
  const { data: service, error } = await supabase
    .from('services')
    .insert({ ...parsed, notes: parsed.notes ?? null })
    .select()
    .single()
  if (error) throw error
  const { error: setlistError } = await supabase.from('setlists').insert({ service_id: service.id })
  if (setlistError) {
    await supabase.from('services').delete().eq('id', service.id)
    throw setlistError
  }
  return service
}

// Parsed values may contain undefined; JSON serialization drops those keys,
// so unchanged fields are never sent on update. null is sent explicitly.
// Status changes must go through changeStatus (transition rules), not here.
export async function updateService(id: string, input: UpdateServiceInput): Promise<Service> {
  const parsed = updateServiceSchema.parse(input)
  const { data, error } = await supabase.from('services').update(parsed).eq('id', id).select().single()
  if (error) throw error
  return data
}

// church_admin-only per RLS services_delete_admin; setlist, items and
// participants are removed by ON DELETE CASCADE.
export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

// Forward-only transitions: planned → active → completed. completed is
// terminal (spec: service-edit-and-status-transition).
const ALLOWED_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  planned: ['active', 'completed'],
  active: ['completed'],
  completed: [],
}

export async function changeStatus(id: string, newStatus: ServiceStatus): Promise<Service> {
  const { data: current, error: fetchError } = await supabase.from('services').select('*').eq('id', id).single()
  if (fetchError) throw fetchError
  if (current.status === newStatus) return current
  if (!ALLOWED_TRANSITIONS[current.status as ServiceStatus].includes(newStatus)) {
    throw new Error(`Cannot transition from ${current.status} to ${newStatus}`)
  }
  const { data, error } = await supabase.from('services').update({ status: newStatus }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getSetlist(serviceId: string): Promise<Setlist | null> {
  const { data, error } = await supabase.from('setlists').select('*').eq('service_id', serviceId).maybeSingle()
  if (error) throw error
  return data
}

export async function getSetlistById(id: string): Promise<Setlist> {
  const { data, error } = await supabase.from('setlists').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getSetlistItems(setlistId: string): Promise<SetlistItemWithSong[]> {
  const { data, error } = await supabase
    .from('setlist_items')
    .select('*, song:songs(id, title, author), version:song_versions(id, version_name, key)')
    .eq('setlist_id', setlistId)
    .order('sort_order')
  if (error) throw error
  return data as SetlistItemWithSong[]
}

async function assertSetlistEditable(setlistId: string): Promise<void> {
  const setlist = await getSetlistById(setlistId)
  if (setlist.frozen_at) throw new Error('Setlist is frozen')
}

// Appends at the end: sort_order = current max + 1 (spec: setlist-items).
export async function addSetlistItem(input: AddSetlistItemInput): Promise<SetlistItem> {
  const parsed = addSetlistItemSchema.parse(input)
  await assertSetlistEditable(parsed.setlist_id)
  const existing = await getSetlistItems(parsed.setlist_id)
  const nextOrder = existing.length === 0 ? 1 : Math.max(...existing.map((i) => i.sort_order)) + 1
  const { data, error } = await supabase
    .from('setlist_items')
    .insert({ ...parsed, notes: parsed.notes ?? null, sort_order: nextOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSetlistItem(id: string, input: UpdateSetlistItemInput): Promise<SetlistItem> {
  const parsed = updateSetlistItemSchema.parse(input)
  const { data: item, error: fetchError } = await supabase.from('setlist_items').select('setlist_id').eq('id', id).single()
  if (fetchError) throw fetchError
  await assertSetlistEditable(item.setlist_id)
  const { data, error } = await supabase.from('setlist_items').update(parsed).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Renumbers the whole setlist after moving one item. UNIQUE(setlist_id,
// sort_order) forces a two-pass write: park items on negative placeholders,
// then assign the final contiguous 1..N order.
export async function reorderSetlistItem(id: string, newSortOrder: number): Promise<void> {
  const { data: item, error: fetchError } = await supabase.from('setlist_items').select('*').eq('id', id).single()
  if (fetchError) throw fetchError
  await assertSetlistEditable(item.setlist_id)
  const items = await getSetlistItems(item.setlist_id)
  const target = Math.min(Math.max(1, newSortOrder), items.length)
  if (target === item.sort_order) return
  const reordered = items.filter((i) => i.id !== id)
  reordered.splice(target - 1, 0, item as SetlistItemWithSong)
  for (const [index, entry] of reordered.entries()) {
    const { error } = await supabase.from('setlist_items').update({ sort_order: -(index + 1) }).eq('id', entry.id)
    if (error) throw error
  }
  for (const [index, entry] of reordered.entries()) {
    const { error } = await supabase.from('setlist_items').update({ sort_order: index + 1 }).eq('id', entry.id)
    if (error) throw error
  }
}

// Deleting frees the slot, so decrementing higher-numbered siblings in
// ascending order keeps (setlist_id, sort_order) unique without a temp pass.
export async function removeSetlistItem(id: string): Promise<void> {
  const { data: item, error: fetchError } = await supabase.from('setlist_items').select('*').eq('id', id).single()
  if (fetchError) throw fetchError
  await assertSetlistEditable(item.setlist_id)
  const { error } = await supabase.from('setlist_items').delete().eq('id', id)
  if (error) throw error
  const { data: siblings, error: siblingsError } = await supabase
    .from('setlist_items')
    .select('id, sort_order')
    .eq('setlist_id', item.setlist_id)
    .gt('sort_order', item.sort_order)
    .order('sort_order')
  if (siblingsError) throw siblingsError
  for (const sibling of siblings) {
    const { error: updateError } = await supabase
      .from('setlist_items')
      .update({ sort_order: sibling.sort_order - 1 })
      .eq('id', sibling.id)
    if (updateError) throw updateError
  }
}

// Snapshots the current items into frozen_content and stamps frozen_at. RLS
// setlists_update_leader (frozen_at IS NULL) makes this a one-way operation.
export async function freezeSetlist(serviceId: string): Promise<Setlist> {
  const setlist = await getSetlist(serviceId)
  if (!setlist) throw new Error('Setlist not found')
  if (setlist.frozen_at) throw new Error('Setlist is already frozen')
  const items = await getSetlistItems(setlist.id)
  const snapshot: FrozenSetlistItem[] = items.map((item) => ({
    sort_order: item.sort_order,
    song_id: item.song_id,
    song_version_id: item.song_version_id,
    title: item.song.title,
    version_name: item.version.version_name,
    key: item.key,
    notes: item.notes,
  }))
  const { data, error } = await supabase
    .from('setlists')
    .update({ frozen_at: new Date().toISOString(), frozen_content: snapshot as unknown as Json })
    .eq('id', setlist.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getParticipants(serviceId: string): Promise<ParticipantWithDetails[]> {
  const { data, error } = await supabase
    .from('service_participants')
    .select('*, membership:church_memberships(*, person:people(*)), roles:service_member_roles(role)')
    .eq('service_id', serviceId)
  if (error) throw error
  return data as ParticipantWithDetails[]
}

// UNIQUE(service_id, membership_id) rejects duplicates with a 23505.
export async function addParticipant(serviceId: string, membershipId: string): Promise<ServiceParticipant> {
  const { data, error } = await supabase
    .from('service_participants')
    .insert({ service_id: serviceId, membership_id: membershipId })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('This member is already a participant')
    throw error
  }
  return data
}

// service_member_roles rows are removed by ON DELETE CASCADE.
export async function removeParticipant(participantId: string): Promise<void> {
  const { error } = await supabase.from('service_participants').delete().eq('id', participantId)
  if (error) throw error
}

export async function addParticipantRole(participantId: string, role: string): Promise<void> {
  const parsed = roleSchema.parse(role)
  const { error } = await supabase
    .from('service_member_roles')
    .insert({ service_participant_id: participantId, role: parsed })
  if (error && error.code !== '23505') throw error
}

export async function removeParticipantRole(participantId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from('service_member_roles')
    .delete()
    .eq('service_participant_id', participantId)
    .eq('role', role)
  if (error) throw error
}
