import { supabaseAnon } from '@/lib/supabase'
import type { FrozenSetlistItem } from '@/services/serviceService'
import type { Service, ServiceStatus, SetlistItem, Song, SongVariant, SongVersion } from '@/types/models'

// Service details shown on the public setlist header. church_id is exposed so
// the lyrics view can resolve church-published song variants.
export interface PublicServiceInfo {
  id: string
  church_id: string
  service_date: string
  start_time: string
  timezone: string
  status: ServiceStatus
  church_name: string | null
}

// One entry of the public setlist. title/version_name are null when RLS hides
// the song from anon (church-owned and not published) — the row still renders
// so the setlist order stays intact.
export interface PublicSetlistEntry {
  sort_order: number
  song_version_id: string
  title: string | null
  version_name: string | null
  key: string
  notes: string | null
}

export interface PublicSetlist {
  setlist_id: string
  frozen_at: string | null
  items: PublicSetlistEntry[]
}

// Resolved lyrics for the public view. Variant content/key wins when the
// church published one (spec: song-lyrics-view → church-published repertoire).
export interface PublicLyricsResult {
  title: string | null
  version_name: string
  key: string
  chordpro_content: string
  source: 'version' | 'variant'
}

type ServiceRow = Pick<Service, 'id' | 'church_id' | 'service_date' | 'start_time' | 'timezone' | 'status'> & {
  church: { name: string } | null
}

type SetlistItemRow = Pick<SetlistItem, 'id' | 'sort_order' | 'key' | 'notes' | 'song_version_id'> & {
  song: Pick<Song, 'title'> | null
  version: Pick<SongVersion, 'version_name'> | null
}

type VersionRow = Pick<SongVersion, 'version_name' | 'key' | 'chordpro_content'> & {
  song: Pick<Song, 'title'> | null
}

// All functions use the supabaseAnon client: no session, no auth side-effects.
// Visibility is enforced by the *_select_anon RLS policies — anything the anon
// role cannot see comes back as null rows/embeds, never as church data.

export async function getPublicService(serviceId: string): Promise<PublicServiceInfo | null> {
  const { data, error } = await supabaseAnon
    .from('services')
    .select('id, church_id, service_date, start_time, timezone, status, church:churches(name)')
    .eq('id', serviceId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as ServiceRow
  return {
    id: row.id,
    church_id: row.church_id,
    service_date: row.service_date,
    start_time: row.start_time,
    timezone: row.timezone,
    status: row.status,
    church_name: row.church?.name ?? null,
  }
}

export async function getPublicSetlist(serviceId: string): Promise<PublicSetlist | null> {
  const { data: setlist, error } = await supabaseAnon
    .from('setlists')
    .select('*')
    .eq('service_id', serviceId)
    .maybeSingle()
  if (error) throw error
  if (!setlist) return null

  // Spec (services/setlist-freeze): a frozen setlist renders from the
  // frozen_content snapshot; post-freeze edits, if any, are ignored.
  if (setlist.frozen_at && Array.isArray(setlist.frozen_content)) {
    const snapshot = setlist.frozen_content as unknown as FrozenSetlistItem[]
    return {
      setlist_id: setlist.id,
      frozen_at: setlist.frozen_at,
      items: snapshot
        .map((item) => ({
          sort_order: item.sort_order,
          song_version_id: item.song_version_id,
          title: item.title ?? null,
          version_name: item.version_name ?? null,
          key: item.key,
          notes: item.notes,
        }))
        .sort((a, b) => a.sort_order - b.sort_order),
    }
  }

  const { data, error: itemsError } = await supabaseAnon
    .from('setlist_items')
    .select('id, sort_order, key, notes, song_version_id, song:songs(title), version:song_versions(version_name)')
    .eq('setlist_id', setlist.id)
    .order('sort_order')
  if (itemsError) throw itemsError

  const rows = (data ?? []) as unknown as SetlistItemRow[]
  return {
    setlist_id: setlist.id,
    frozen_at: setlist.frozen_at,
    items: rows.map((item) => ({
      sort_order: item.sort_order,
      song_version_id: item.song_version_id,
      title: item.song?.title ?? null,
      version_name: item.version?.version_name ?? null,
      key: item.key,
      notes: item.notes,
    })),
  }
}

export async function getPublicSongLyrics(versionId: string, churchId?: string): Promise<PublicLyricsResult | null> {
  let variant: Pick<SongVariant, 'local_key' | 'local_content'> | null = null
  if (churchId) {
    // variants_select_anon only returns rows for church-published repertoire.
    const { data, error } = await supabaseAnon
      .from('song_variants')
      .select('local_key, local_content')
      .eq('song_version_id', versionId)
      .eq('church_id', churchId)
      .maybeSingle()
    if (error) throw error
    variant = data
  }

  // versions_select_anon only returns versions of canonical songs.
  const { data: version, error } = await supabaseAnon
    .from('song_versions')
    .select('version_name, key, chordpro_content, song:songs(title)')
    .eq('id', versionId)
    .maybeSingle()
  if (error) throw error

  const versionRow = version as unknown as VersionRow | null
  const content = variant?.local_content ?? versionRow?.chordpro_content ?? null
  // null when the version is unknown or RLS hides it (unpublished church-owned
  // song with no variant content) — the UI shows an unavailable state.
  if (!content) return null
  return {
    title: versionRow?.song?.title ?? null,
    version_name: versionRow?.version_name ?? 'Local version',
    key: variant?.local_key ?? versionRow?.key ?? '',
    chordpro_content: content,
    source: variant?.local_content ? 'variant' : 'version',
  }
}

// Direct variant lookup by id; only resolves for published repertoire
// (variants_select_anon).
export async function getPublicVariantLyrics(
  variantId: string,
): Promise<Pick<SongVariant, 'id' | 'local_key' | 'local_content'> | null> {
  const { data, error } = await supabaseAnon
    .from('song_variants')
    .select('id, local_key, local_content')
    .eq('id', variantId)
    .maybeSingle()
  if (error) throw error
  return data
}
