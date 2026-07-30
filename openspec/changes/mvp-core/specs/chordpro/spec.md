# chordpro Specification

## Purpose

Pure TypeScript ChordPro parser and transposition engine in `src/lib/`. No server round-trips: parsing, rendering (lyrics-only / lyrics+chords), and transposition run client-side. Consumed by the songs, setlists, and public-views capabilities.

## Requirements

### Requirement: ChordPro Parser

The parser (`src/lib/chordpro/parser.ts`) MUST accept ChordPro source and produce a structured representation (directives + lines of lyric/chord segments). It MUST recognize directives: `{title}`, `{subtitle}`, `{key}`, `{tempo}`, `{comment}`, `{start_of_chorus}`, `{end_of_chorus}`, `{start_of_verse}`, `{end_of_verse}`, `{start_of_bridge}`, `{end_of_bridge}`.

#### Scenario: Parse title and key directives

- GIVEN source `{title: How Great Thou Art}\n{key: G}\n[G]How great...`
- WHEN the parser runs
- THEN the result exposes `title = "How Great Thou Art"` and `key = "G"`
- AND the first line has a `[G]` chord segment followed by lyric text

#### Scenario: Unknown directive ignored gracefully

- GIVEN source `{foo: bar}\nlyrics`
- WHEN the parser runs
- THEN the unknown directive is preserved as a generic directive without failing

### Requirement: Section Block Directives

The parser MUST mark lines within `{start_of_chorus}...{end_of_chorus}`, `{start_of_verse}...{end_of_verse}`, and `{start_of_bridge}...{end_of_bridge}` as belonging to those sections.

#### Scenario: Chorus section identification

- GIVEN source with `{start_of_chorus}` ... `{end_of_chorus}` wrapping 3 lines
- WHEN the parser runs
- THEN those 3 lines are flagged as `section = "chorus"`

### Requirement: Lyrics-Only Render

The renderer MUST strip chord brackets `[Am]` and directives, producing lyrics only.

#### Scenario: Chords stripped

- GIVEN a line `[Am]Amazing [C]grace`
- WHEN rendered as lyrics-only
- THEN the output is `Amazing grace` (no brackets, no chord names)

### Requirement: Lyrics+Chords Render

The renderer MUST produce a layout with chords positioned above the lyric syllable they precede.

#### Scenario: Chords above lyrics

- GIVEN a line `[Am]Amazing [C]grace`
- WHEN rendered as lyrics+chords
- THEN `Am` appears above `A` of `Amazing` and `C` appears above `g` of `grace`

### Requirement: Transposition Engine

The transposer (`src/lib/transposition/transposer.ts`) MUST shift all chords in a parsed song by a given number of semitones, preserving enharmonic preference controlled by caller.

#### Scenario: Transpose up two semitones

- GIVEN a chord `C` and `semitones = +2`
- WHEN transposed
- THEN the result is `D`

#### Scenario: Transpose down wraps around

- GIVEN a chord `C` and `semitones = -1`
- WHEN transposed
- THEN the result is `B`

### Requirement: Chord Notation Support

The transposer MUST handle root notes (A–G with sharps/flats), qualities (m, maj, dim, aug, sus, add), extensions (7, 9, 11, 13), and slash chords (`C/G`).

#### Scenario: Slash chord transposition

- GIVEN chord `C/G` and `semitones = +2`
- WHEN transposed
- THEN the result is `D/A` (both root and bass transposed)

#### Scenario: Minor seventh with sharp root

- GIVEN chord `C#m7`
- WHEN transposed `+1`
- THEN the result is `Dm7`

### Requirement: Edge Cases

The parser/transposer MUST handle no-chord lines (plain lyrics), empty lines, and lines with stacked chords (multiple bracket pairs).

#### Scenario: Plain lyric line

- GIVEN a line with no chord brackets
- WHEN parsed and rendered as lyrics+chords
- THEN the line renders as lyrics only with no chord row

#### Scenario: Empty line preserved

- GIVEN source containing a blank line between verses
- WHEN rendered
- THEN the blank line is preserved as a stanza separator