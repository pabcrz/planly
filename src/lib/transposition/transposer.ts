import type { ChordProDocument } from '@/lib/chordpro/types'

// Sharp-only chromatic output: transposition always renders sharps.
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

// Accepts sharps and flats on input; flats normalize to their sharp enharmonic.
const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

// root + quality (everything up to an optional slash) + optional bass note.
const CHORD_RE = /^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/

function transposeNote(note: string, semitones: number): string | null {
  const index = NOTE_INDEX[note]
  if (index === undefined) return null
  const next = (((index + semitones) % 12) + 12) % 12
  return SHARP_NOTES[next]
}

// Transposes a chord symbol by semitones, preserving the quality suffix
// (m, maj7, sus4, dim, add9, ...) and transposing slash-chord bass notes
// independently. Unrecognized input is returned unchanged.
export function transposeChord(chord: string, semitones: number): string {
  const match = CHORD_RE.exec(chord.trim())
  if (!match) return chord
  const [, root, quality, bass] = match
  const newRoot = transposeNote(root, semitones)
  if (!newRoot) return chord
  if (bass === undefined) return newRoot + quality
  const newBass = transposeNote(bass, semitones)
  if (!newBass) return chord
  return `${newRoot}${quality}/${newBass}`
}

// Returns a new document with every chord segment transposed; the input
// document is not mutated.
export function transposeDocument(doc: ChordProDocument, semitones: number): ChordProDocument {
  return {
    ...doc,
    directives: doc.directives.map((d) => ({ ...d })),
    sections: doc.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        segments: line.segments.map((segment) =>
          segment.type === 'chord'
            ? { ...segment, chord: transposeChord(segment.chord, semitones) }
            : { ...segment },
        ),
      })),
    })),
  }
}
