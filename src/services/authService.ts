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
  const { data: adminData } = await (supabase as any).from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()
  const isSuperAdmin = !!adminData

  const { data, error } = await supabase
    .from('church_memberships')
    .select('*, church:churches(*)')
    .eq('user_id', userId)
  if (error) throw error

  let memberships = data as MembershipWithChurch[]

  if (isSuperAdmin) {
    const { data: allChurches } = await supabase.from('churches').select('*')
    if (allChurches) {
      const existingChurchIds = new Set(memberships.map((m) => m.church_id))
      const missingChurches = allChurches.filter((c) => !existingChurchIds.has(c.id))
      const extraMemberships: MembershipWithChurch[] = missingChurches.map((c) => ({
        id: `super-${c.id}`,
        user_id: userId,
        church_id: c.id,
        role: 'church_admin',
        joined_at: new Date().toISOString(),
        church: c,
      }))
      memberships = [...memberships, ...extraMemberships]
    }
  }

  return memberships
}
