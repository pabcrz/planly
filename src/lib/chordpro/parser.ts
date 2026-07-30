import type {
  ChordProDocument,
  ChordProLine,
  ChordProSection,
  ChordProSectionType,
  ChordProSegment,
} from './types'

// Matches a full-line directive: {name}, {name: value}. Values may contain
// colons — only the first colon separates name from value.
const DIRECTIVE_RE = /^\{\s*([^}:]+?)\s*(?::\s*(.*?)\s*)?\}$/
// Matches chord brackets like [Am], [C#m7], [C/G].
const CHORD_RE = /\[([^\]]*)\]/g

const SECTION_STARTS: Record<string, ChordProSectionType> = {
  start_of_chorus: 'chorus',
  start_of_verse: 'verse',
  start_of_bridge: 'bridge',
}

const SECTION_ENDS = new Set(['end_of_chorus', 'end_of_verse', 'end_of_bridge'])

const METADATA_DIRECTIVES = new Set(['title', 'subtitle', 'key', 'tempo'])

function parseLineSegments(line: string): ChordProSegment[] {
  const segments: ChordProSegment[] = []
  CHORD_RE.lastIndex = 0
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = CHORD_RE.exec(line)) !== null) {
    const lyricBefore = line.slice(cursor, match.index)
    if (lyricBefore.length > 0) segments.push({ type: 'lyric', text: lyricBefore })
    const chord = match[1].trim()
    if (chord.length > 0) segments.push({ type: 'chord', chord })
    cursor = match.index + match[0].length
  }
  const tail = line.slice(cursor)
  if (tail.length > 0) segments.push({ type: 'lyric', text: tail })
  return segments
}

// Parses ChordPro source into an AST. Total function: unknown directives are
// preserved and malformed lines degrade to lyric text — the parser never throws.
export function parseChordPro(source: string): ChordProDocument {
  const document: ChordProDocument = { directives: [], sections: [] }
  let currentSection: ChordProSection | null = null

  const ensureSection = (): ChordProSection => {
    if (!currentSection) {
      currentSection = { type: 'unknown', lines: [] }
      document.sections.push(currentSection)
    }
    return currentSection
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    const directiveMatch = DIRECTIVE_RE.exec(trimmed)

    if (directiveMatch) {
      const name = directiveMatch[1].trim().toLowerCase()
      const value = directiveMatch[2]

      const sectionType = SECTION_STARTS[name]
      if (sectionType) {
        currentSection = { type: sectionType, lines: [] }
        document.sections.push(currentSection)
        continue
      }
      if (SECTION_ENDS.has(name)) {
        currentSection = null
        continue
      }
      if (METADATA_DIRECTIVES.has(name) && value !== undefined) {
        document[name as 'title' | 'subtitle' | 'key' | 'tempo'] = value
        continue
      }
      // Comments and unknown directives are kept, never fatal.
      document.directives.push(value === undefined ? { name } : { name, value })
      continue
    }

    const line: ChordProLine = { segments: trimmed.length === 0 ? [] : parseLineSegments(rawLine) }
    ensureSection().lines.push(line)
  }

  return document
}
