import type { Church, ChurchMembership, ChurchRole, UserAccessState } from './models'

export type AdminAction = 'list_users' | 'list_churches' | 'invite_user' | 'deactivate_user' | 'reactivate_user' | 'create_membership' | 'update_membership_role' | 'revoke_membership' | 'create_church' | 'delete_church' | 'generate_recovery_link'
export type AdminErrorCode = 'bad_request' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'invariant_violation' | 'auth_dependency_failed' | 'internal_error'
export type AdminSuccess<T> = { ok: true; data: T }
export type AdminFailure = { ok: false; error: { code: AdminErrorCode; message: string }; details?: { cleanup_required?: boolean } }
export type AdminResponse<T> = AdminSuccess<T> | AdminFailure

export type AdminUser = { id: string; email: string | null; status: UserAccessState['status']; memberships: ChurchMembership[] }
export type ListUsersRequest = { action: 'list_users'; page?: number; per_page?: number }
export type ListChurchesRequest = { action: 'list_churches'; page?: number; per_page?: number }
export type InviteUserRequest = { action: 'invite_user'; email: string; church_id: string; role: ChurchRole }
export type DeactivateUserRequest = { action: 'deactivate_user'; user_id: string; membership_mode: 'retain' | 'revoke_all' | 'revoke_selected'; membership_ids?: string[] }
export type ReactivateUserRequest = { action: 'reactivate_user'; user_id: string }
export type CreateMembershipRequest = { action: 'create_membership'; user_id: string; church_id: string; role: ChurchRole }
export type UpdateMembershipRoleRequest = { action: 'update_membership_role'; membership_id: string; role: ChurchRole }
export type RevokeMembershipRequest = { action: 'revoke_membership'; membership_id: string }
export type CreateChurchRequest = { action: 'create_church'; name: string; slug: string; founding_admin_user_id: string }
export type DeleteChurchRequest = { action: 'delete_church'; church_id: string }
export type GenerateRecoveryLinkRequest = { action: 'generate_recovery_link'; user_id: string }
export type AdminRequest = ListUsersRequest | ListChurchesRequest | InviteUserRequest | DeactivateUserRequest | ReactivateUserRequest | CreateMembershipRequest | UpdateMembershipRoleRequest | RevokeMembershipRequest | CreateChurchRequest | DeleteChurchRequest | GenerateRecoveryLinkRequest

export type AdminResult = {
  list_users: { users: AdminUser[]; page: number; per_page: number; total: number; next_page: number | null }
  list_churches: { churches: (Church & { member_count: number })[]; page: number; per_page: number; total: number; next_page: number | null }
  invite_user: { user_id: string; email: string; status: UserAccessState['status']; membership: ChurchMembership; invitation_sent: boolean; created: boolean; action_link?: string | null }
  deactivate_user: { user_id: string; status: 'inactive'; revoked_membership_ids: string[]; refresh_sessions_revoked: false }
  reactivate_user: { user_id: string; status: 'active' | 'pending' }
  create_membership: { membership: ChurchMembership }
  update_membership_role: { membership: ChurchMembership }
  revoke_membership: { membership_id: string; revoked: boolean }
  create_church: { church: Church; founding_membership: ChurchMembership }
  delete_church: { church_id: string; deleted: boolean }
  generate_recovery_link: { action_link: string }
}
