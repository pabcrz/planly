import { describe, expect, it } from 'vitest'
import { transposeChord, transposeDocument } from '../transposer'
import { parseChordPro } from '@/lib/chordpro/parser'

describe('transposeChord — basic shifts', () => {
  it('transposes C up two semitones to D', () => {
    expect(transposeChord('C', 2)).toBe('D')
  })

  it('transposes C down one semitone and wraps to B', () => {
    expect(transposeChord('C', -1)).toBe('B')
  })

  it('wraps around above B', () => {
    expect(transposeChord('B', 1)).toBe('C')
  })

  it('returns the same chord after 12 semitones', () => {
    expect(transposeChord('F#maj7', 12)).toBe('F#maj7')
  })

  it('handles shifts larger than an octave via modulo', () => {
    expect(transposeChord('C', 13)).toBe('C#')
    expect(transposeChord('C', -13)).toBe('B')
  })

  it('is a no-op for zero semitones', () => {
    expect(transposeChord('G', 0)).toBe('G')
  })
})

describe('transposeChord — qualities and extensions', () => {
  it('preserves minor quality', () => {
    expect(transposeChord('Am', 2)).toBe('Bm')
  })

  it('transposes C#m7 up one semitone to Dm7', () => {
    expect(transposeChord('C#m7', 1)).toBe('Dm7')
  })

  it('preserves sus4 quality', () => {
    expect(transposeChord('Gsus4', 1)).toBe('G#sus4')
  })

  it('preserves dim, aug, and add qualities', () => {
    expect(transposeChord('Bdim', 2)).toBe('C#dim')
    expect(transposeChord('Caug', 3)).toBe('D#aug')
    expect(transposeChord('Fadd9', -2)).toBe('D#add9')
  })

  it('handles flat roots and normalizes to sharps', () => {
    expect(transposeChord('Bbm9', 1)).toBe('Bm9')
    expect(transposeChord('Eb', 1)).toBe('E')
    expect(transposeChord('Abmaj7', -1)).toBe('Gmaj7')
  })
})

describe('transposeChord — slash chords', () => {
  it('transposes root and bass independently', () => {
    expect(transposeChord('C/G', 2)).toBe('D/A')
  })

  it('transposes G/B up two semitones to A/C#', () => {
    expect(transposeChord('G/B', 2)).toBe('A/C#')
  })

  it('normalizes a flat bass note to a sharp', () => {
    expect(transposeChord('F/C', -1)).toBe('E/B')
    expect(transposeChord('C/Bb', 1)).toBe('C#/B')
  })
})

describe('transposeChord — robustness', () => {
  it('returns unrecognized input unchanged', () => {
    expect(transposeChord('H', 2)).toBe('H')
    expect(transposeChord('not-a-chord', 3)).toBe('not-a-chord')
  })

  it('trims surrounding whitespace', () => {
    expect(transposeChord('  Am  ', 2)).toBe('Bm')
  })
})

describe('transposeDocument', () => {
  it('transposes every chord segment in the document', () => {
    const doc = parseChordPro('{key: C}\n{start_of_chorus}\n[C]Holy [G]holy\n{end_of_chorus}')
    const transposed = transposeDocument(doc, 2)
    const chords = transposed.sections[0].lines[0].segments
      .filter((s) => s.type === 'chord')
      .map((s) => (s.type === 'chord' ? s.chord : ''))
    expect(chords).toEqual(['D', 'A'])
    expect(transposed.key).toBe('C')
  })

  it('does not mutate the input document', () => {
    const doc = parseChordPro('[Am]Amazing')
    transposeDocument(doc, 3)
    const first = doc.sections[0].lines[0].segments[0]
    expect(first).toEqual({ type: 'chord', chord: 'Am' })
  })

  it('leaves lyric segments untouched', () => {
    const doc = parseChordPro('[C]Amazing grace')
    const transposed = transposeDocument(doc, 5)
    const lyric = transposed.sections[0].lines[0].segments[1]
    expect(lyric).toEqual({ type: 'lyric', text: 'Amazing grace' })
  })
})
