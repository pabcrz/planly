import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { ChurchMembership, Person } from '@/types/models'

export type MembershipWithPerson = ChurchMembership & { person: Person | null }

const freeTextListSchema = z.array(z.string().trim().min(1).max(50)).max(20)

const createProfileSchema = z.object({
  membership_id: z.string().uuid(),
  display_name: z.string().trim().min(1, 'Display name is required').max(100),
  instruments: freeTextListSchema.default([]),
  musical_roles: freeTextListSchema.default([]),
})

const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1, 'Display name is required').max(100).optional(),
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
