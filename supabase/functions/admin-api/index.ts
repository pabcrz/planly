import { createClient } from '@supabase/supabase-js'
import { ApiError, errorPayload, parseRequest, type AdminRequest } from './protocol.ts'

const url = Deno.env.get('SUPABASE_URL')
const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !publicKey || !secretKey) throw new Error('Missing Edge Function configuration')

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
const allowedOrigins = new Set((Deno.env.get('ADMIN_API_ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean))

function headers(request: Request) {
  const origin = request.headers.get('origin')
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || allowedOrigins.has(origin)
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) })
}

function failed(request: Request, error: unknown) {
  const result = errorPayload(error)
  return json(request, result.body, result.status)
}

async function authorize(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) throw new ApiError('unauthenticated', 401)
  const token = authorization.slice(7).trim()
  if (!token) throw new ApiError('unauthenticated', 401)
  const caller = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await caller.auth.getUser(token)
  if (error || !data.user) throw new ApiError('unauthenticated', 401)
  const [{ data: state, error: stateError }, { data: platformAdmin, error: adminError }] = await Promise.all([
    admin.from('user_access_state').select('status').eq('user_id', data.user.id).maybeSingle(),
    admin.from('platform_admins').select('user_id').eq('user_id', data.user.id).maybeSingle(),
  ])
  if (stateError || adminError) throw new ApiError('internal_error', 500)
  if (state?.status !== 'active') throw new ApiError('forbidden', 403)
  return { caller, user: data.user, isPlatformAdmin: !!platformAdmin }
}

async function requireMembershipSafety(membership: { id: string; church_id: string; role: string }) {
  if (membership.role !== 'church_admin') return
  const { count, error } = await admin.from('church_memberships').select('id', { count: 'exact', head: true }).eq('church_id', membership.church_id).eq('role', 'church_admin')
  if (error) throw new ApiError('internal_error', 500)
  if ((count ?? 0) <= 1) throw new ApiError('invariant_violation', 422)
}

async function findUserByEmail(email: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw new ApiError('auth_dependency_failed', 502)
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < 100) return null
  }
  throw new ApiError('auth_dependency_failed', 502)
}

async function membershipFor(userId: string, churchId: string) {
  const { data, error } = await admin.from('church_memberships').select('id,user_id,church_id,role,joined_at').eq('user_id', userId).eq('church_id', churchId).maybeSingle()
  if (error) throw new ApiError('internal_error', 500)
  return data
}

async function listUsers(request: Extract<AdminRequest, { action: 'list_users' }>) {
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: request.page, perPage: request.per_page })
  if (authError) throw new ApiError('auth_dependency_failed', 502)
  const ids = authData.users.map((user) => user.id)
  const [{ data: states, error: statesError }, { data: memberships, error: membershipsError }] = await Promise.all([
    ids.length ? admin.from('user_access_state').select('user_id,status').in('user_id', ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from('church_memberships').select('id,user_id,church_id,role,joined_at').in('user_id', ids) : Promise.resolve({ data: [], error: null }),
  ])
  if (statesError || membershipsError) throw new ApiError('internal_error', 500)
  const statusByUser = new Map((states ?? []).map((state) => [state.user_id, state.status]))
  const membershipsByUser = new Map<string, unknown[]>()
  for (const membership of memberships ?? []) membershipsByUser.set(membership.user_id, [...(membershipsByUser.get(membership.user_id) ?? []), membership])
  const total = authData.total ?? authData.users.length
  return { users: authData.users.map((user) => ({ id: user.id, email: user.email ?? null, status: statusByUser.get(user.id) ?? 'pending', memberships: membershipsByUser.get(user.id) ?? [] })), page: request.page, per_page: request.per_page, total, next_page: request.page * request.per_page < total ? request.page + 1 : null }
}

