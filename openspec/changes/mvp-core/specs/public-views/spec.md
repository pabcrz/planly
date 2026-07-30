# public-views Specification

## Purpose

Anonymous, read-only access to shared setlists and lyrics via unique URLs. Mobile-optimized, no auth required, suitable for viewing lyrics during a service. Relies on RLS anon policies already in the schema.

## Requirements

### Requirement: Anonymous Setlist Access

The system MUST expose a public URL per setlist that renders the setlist (song order, titles, keys) without authentication. RLS `setlists_select_anon`, `items_select_anon`, and `services_select_anon` permit this.

#### Scenario: Open shared setlist link

- GIVEN an unauthenticated visitor with a setlist's public URL
- WHEN they open the link
- THEN the setlist renders with song titles, order, and chosen keys
- AND no login prompt is shown

#### Scenario: Public link shows no admin controls

- GIVEN a visitor on the public setlist view
- WHEN the page renders
- THEN no edit/delete/reorder controls are present

### Requirement: Song Lyrics View

Each song in the public setlist MUST link to a lyrics view that supports both lyrics-only and lyrics+chords rendering (powered by the `chordpro` capability). Anon-visible songs are canonical songs and church-published repertoire (RLS `songs_select_anon`, `versions_select_anon` for canonical, `variants_select_anon` for published repertoire).

#### Scenario: Open lyrics from setlist

- GIVEN a public setlist with song S (canonical)
- WHEN the visitor taps S
- THEN the lyrics view renders S's version `chordpro_content` as lyrics+chords

#### Scenario: Church-published repertoire visible

- GIVEN a church repertoire row with `is_published = true` and a `song_variants` row
- WHEN an anon visitor views that song's lyrics
- THEN the church-local variant content is used (RLS `variants_select_anon`)

### Requirement: In-View Transposition

The public view MUST allow transposing chords locally (client-side) without persisting changes. Default key comes from the song version or `song_variants.local_key`.

#### Scenario: Transpose in public view

- GIVEN a lyrics view rendered in key G
- WHEN the visitor taps "+2"
- THEN all chords shift up 2 semitones to A
- AND no DB write occurs (transient state)

#### Scenario: Reload resets transposition

- GIVEN a transposed public view (+2)
- WHEN the visitor reloads the page
- THEN the view returns to the original key

### Requirement: Mobile-Optimized Layout

The public view MUST be mobile-first: large touch targets, readable font sizes, no horizontal scroll, scroll mode for lyrics during a service.

#### Scenario: Lyrics scroll mode

- GIVEN a song lyrics view on a phone
- WHEN the visitor enables scroll mode
- THEN the lyrics scroll vertically with smooth momentum
- AND the font size is large enough to read at arm's length

#### Scenario: Touch target sizing

- GIVEN the public setlist view on a 375px-wide viewport
- WHEN each song row renders
- THEN tap targets are at least 44px tall for accessible touch

### Requirement: View Toggle

The public lyrics view MUST let the visitor toggle between lyrics-only and lyrics+chords. The toggle state MAY persist in localStorage but MUST NOT touch the database.

#### Scenario: Switch to lyrics-only

- GIVEN a lyrics+chords view
- WHEN the visitor taps "lyrics only"
- THEN chord brackets are stripped from the rendered output

#### Scenario: Toggle persists across songs

- GIVEN the visitor set view to "lyrics only" and navigates to another song
- THEN the new song also renders as lyrics-only (preference retained)

### Requirement: Copy Shareable Link

The public setlist view MUST provide a "copy link" affordance that copies the current URL to clipboard.

#### Scenario: Copy link to clipboard

- GIVEN a visitor on the public setlist view
- WHEN they tap "Copy link"
- THEN the URL is written to the clipboard
- AND a confirmation is shown

### Requirement: No Auth Side-Effects

The public views MUST NOT trigger sign-in flows, create sessions, or expose church-internal data beyond the shared setlist and its songs.

#### Scenario: No session created on visit

- GIVEN an unauthenticated visitor opens a public setlist
- WHEN the page loads
- THEN no Supabase auth session is established
- AND the anon role is used for all queries