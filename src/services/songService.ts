import { z } from 'zod'
import { pgUuid } from '@/lib/validation'
import { supabase } from '@/lib/supabase'
import type { ChurchRepertoire, Song, SongVariant, SongVersion } from '@/types/models'

export interface SongFilters {
  search?: string
  tag?: string
}

export type SongWithVersions = Song & { versions: SongVersion[] }
export type RepertoireEntry = ChurchRepertoire & { song: Song }

const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(20)
const referenceUrlsSchema = z.array(z.string().url('Cada referencia debe ser una URL válida')).max(20)

const createSongSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.').max(200),
  author: z.string().trim().max(200).nullish(),
  tempo: z.number().int().min(20).max(400).nullish(),
  tags: tagsSchema.default([]),
  reference_urls: referenceUrlsSchema.default([]),
  church_id: pgUuid().nullable(),
  is_canonical: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.is_canonical && value.church_id !== null) {
    ctx.addIssue({ code: 'custom', message: 'Las canciones base no pueden pertenecer a una iglesia.', path: ['church_id'] })
  }
  if (!value.is_canonical && value.church_id === null) {
    ctx.addIssue({ code: 'custom', message: 'Las canciones de iglesia requieren una iglesia.', path: ['church_id'] })
  }
})

const updateSongSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.').max(200).optional(),
  author: z.string().trim().max(200).nullish(),
  tempo: z.number().int().min(20).max(400).nullish(),
  tags: tagsSchema.optional(),
  reference_urls: referenceUrlsSchema.optional(),
})

const createVersionSchema = z.object({
  song_id: pgUuid(),
  version_name: z.string().trim().min(1, 'El nombre de la versión es obligatorio.').max(100),
  key: z.string().trim().min(1, 'La tonalidad es obligatoria').max(10),
  chordpro_content: z.string().min(1, 'El contenido de acordes (ChordPro) es obligatorio'),
  notes: z.string().trim().max(2000).nullish(),
})

const updateVersionSchema = z.object({
  version_name: z.string().trim().min(1, 'El nombre de la versión es obligatorio.').max(100).optional(),
  key: z.string().trim().min(1, 'La tonalidad es obligatoria').max(10).optional(),
  chordpro_content: z.string().min(1, 'El contenido de acordes (ChordPro) es obligatorio').optional(),
  notes: z.string().trim().max(2000).nullish(),
})

const createVariantSchema = z.object({
  church_id: pgUuid(),
  song_version_id: pgUuid(),
  local_key: z.string().trim().min(1, 'La tonalidad es obligatoria').max(10),
  local_content: z.string().nullish(),
  local_notes: z.string().trim().max(2000).nullish(),
})

const updateVariantSchema = z.object({
  local_key: z.string().trim().min(1, 'La tonalidad es obligatoria').max(10).optional(),
  local_content: z.string().nullish(),
  local_notes: z.string().trim().max(2000).nullish(),
})

export type CreateSongInput = z.input<typeof createSongSchema>
export type UpdateSongInput = z.input<typeof updateSongSchema>
export type CreateVersionInput = z.input<typeof createVersionSchema>
export type UpdateVersionInput = z.input<typeof updateVersionSchema>
export type CreateVariantInput = z.input<typeof createVariantSchema>
export type UpdateVariantInput = z.input<typeof updateVariantSchema>

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Not authenticated')
  return data.user.id
}

// Merged catalog: canonical songs + songs owned by this church. Role
// enforcement for mutations lives in RLS; these functions throw on denial.
export async function getSongs(churchId: string | null, filters: SongFilters = {}): Promise<Song[]> {
  let query = supabase.from('songs').select('*')
  if (churchId) query = query.or(`is_canonical.eq.true,church_id.eq.${churchId}`)
  else query = query.eq('is_canonical', true).is('church_id', null)

  // Commas and quotes would break the PostgREST or() filter string.
  const search = filters.search?.trim().replace(/[",]/g, '')
  if (search) {
    query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
  }
  if (filters.tag) {
    query = query.contains('tags', [filters.tag])
  }

  const { data, error } = await query.order('title')
  if (error) throw error
  return data
}

export async function getSong(id: string): Promise<SongWithVersions> {
  const { data, error } = await supabase
    .from('songs')
    .select('*, versions:song_versions(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as SongWithVersions
}

// Parsed values may contain undefined; JSON serialization drops those keys,
// so unchanged fields are never sent on update. null is sent explicitly.
export async function createSong(input: CreateSongInput): Promise<Song> {
  const parsed = createSongSchema.parse(input)
  const userId = await requireUserId()
  // A church_repertoire row is auto-created by the auto_adopt_song trigger.
  const { data, error } = await supabase
    .from('songs')
    .insert({ ...parsed, author: parsed.author ?? null, tempo: parsed.tempo ?? null, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSong(id: string, input: UpdateSongInput): Promise<Song> {
  const parsed = updateSongSchema.parse(input)
  const { data, error } = await supabase.from('songs').update(parsed).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) throw error
}

export async function getVersions(songId: string): Promise<SongVersion[]> {
  const { data, error } = await supabase
    .from('song_versions')
    .select('*')
    .eq('song_id', songId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createVersion(input: CreateVersionInput): Promise<SongVersion> {
  const parsed = createVersionSchema.parse(input)
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('song_versions')
    .insert({ ...parsed, notes: parsed.notes ?? null, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVersion(id: string, input: UpdateVersionInput): Promise<SongVersion> {
  const parsed = updateVersionSchema.parse(input)
  const { data, error } = await supabase
    .from('song_versions')
    .update(parsed)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVersion(id: string): Promise<void> {
  const { error } = await supabase.from('song_versions').delete().eq('id', id)
  if (error) throw error
}

export async function adoptSong(churchId: string, songId: string): Promise<ChurchRepertoire> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('church_repertoire')
    .upsert(
      { church_id: churchId, song_id: songId, adopted_by: userId, is_published: true, archived_at: null },
      { onConflict: 'church_id,song_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// Active (non-archived) repertoire entries with their songs.
export async function getRepertoire(churchId: string): Promise<RepertoireEntry[]> {
  const { data, error } = await supabase
    .from('church_repertoire')
    .select('*, song:songs(*)')
    .eq('church_id', churchId)
    .is('archived_at', null)
    .order('adopted_at', { ascending: false })
  if (error) throw error
  return data as RepertoireEntry[]
}

export async function archiveSong(churchId: string, songId: string): Promise<void> {
  const { error } = await supabase
    .from('church_repertoire')
    .update({ archived_at: new Date().toISOString() })
    .eq('church_id', churchId)
    .eq('song_id', songId)
  if (error) throw error
}

export async function createVariant(input: CreateVariantInput): Promise<SongVariant> {
  const parsed = createVariantSchema.parse(input)
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('song_variants')
    .insert({
      ...parsed,
      local_content: parsed.local_content ?? null,
      local_notes: parsed.local_notes ?? null,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVariant(id: string, input: UpdateVariantInput): Promise<SongVariant> {
  const parsed = updateVariantSchema.parse(input)
  const { data, error } = await supabase
    .from('song_variants')
    .update(parsed)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
