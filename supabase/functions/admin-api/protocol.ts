export const roles = ['church_admin', 'worship_director', 'member'] as const
export type ChurchRole = (typeof roles)[number]

export type AdminAction =
  | 'list_users'
  | 'invite_user'
  | 'deactivate_user'
  | 'reactivate_user'
  | 'create_membership'
  | 'update_membership_role'
  | 'revoke_membership'
  | 'create_church'
  | 'delete_church'
  | 'list_churches'
  | 'generate_recovery_link'

export type AdminRequest =
  | { action: 'list_users'; page: number; per_page: number }
  | { action: 'list_churches'; page: number; per_page: number }
  | { action: 'invite_user'; email: string; church_id: string; role: ChurchRole }
  | { action: 'deactivate_user'; user_id: string; membership_mode: 'retain' | 'revoke_all' | 'revoke_selected'; membership_ids?: string[] }
  | { action: 'reactivate_user'; user_id: string }
  | { action: 'create_membership'; user_id: string; church_id: string; role: ChurchRole }
  | { action: 'update_membership_role'; membership_id: string; role: ChurchRole }
  | { action: 'revoke_membership'; membership_id: string }
  | { action: 'create_church'; name: string; slug: string; founding_admin_user_id: string }
  | { action: 'delete_church'; church_id: string }
  | { action: 'generate_recovery_link'; user_id: string }

export type ErrorCode =
  | 'bad_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'invariant_violation'
  | 'auth_dependency_failed'
  | 'internal_error'

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly cleanupRequired: boolean

  constructor(code: ErrorCode, status: number, cleanupRequired = false) {
    super(code)
    this.code = code
    this.status = status
    this.cleanupRequired = cleanupRequired
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('bad_request', 400)
  return value as Record<string, unknown>
}

function exact(input: Record<string, unknown>, keys: string[]) {
  if (Object.keys(input).some((key) => !keys.includes(key))) throw new ApiError('bad_request', 400)
}

function requiredString(value: unknown, max = 255): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new ApiError('bad_request', 400)
  return value.trim()
}

function requiredUuid(value: unknown): string {
  const result = requiredString(value, 36)
  if (!uuid.test(result)) throw new ApiError('bad_request', 400)
  return result
}

function role(value: unknown): ChurchRole {
  if (!roles.includes(value as ChurchRole)) throw new ApiError('bad_request', 400)
  return value as ChurchRole
}

function page(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 100) throw new ApiError('bad_request', 400)
  return value as number
}

export function normalizeEmail(value: unknown): string {
  const result = requiredString(value).toLowerCase()
  if (!email.test(result)) throw new ApiError('bad_request', 400)
  return result
}

export function normalizeSlug(value: unknown): string {
  const result = requiredString(value, 60).toLowerCase()
  if (!slug.test(result)) throw new ApiError('bad_request', 400)
  return result
}

export function parseRequest(value: unknown): AdminRequest {
  const input = record(value)
  switch (input.action) {
    case 'list_users':
      exact(input, ['action', 'page', 'per_page'])
      return { action: 'list_users', page: page(input.page, 1), per_page: page(input.per_page, 25) }
    case 'list_churches':
      exact(input, ['action', 'page', 'per_page'])
      return { action: 'list_churches', page: page(input.page, 1), per_page: page(input.per_page, 25) }
    case 'invite_user':
      exact(input, ['action', 'email', 'church_id', 'role'])
      return { action: 'invite_user', email: normalizeEmail(input.email), church_id: requiredUuid(input.church_id), role: role(input.role) }
    case 'deactivate_user': {
      exact(input, ['action', 'user_id', 'membership_mode', 'membership_ids'])
      const membershipMode = input.membership_mode
      if (!['retain', 'revoke_all', 'revoke_selected'].includes(membershipMode as string)) throw new ApiError('bad_request', 400)
      if (membershipMode === 'revoke_selected') {
        if (!Array.isArray(input.membership_ids) || input.membership_ids.length === 0 || input.membership_ids.some((id) => !uuid.test(String(id)))) throw new ApiError('bad_request', 400)
        return { action: 'deactivate_user', user_id: requiredUuid(input.user_id), membership_mode: membershipMode, membership_ids: [...new Set(input.membership_ids as string[])] }
      }
      if (input.membership_ids !== undefined) throw new ApiError('bad_request', 400)
      return { action: 'deactivate_user', user_id: requiredUuid(input.user_id), membership_mode: membershipMode }
    }
    case 'reactivate_user':
      exact(input, ['action', 'user_id'])
      return { action: 'reactivate_user', user_id: requiredUuid(input.user_id) }
    case 'create_membership':
      exact(input, ['action', 'user_id', 'church_id', 'role'])
      return { action: 'create_membership', user_id: requiredUuid(input.user_id), church_id: requiredUuid(input.church_id), role: role(input.role) }
    case 'update_membership_role':
      exact(input, ['action', 'membership_id', 'role'])
      return { action: 'update_membership_role', membership_id: requiredUuid(input.membership_id), role: role(input.role) }
    case 'revoke_membership':
      exact(input, ['action', 'membership_id'])
      return { action: 'revoke_membership', membership_id: requiredUuid(input.membership_id) }
    case 'create_church':
      exact(input, ['action', 'name', 'slug', 'founding_admin_user_id'])
      return { action: 'create_church', name: requiredString(input.name, 100), slug: normalizeSlug(input.slug), founding_admin_user_id: requiredUuid(input.founding_admin_user_id) }
    case 'delete_church':
      exact(input, ['action', 'church_id'])
      return { action: 'delete_church', church_id: requiredUuid(input.church_id) }
    case 'generate_recovery_link':
      exact(input, ['action', 'user_id'])
      return { action: 'generate_recovery_link', user_id: requiredUuid(input.user_id) }
    default:
      throw new ApiError('bad_request', 400)
  }
}

const messages: Record<ErrorCode, string> = {
  bad_request: 'La solicitud no es válida.', unauthenticated: 'La sesión no es válida.', forbidden: 'No tienes permiso para realizar esta acción.',
  not_found: 'No se encontró el recurso solicitado.', conflict: 'La operación entra en conflicto con el estado actual.',
  invariant_violation: 'La operación no cumple una regla de seguridad.', auth_dependency_failed: 'No se pudo completar la operación de autenticación.',
  internal_error: 'No se pudo completar la operación.',
}

export function errorPayload(error: unknown) {
  const known = error instanceof ApiError ? error : new ApiError('internal_error', 500)
  return { status: known.status, body: { ok: false as const, error: { code: known.code, message: messages[known.code] }, ...(known.cleanupRequired ? { details: { cleanup_required: true } } : {}) } }
}