async function listChurches(request: Extract<AdminRequest, { action: 'list_churches' }>) {
  const from = (request.page - 1) * request.per_page
  const to = from + request.per_page - 1
  const { data: churches, count, error: churchesError } = await admin
    .from('churches')
    .select('id,name,slug,type,timezone,settings,created_at', { count: 'exact' })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to)
  if (churchesError) throw new ApiError('internal_error', 500)
  const ids = (churches ?? []).map((church) => church.id)
  const { data: memberships, error: membershipsError } = ids.length
    ? await admin.from('church_memberships').select('church_id').in('church_id', ids)
    : { data: [], error: null }
  if (membershipsError) throw new ApiError('internal_error', 500)
  const memberCounts = new Map<string, number>()
  for (const membership of memberships ?? []) {
    memberCounts.set(membership.church_id, (memberCounts.get(membership.church_id) ?? 0) + 1)
  }
  const total = count ?? 0
  return {
    churches: (churches ?? []).map((church) => ({ ...church, member_count: memberCounts.get(church.id) ?? 0 })),
    page: request.page,
    per_page: request.per_page,
    total,
    next_page: request.page * request.per_page < total ? request.page + 1 : null,
  }
}

function buildCleanInviteUrl(req: Request, rawActionLink: string | null | undefined, tokenHash: string | null | undefined, type: 'invite' | 'recovery'): string | null {
  return rawActionLink ?? null
}

async function inviteUser(req: Request, request: Extract<AdminRequest, { action: 'invite_user' }>) {
  const emailLower = request.email.toLowerCase().trim()
  let user = await findUserByEmail(emailLower)
  let created = false
  let actionLink: string | null = null

  if (!user) {
    const origin = req.headers.get('origin') ?? Deno.env.get('PLANLY_ORIGIN') ?? 'http://localhost:5174'
    const redirectTo = `${origin}/auth/invite`
    const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email: emailLower, options: { redirectTo } })
    if (error || !data?.user) {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({ email: emailLower, email_confirm: true })
      if (createErr || !newUser?.user) throw new ApiError('auth_dependency_failed', 502)
      user = newUser.user
    } else {
      user = data.user
      actionLink = buildCleanInviteUrl(req, data.properties?.action_link, (data.properties as any)?.hashed_token, 'invite')
    }
    created = true
  } else {
    try {
      const origin = req.headers.get('origin') ?? Deno.env.get('PLANLY_ORIGIN') ?? 'http://localhost:5174'
      const redirectTo = `${origin}/auth/invite`
      const { data } = await admin.auth.admin.generateLink({ type: 'recovery', email: emailLower, options: { redirectTo } })
      if (data?.properties) {
        actionLink = buildCleanInviteUrl(req, data.properties.action_link, (data.properties as any)?.hashed_token, 'recovery')
      }
    } catch {
      // Ignore link generation error for existing user
    }
  }

  const existing = await membershipFor(user.id, request.church_id)
  if (existing) {
    if (existing.role !== request.role) {
      await admin.from('church_memberships').update({ role: request.role }).eq('id', existing.id)
    }
    const { data: state } = await admin.from('user_access_state').select('status').eq('user_id', user.id).maybeSingle()
    return {
      status: 200,
      data: {
        user_id: user.id,
        email: emailLower,
        status: state?.status ?? 'active',
        membership: { ...existing, role: request.role },
        invitation_sent: false,
        created: false,
        action_link: actionLink,
      },
    }
  }

  const { data: state } = await admin.from('user_access_state').select('status').eq('user_id', user.id).maybeSingle()
  if (!state) {
    await admin.from('user_access_state').upsert({ user_id: user.id, status: 'active' })
  }

  const { data: membership, error: membershipError } = await admin
    .from('church_memberships')
    .insert({ user_id: user.id, church_id: request.church_id, role: request.role })
    .select('id,user_id,church_id,role,joined_at')
    .single()

  if (membershipError) {
    throw new ApiError('internal_error', 500)
  }

  return {
    status: created ? 201 : 200,
    data: {
      user_id: user.id,
      email: emailLower,
      status: state?.status ?? 'active',
      membership,
      invitation_sent: true,
      created,
      action_link: actionLink,
    },
  }
}

