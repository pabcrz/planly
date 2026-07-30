import { useMemo } from 'react'
import { transposeDocument } from '@/lib/transposition/transposer'
import type { ChordProDocument, ChordProLine, ChordProSectionType } from './types'

export interface ChordProRendererProps {
  document: ChordProDocument
  mode: 'lyrics' | 'chords'
  semitones?: number
}

const SECTION_LABELS: Record<Exclude<ChordProSectionType, 'unknown'>, string> = {
  verse: 'VERSE',
  chorus: 'CHORUS',
  bridge: 'BRIDGE',
}

// A chord paired with the lyric text that follows it, so the chord can be
// rendered directly above its syllable. Lyrics without a preceding chord get
// chord: null.
interface ChordLyricPair {
  chord: string | null
  text: string
}

function pairSegments(line: ChordProLine): ChordLyricPair[] {
  const pairs: ChordLyricPair[] = []
  let pendingChord: string | null = null
  for (const segment of line.segments) {
    if (segment.type === 'chord') {
      if (pendingChord !== null) pairs.push({ chord: pendingChord, text: '' })
      pendingChord = segment.chord
    } else {
      pairs.push({ chord: pendingChord, text: segment.text })
      pendingChord = null
    }
  }
  if (pendingChord !== null) pairs.push({ chord: pendingChord, text: '' })
  return pairs
}

function ParagraphBreak() {
  return <div className="h-4" aria-hidden="true" />
}

function LyricsLine({ line }: { line: ChordProLine }) {
  if (line.segments.length === 0) return <ParagraphBreak />
  const text = line.segments
    .filter((s) => s.type === 'lyric')
    .map((s) => (s.type === 'lyric' ? s.text : ''))
    .join('')
  return <p className="whitespace-pre-wrap leading-7 text-gray-900">{text}</p>
}

function ChordsLine({ line }: { line: ChordProLine }) {
  if (line.segments.length === 0) return <ParagraphBreak />
  const hasChords = line.segments.some((s) => s.type === 'chord')
  // Plain lyric lines render without a chord row.
  if (!hasChords) return <LyricsLine line={line} />
  return (
    <p className="whitespace-pre-wrap leading-7 text-gray-900">
      {pairSegments(line).map((pair, i) => (
        <span key={i} className="inline-flex flex-col align-bottom">
          <span className="text-sm font-semibold leading-5 text-indigo-700">
            {pair.chord ?? ''}
          </span>
          <span className="whitespace-pre-wrap">{pair.text}</span>
        </span>
      ))}
    </p>
  )
}

export function ChordProRenderer({ document, mode, semitones = 0 }: ChordProRendererProps) {
  const doc = useMemo(
    () => (semitones === 0 ? document : transposeDocument(document, semitones)),
    [document, semitones],
  )

  return (
    <div className="chordpro min-w-0 overflow-x-auto">
      {doc.title ? <h2 className="text-lg font-semibold text-gray-900">{doc.title}</h2> : null}
      {doc.subtitle ? <p className="text-sm text-gray-500">{doc.subtitle}</p> : null}
      <div className="mt-3 flex flex-col">
        {doc.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className={sectionIndex === 0 ? '' : 'mt-4'}>
            {section.type !== 'unknown' ? (
              <h3 className="mb-1 text-xs font-semibold tracking-widest text-gray-400">
                {SECTION_LABELS[section.type]}
              </h3>
            ) : null}
            {section.lines.map((line, lineIndex) =>
              mode === 'lyrics' ? (
                <LyricsLine key={lineIndex} line={line} />
              ) : (
                <ChordsLine key={lineIndex} line={line} />
              ),
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
