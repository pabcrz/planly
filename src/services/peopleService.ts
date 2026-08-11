import { z } from 'zod'
import { pgUuid } from '@/lib/validation'
import { supabase } from '@/lib/supabase'
import type { ChurchMembership, Person } from '@/types/models'

export type MembershipWithPerson = ChurchMembership & { person: Person | null }

const freeTextListSchema = z.array(z.string().trim().min(1).max(50)).max(20)

const createProfileSchema = z.object({
  membership_id: pgUuid(),
  display_name: z.string().trim().min(1, 'El nombre para mostrar es obligatorio').max(100),
  instruments: freeTextListSchema.default([]),
  musical_roles: freeTextListSchema.default([]),
})

const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1, 'El nombre para mostrar es obligatorio').max(100).optional(),
  instruments: freeTextListSchema.optional(),
  musical_roles: freeTextListSchema.optional(),
})

export type CreateProfileInput = z.input<typeof createProfileSchema>
export type UpdateProfileInput = z.input<typeof updateProfileSchema>

// Church roster: every membership, with the person's profile embedded when it
// exists (RLS people_select restricts reads to church members).
export async function getPeople(churchId: string): Promise<MembershipWithPerson[]> {
  const { data, error } = await supabase
    .from('church_memberships')
    .select('*, person:people(*)')
    .eq('church_id', churchId)
    .order('joined_at')
  if (error) throw error
  return data as MembershipWithPerson[]
}

export async function getPerson(membershipId: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('membership_id', membershipId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProfile(input: CreateProfileInput): Promise<Person> {
  const parsed = createProfileSchema.parse(input)
  const { data, error } = await supabase.from('people').insert(parsed).select().single()
  if (error) throw error
  return data
}

export async function updateProfile(membershipId: string, input: UpdateProfileInput): Promise<Person> {
  const parsed = updateProfileSchema.parse(input)
  const { data, error } = await supabase
    .from('people')
    .update(parsed)
    .eq('membership_id', membershipId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Upsert pattern for the own-profile editor: insert on first save, update after.
// people.membership_id is the primary key; RLS people_insert_own /
// people_update_own both restrict to the owner's own membership row.
export async function upsertProfile(input: CreateProfileInput): Promise<Person> {
  const parsed = createProfileSchema.parse(input)
  const { data, error } = await supabase.from('people').upsert(parsed).select().single()
  if (error) throw error
  return data
}

export async function updateMembershipRole(membershipId: string, role: ChurchMembership['role']): Promise<ChurchMembership> {
  const { data, error } = await supabase
    .from('church_memberships')
    .update({ role })
    .eq('id', membershipId)
    .select()
    .single()
  if (error) throw error
  return data as ChurchMembership
}

export async function deleteMembership(membershipId: string): Promise<void> {
  const { error } = await supabase.from('church_memberships').delete().eq('id', membershipId)
  if (error) throw error
}

export async function updatePersonRolesAndProfile(
  membershipId: string,
  input: { display_name?: string; musical_roles: string[]; instruments?: string[] }
): Promise<Person> {
  const { data: existing } = await supabase.from('people').select('display_name').eq('membership_id', membershipId).maybeSingle()
  const name = input.display_name?.trim() || existing?.display_name || 'Miembro del equipo'

  const { data, error } = await supabase
    .from('people')
    .upsert({
      membership_id: membershipId,
      display_name: name,
      musical_roles: input.musical_roles,
      instruments: input.instruments || [],
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface ChurchSettings {
  musical_roles?: string[]
  service_types?: string[]
}

export async function getChurchSettings(churchId: string): Promise<ChurchSettings> {
  const { data, error } = await supabase.from('churches').select('settings').eq('id', churchId).single()
  if (error) throw error
  const settings = (data?.settings || {}) as ChurchSettings
  return {
    ...settings,
    service_types: settings.service_types && settings.service_types.length > 0 ? settings.service_types : ['general'],
  }
}

export async function updateChurchMusicalRoles(churchId: string, musicalRoles: string[]): Promise<void> {
  const { data: existing } = await supabase.from('churches').select('settings').eq('id', churchId).single()
  const settings = (existing?.settings && typeof existing.settings === 'object' && !Array.isArray(existing.settings) ? existing.settings : {}) as Record<string, unknown>
  const updatedSettings = { ...settings, musical_roles: musicalRoles }

  const { error } = await supabase
    .from('churches')
    .update({ settings: updatedSettings as any })
    .eq('id', churchId)
  if (error) throw error
}

export async function updateChurchServiceTypes(churchId: string, serviceTypes: string[]): Promise<void> {
  const { data: existing } = await supabase.from('churches').select('settings').eq('id', churchId).single()
  const settings = (existing?.settings && typeof existing.settings === 'object' && !Array.isArray(existing.settings) ? existing.settings : {}) as Record<string, unknown>
  const cleanTypes = Array.from(new Set(['general', ...serviceTypes.map((t) => t.trim()).filter(Boolean)]))
  const updatedSettings = { ...settings, service_types: cleanTypes }

  const { error } = await supabase
    .from('churches')
    .update({ settings: updatedSettings as any })
    .eq('id', churchId)
  if (error) throw error
}