async function generateRecoveryLink(request: Extract<AdminRequest, { action: 'generate_recovery_link' }>) {
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(request.user_id)
  if (targetError || !target.user || !target.user.email) throw new ApiError('not_found', 404)
  const redirectTo = `${Deno.env.get('PLANLY_ORIGIN') ?? 'http://localhost:5173'}/auth/invite`
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: target.user.email, options: { redirectTo } })
  if (error || !data.properties?.action_link) throw new ApiError('auth_dependency_failed', 502)
  return { status: 200, data: { action_link: data.properties.action_link } }
}

async function deactivateUser(request: Extract<AdminRequest, { action: 'deactivate_user' }>) {
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(request.user_id)
  if (targetError || !target.user) throw new ApiError('not_found', 404)
  const { data: targetAdmin } = await admin.from('platform_admins').select('user_id').eq('user_id', request.user_id).maybeSingle()
  if (targetAdmin) {
    throw new ApiError('invariant_violation', 422)
  }
  const { data: allMemberships, error: membershipsError } = await admin.from('church_memberships').select('id,church_id,role').eq('user_id', request.user_id)
  if (membershipsError) throw new ApiError('internal_error', 500)
  const revoked = request.membership_mode === 'retain' ? [] : (request.membership_mode === 'revoke_all' ? allMemberships : allMemberships.filter((membership) => request.membership_ids?.includes(membership.id)))
  for (const membership of revoked) await requireMembershipSafety(membership)
  const { error: banError } = await admin.auth.admin.updateUserById(request.user_id, { ban_duration: '876000h' })
  if (banError) throw new ApiError('auth_dependency_failed', 502)
  const { error: stateError } = await admin.from('user_access_state').upsert({ user_id: request.user_id, status: 'inactive', changed_at: new Date().toISOString() })
  if (stateError) { await admin.auth.admin.updateUserById(request.user_id, { ban_duration: 'none' }); throw new ApiError('internal_error', 500) }
  if (revoked.length) {
    const { error } = await admin.from('church_memberships').delete().in('id', revoked.map((membership) => membership.id))
    if (error) throw new ApiError('internal_error', 500)
  }
  return { user_id: request.user_id, status: 'inactive', revoked_membership_ids: revoked.map((membership) => membership.id), refresh_sessions_revoked: false }
}

