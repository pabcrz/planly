// ChordPro AST types — pure client-side representation of a parsed chart.

export interface ChordSegment {
  type: 'chord'
  chord: string
}

export interface LyricSegment {
  type: 'lyric'
  text: string
}

export type ChordProSegment = ChordSegment | LyricSegment

export interface ChordProLine {
  segments: ChordProSegment[]
}

export type ChordProSectionType = 'verse' | 'chorus' | 'bridge' | 'unknown'

export interface ChordProSection {
  type: ChordProSectionType
  lines: ChordProLine[]
}

// Non-metadata directives (comments, unknowns) preserved in source order.
export interface ChordProDirective {
  name: string
  value?: string
}

export interface ChordProDocument {
  title?: string
  subtitle?: string
  key?: string
  tempo?: string
  directives: ChordProDirective[]
  sections: ChordProSection[]
}
