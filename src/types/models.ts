import type { Database, Json } from './database'

// Enum aliases from the generated database types
export type ChurchRole = Database['public']['Enums']['church_role']
export type ServiceStatus = Database['public']['Enums']['service_status']
export type ChurchType = Database['public']['Enums']['church_type']

export interface Church {
  id: string
  name: string
  slug: string
  type: ChurchType
  timezone: string
  settings: Json
  created_at: string
}

export interface ChurchMembership {
  id: string
  user_id: string
  church_id: string
  role: ChurchRole
  joined_at: string
}

export interface Song {
  id: string
  title: string
  author: string | null
  tempo: number | null
  tags: string[]
  reference_urls: Json
  church_id: string | null
  is_canonical: boolean
  created_by: string
  created_at: string
}

export interface SongVersion {
  id: string
  song_id: string
  version_name: string
  key: string
  chordpro_content: string
  notes: string | null
  created_by: string
  created_at: string
}

export interface ChurchRepertoire {
  church_id: string
  song_id: string
  adopted_at: string
  adopted_by: string
  is_published: boolean
  archived_at: string | null
}

export interface SongVariant {
  id: string
  church_id: string
  song_version_id: string
  local_key: string
  local_content: string | null
  local_notes: string | null
  created_by: string
  created_at: string
}

export interface Team {
  id: string
  church_id: string
  name: string
  description: string | null
  created_at: string
}

export interface TeamMember {
  team_id: string
  membership_id: string
  joined_at: string
}

export interface Person {
  membership_id: string
  display_name: string
  instruments: string[]
  musical_roles: string[]
}

export interface Service {
  id: string
  church_id: string
  team_id: string
  service_date: string
  start_time: string
  timezone: string
  status: ServiceStatus
  notes: string | null
  created_at: string
}

export interface Setlist {
  id: string
  service_id: string
  created_at: string
  updated_at: string
  frozen_at: string | null
  frozen_content: Json | null
}

export interface SetlistItem {
  id: string
  setlist_id: string
  song_id: string
  song_version_id: string
  key: string
  notes: string | null
  sort_order: number
}

export interface ServiceParticipant {
  id: string
  service_id: string
  membership_id: string
}

export interface ServiceMemberRole {
  service_participant_id: string
  role: string
}