async function dispatch(req: Request, request: AdminRequest, caller: ReturnType<typeof createClient>) {
  switch (request.action) {
    case 'list_users': return { status: 200, data: await listUsers(request) }
    case 'list_churches': return { status: 200, data: await listChurches(request) }
    case 'invite_user': return await inviteUser(req, request)
    case 'deactivate_user': return { status: 200, data: await deactivateUser(request) }
    case 'reactivate_user': {
      const { data: user, error: userError } = await admin.auth.admin.getUserById(request.user_id)
      if (userError || !user.user) throw new ApiError('not_found', 404)
      const { error: banError } = await admin.auth.admin.updateUserById(request.user_id, { ban_duration: 'none' })
      if (banError) throw new ApiError('auth_dependency_failed', 502)
      const status = user.user.email_confirmed_at ? 'active' : 'pending'
      const { error } = await admin.from('user_access_state').upsert({ user_id: request.user_id, status, changed_at: new Date().toISOString() })
      if (error) throw new ApiError('internal_error', 500)
      return { status: 200, data: { user_id: request.user_id, status } }
    }
    case 'create_membership': {
      const existing = await membershipFor(request.user_id, request.church_id)
      if (existing) { if (existing.role !== request.role) throw new ApiError('conflict', 409); return { status: 200, data: { membership: existing } } }
      const { data, error } = await admin.from('church_memberships').insert({ user_id: request.user_id, church_id: request.church_id, role: request.role }).select('id,user_id,church_id,role,joined_at').single()
      if (error) throw new ApiError('internal_error', 500)
      return { status: 201, data: { membership: data } }
    }
    case 'update_membership_role': {
      const { data: membership, error } = await admin.from('church_memberships').select('id,user_id,church_id,role,joined_at').eq('id', request.membership_id).maybeSingle()
      if (error) throw new ApiError('internal_error', 500); if (!membership) throw new ApiError('not_found', 404)
      if (membership.role === request.role) return { status: 200, data: { membership } }
      await requireMembershipSafety(membership)
      const { data, error: updateError } = await admin.from('church_memberships').update({ role: request.role }).eq('id', membership.id).select('id,user_id,church_id,role,joined_at').single()
      if (updateError) throw new ApiError('internal_error', 500)
      return { status: 200, data: { membership: data } }
    }
    case 'revoke_membership': {
      const { data: membership, error } = await admin.from('church_memberships').select('id,user_id,church_id,role').eq('id', request.membership_id).maybeSingle()
      if (error) throw new ApiError('internal_error', 500); if (!membership) return { status: 200, data: { membership_id: request.membership_id, revoked: false } }
      await requireMembershipSafety(membership)
      const { error: deleteError } = await admin.from('church_memberships').delete().eq('id', membership.id)
      if (deleteError) throw new ApiError('internal_error', 500)
      return { status: 200, data: { membership_id: membership.id, revoked: true } }
    }
    case 'create_church': {
      const { data: existing, error } = await admin.from('churches').select('id,name,slug,timezone,created_at').eq('slug', request.slug).maybeSingle()
      if (error) throw new ApiError('internal_error', 500)
      if (existing) {
        const membership = await membershipFor(request.founding_admin_user_id, existing.id)
        if (existing.name !== request.name || !membership || membership.role !== 'church_admin') throw new ApiError('conflict', 409)
        return { status: 200, data: { church: existing, founding_membership: membership } }
      }
      const { data: church, error: rpcError } = await admin.rpc('create_church', { church_name: request.name, church_slug: request.slug, founding_admin_user_id: request.founding_admin_user_id })
      if (rpcError || !church) throw new ApiError('internal_error', 500)
      const membership = await membershipFor(request.founding_admin_user_id, church.id)
      if (!membership) throw new ApiError('internal_error', 500)
      return { status: 201, data: { church, founding_membership: membership } }
    }
    case 'delete_church': {
      const churchId = request.church_id
      // 1. Get services
      const { data: services } = await admin.from('services').select('id').eq('church_id', churchId)
      if (services?.length) {
        const serviceIds = services.map((s) => s.id)
        const { data: setlists } = await admin.from('setlists').select('id').in('service_id', serviceIds)
        if (setlists?.length) {
          const setlistIds = setlists.map((sl) => sl.id)
          await admin.from('setlist_items').delete().in('setlist_id', setlistIds)
          await admin.from('setlists').delete().in('id', setlistIds)
        }
        await admin.from('service_participants').delete().in('service_id', serviceIds)
        await admin.from('services').delete().eq('church_id', churchId)
      }
      // 2. Clean teams, repertoire, and variants
      const { data: teams } = await admin.from('teams').select('id').eq('church_id', churchId)
      if (teams?.length) {
        const teamIds = teams.map((t) => t.id)
        await admin.from('team_members').delete().in('team_id', teamIds)
        await admin.from('teams').delete().eq('church_id', churchId)
      }
      await admin.from('song_variants').delete().eq('church_id', churchId)
      await admin.from('church_repertoire').delete().eq('church_id', churchId)
      await admin.from('songs').delete().eq('church_id', churchId)
      await admin.from('church_memberships').delete().eq('church_id', churchId)

      // 3. Delete church
      const { error } = await admin.from('churches').delete().eq('id', churchId)
      if (error) throw new ApiError('internal_error', 500)
      return { status: 200, data: { church_id: churchId, deleted: true } }
    }
    case 'generate_recovery_link': return await generateRecoveryLink(request)
  }
}

Deno.serve(async (request) => {
  if (!isAllowedOrigin(request)) return new Response(null, { status: 403 })
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) })
  if (request.method !== 'POST') return json(request, { ok: false, error: { code: 'bad_request', message: 'Método no permitido.' } }, 405)
  try {
    const { caller, user, isPlatformAdmin } = await authorize(request)
    const reqBody = parseRequest(await request.json())

    if (!isPlatformAdmin) {
      if (reqBody.action === 'deactivate_user' || reqBody.action === 'reactivate_user') {
        throw new ApiError('forbidden', 403)
      }
    }

    const result = await dispatch(request, reqBody, caller)
    return json(request, { ok: true, data: result.data }, result.status)
  } catch (error) {
    return failed(request, error)
  }
})
