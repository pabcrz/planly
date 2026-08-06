import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { ChurchMembership, Person, Team, TeamMember } from '@/types/models'

export type TeamWithCount = Team & { member_count: number }
export type MembershipWithPerson = ChurchMembership & { person: Person | null }
export type TeamMemberWithPerson = TeamMember & { membership: MembershipWithPerson }
export type TeamWithMembers = Team & { members: TeamMemberWithPerson[] }

const createTeamSchema = z.object({
  church_id: z.string().uuid(),
  name: z.string().trim().min(1, 'El nombre del equipo es obligatorio').max(100),
  description: z.string().trim().max(500).nullish(),
})

const updateTeamSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del equipo es obligatorio').max(100).optional(),
  description: z.string().trim().max(500).nullish(),
})

export type CreateTeamInput = z.input<typeof createTeamSchema>
export type UpdateTeamInput = z.input<typeof updateTeamSchema>

// Role enforcement lives in RLS (teams_insert_leader / teams_update_leader /
// teams_delete_admin); these functions throw on denial.
export async function getTeams(churchId: string): Promise<TeamWithCount[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(count)')
    .eq('church_id', churchId)
    .order('name')
  if (error) throw error
  return data.map((row) => {
    const { team_members, ...team } = row
    const count = Array.isArray(team_members) && team_members[0] ? team_members[0].count : 0
    return { ...team, member_count: count }
  })
}

export async function getTeam(id: string): Promise<TeamWithMembers> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', id).single()
  if (error) throw error
  const members = await getMembers(id)
  return { ...data, members }
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const parsed = createTeamSchema.parse(input)
  const { data, error } = await supabase
    .from('teams')
    .insert({ ...parsed, description: parsed.description ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

// Parsed values may contain undefined; JSON serialization drops those keys,
// so unchanged fields are never sent on update. null is sent explicitly.
export async function updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
  const parsed = updateTeamSchema.parse(input)
  const { data, error } = await supabase.from('teams').update(parsed).eq('id', id).select().single()
  if (error) throw error
  return data
}

// team_members rows are removed by ON DELETE CASCADE.
export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

// people is a one-to-one embed off church_memberships (keyed by membership_id);
// members without a profile row get person: null.
export async function getMembers(teamId: string): Promise<TeamMemberWithPerson[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, membership:church_memberships(*, person:people(*))')
    .eq('team_id', teamId)
    .order('joined_at')
  if (error) throw error
  return data as TeamMemberWithPerson[]
}

export async function addMember(teamId: string, membershipId: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, membership_id: membershipId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeMember(teamId: string, membershipId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('membership_id', membershipId)
  if (error) throw error
}
