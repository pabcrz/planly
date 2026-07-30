import { describe, expect, it } from 'vitest'
import { parseChordPro } from '../parser'

describe('parseChordPro — metadata directives', () => {
  it('parses the title directive', () => {
    const doc = parseChordPro('{title: Amazing Grace}\n[Am]Amazing grace')
    expect(doc.title).toBe('Amazing Grace')
  })

  it('parses title and key directives together', () => {
    const doc = parseChordPro('{title: How Great Thou Art}\n{key: G}\n[G]How great')
    expect(doc.title).toBe('How Great Thou Art')
    expect(doc.key).toBe('G')
    const firstLine = doc.sections[0].lines[0]
    expect(firstLine.segments[0]).toEqual({ type: 'chord', chord: 'G' })
    expect(firstLine.segments[1]).toMatchObject({ type: 'lyric' })
  })

  it('parses subtitle and tempo directives', () => {
    const doc = parseChordPro('{subtitle: Traditional}\n{tempo: 72}\nLyrics')
    expect(doc.subtitle).toBe('Traditional')
    expect(doc.tempo).toBe('72')
  })

  it('keeps colons inside directive values', () => {
    const doc = parseChordPro('{title: Psalm 23: The Lord}\nLyrics')
    expect(doc.title).toBe('Psalm 23: The Lord')
  })

  it('preserves comment directives as generic directives', () => {
    const doc = parseChordPro('{comment: play softly}\nLyrics')
    expect(doc.directives).toContainEqual({ name: 'comment', value: 'play softly' })
  })
})

describe('parseChordPro — section blocks', () => {
  it('marks lines inside start/end_of_chorus as chorus', () => {
    const doc = parseChordPro(
      '{start_of_chorus}\n[G]Holy\n[D]Holy\n[Em]Holy\n{end_of_chorus}',
    )
    expect(doc.sections).toHaveLength(1)
    expect(doc.sections[0].type).toBe('chorus')
    expect(doc.sections[0].lines).toHaveLength(3)
  })

  it('marks verse and bridge sections', () => {
    const doc = parseChordPro(
      '{start_of_verse}\nLine one\n{end_of_verse}\n{start_of_bridge}\nBridge line\n{end_of_bridge}',
    )
    expect(doc.sections.map((s) => s.type)).toEqual(['verse', 'bridge'])
  })

  it('puts lines outside explicit sections in an unknown section', () => {
    const doc = parseChordPro('Intro line\n{start_of_chorus}\nChorus\n{end_of_chorus}\nOutro line')
    expect(doc.sections.map((s) => s.type)).toEqual(['unknown', 'chorus', 'unknown'])
  })

  it('starts a fresh unknown section after a section closes', () => {
    const doc = parseChordPro('{start_of_verse}\nV1\n{end_of_verse}\nFree line')
    expect(doc.sections).toHaveLength(2)
    expect(doc.sections[1].type).toBe('unknown')
    expect(doc.sections[1].lines[0].segments[0]).toEqual({ type: 'lyric', text: 'Free line' })
  })
})

describe('parseChordPro — chord/lyric segmentation', () => {
  it('pairs chords with the lyrics they precede', () => {
    const doc = parseChordPro('[Am]Amazing [C]grace')
    expect(doc.sections[0].lines[0].segments).toEqual([
      { type: 'chord', chord: 'Am' },
      { type: 'lyric', text: 'Amazing ' },
      { type: 'chord', chord: 'C' },
      { type: 'lyric', text: 'grace' },
    ])
  })

  it('handles stacked chords with no lyric between them', () => {
    const doc = parseChordPro('[Am][G]Word')
    expect(doc.sections[0].lines[0].segments).toEqual([
      { type: 'chord', chord: 'Am' },
      { type: 'chord', chord: 'G' },
      { type: 'lyric', text: 'Word' },
    ])
  })

  it('handles a chord with no following lyric', () => {
    const doc = parseChordPro('Lyrics [Am]')
    expect(doc.sections[0].lines[0].segments).toEqual([
      { type: 'lyric', text: 'Lyrics ' },
      { type: 'chord', chord: 'Am' },
    ])
  })

  it('keeps complex chord names intact', () => {
    const doc = parseChordPro('[C#m7]x [G/B]y [Fsus4]z')
    const chords = doc.sections[0].lines[0].segments
      .filter((s) => s.type === 'chord')
      .map((s) => (s.type === 'chord' ? s.chord : ''))
    expect(chords).toEqual(['C#m7', 'G/B', 'Fsus4'])
  })

  it('parses a plain lyric line into a single lyric segment', () => {
    const doc = parseChordPro('Just plain lyrics here')
    expect(doc.sections[0].lines[0].segments).toEqual([
      { type: 'lyric', text: 'Just plain lyrics here' },
    ])
  })
})

describe('parseChordPro — edge cases', () => {
  it('preserves empty lines as lines with no segments', () => {
    const doc = parseChordPro('Line one\n\nLine three')
    expect(doc.sections[0].lines).toHaveLength(3)
    expect(doc.sections[0].lines[1].segments).toEqual([])
  })

  it('does not throw on unknown directives', () => {
    expect(() => parseChordPro('{foo: bar}\nlyrics')).not.toThrow()
    const doc = parseChordPro('{foo: bar}\nlyrics')
    expect(doc.directives).toContainEqual({ name: 'foo', value: 'bar' })
  })

  it('does not throw on malformed input', () => {
    expect(() => parseChordPro('[Am unclosed bracket\n{broken')).not.toThrow()
  })

  it('treats an unclosed chord bracket as plain lyric text', () => {
    const doc = parseChordPro('[Am unclosed')
    expect(doc.sections[0].lines[0].segments).toEqual([
      { type: 'lyric', text: '[Am unclosed' },
    ])
  })

  it('returns an empty document for empty source', () => {
    const doc = parseChordPro('')
    expect(doc.sections).toHaveLength(1)
    expect(doc.sections[0].lines[0].segments).toEqual([])
    expect(doc.title).toBeUndefined()
  })
})
