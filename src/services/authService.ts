import type { Session, User } from '@supabase/supabase-js'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Church, ChurchMembership } from '@/types/models'

export interface AuthResult {
  user: User
  session: Session | null
}

export type MembershipWithChurch = ChurchMembership & { church: Church }

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user) throw new Error('Sign up failed: no user returned')
  return { user: data.user, session: data.session }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { user: data.user, session: data.session }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function getMemberships(userId: string): Promise<MembershipWithChurch[]> {
  const { data, error } = await supabase
    .from('church_memberships')
    .select('*, church:churches(*)')
    .eq('user_id', userId)
  if (error) throw error
  return data as MembershipWithChurch[]
}

const createChurchSchema = z.object({
  name: z.string().trim().min(2, 'Church name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  timezone: z.string().trim().min(1, 'Timezone is required'),
})

export type CreateChurchInput = z.infer<typeof createChurchSchema>

export async function createChurch(input: CreateChurchInput): Promise<Church> {
  const parsed = createChurchSchema.parse(input)

  const { data: existing, error: slugError } = await supabase
    .from('churches')
    .select('id')
    .eq('slug', parsed.slug)
    .maybeSingle()
  if (slugError) throw slugError
  if (existing) throw new Error(`Slug "${parsed.slug}" is already taken`)

  // RPC atomically creates the church and the founding church_admin membership
  // (RLS blocks a direct membership insert for a church with no members).
  const { data, error } = await supabase.rpc('create_church', {
    church_name: parsed.name,
    church_slug: parsed.slug,
    church_timezone: parsed.timezone,
  })
  if (error) throw error
  return data
}

export async function joinChurch(churchId: string): Promise<ChurchMembership> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('church_memberships')
    .insert({ user_id: userData.user.id, church_id: churchId, role: 'member' })
    .select()
    .single()
  if (error) throw error
  return data
}
