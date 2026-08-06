import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Church, ChurchMembership } from '@/types/models'

export interface AuthResult {
  user: User
  session: Session | null
}

export type MembershipWithChurch = ChurchMembership & { church: Church }

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
