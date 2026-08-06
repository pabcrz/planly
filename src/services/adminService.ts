import { supabase } from '@/lib/supabase'
import type { AdminErrorCode, AdminRequest, AdminResponse, AdminResult } from '@/types/admin'

export class AdminApiError extends Error {
  readonly code: AdminErrorCode

  constructor(code: AdminErrorCode) {
    super(code)
    this.code = code
  }
}

export class AdminApiClient {
  private async invoke<A extends AdminRequest['action']>(body: Extract<AdminRequest, { action: A }>): Promise<AdminResult[A]> {
    const { data, error } = await supabase.functions.invoke<AdminResponse<AdminResult[A]>>('admin-api', { body })
    if (error || !data) throw new AdminApiError('internal_error')
    if (!data.ok) throw new AdminApiError(data.error.code)
    return data.data
  }

  listUsers(page?: number, perPage?: number) { return this.invoke({ action: 'list_users', page, per_page: perPage }) }
  listChurches(page?: number, perPage?: number) { return this.invoke({ action: 'list_churches', page, per_page: perPage }) }
  inviteUser(email: string, churchId: string, role: Extract<AdminRequest, { action: 'invite_user' }>['role']) { return this.invoke({ action: 'invite_user', email, church_id: churchId, role }) }
  deactivateUser(userId: string, membershipMode: Extract<AdminRequest, { action: 'deactivate_user' }>['membership_mode'], membershipIds?: string[]) { return this.invoke({ action: 'deactivate_user', user_id: userId, membership_mode: membershipMode, membership_ids: membershipIds }) }
  reactivateUser(userId: string) { return this.invoke({ action: 'reactivate_user', user_id: userId }) }
  createMembership(userId: string, churchId: string, role: Extract<AdminRequest, { action: 'create_membership' }>['role']) { return this.invoke({ action: 'create_membership', user_id: userId, church_id: churchId, role }) }
  updateMembershipRole(membershipId: string, role: Extract<AdminRequest, { action: 'update_membership_role' }>['role']) { return this.invoke({ action: 'update_membership_role', membership_id: membershipId, role }) }
  revokeMembership(membershipId: string) { return this.invoke({ action: 'revoke_membership', membership_id: membershipId }) }
  createChurch(name: string, slug: string, foundingAdminUserId: string) { return this.invoke({ action: 'create_church', name, slug, founding_admin_user_id: foundingAdminUserId }) }
  deleteChurch(churchId: string) { return this.invoke({ action: 'delete_church', church_id: churchId }) }
  generateRecoveryLink(userId: string) { return this.invoke({ action: 'generate_recovery_link', user_id: userId }) }
}

export const adminApi = new AdminApiClient()
