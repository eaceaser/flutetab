import type { Fingering, ScaleDefinition } from './types';

export const SCALE_DEFINITIONS: ScaleDefinition[] = [
  {
    id: 'minor-pentatonic',
    name: 'Native minor pentatonic',
    shortName: 'Minor pentatonic',
    intervals: [0, 3, 5, 7, 10, 12],
    formula: '1 · ♭3 · 4 · 5 · ♭7 · 8',
    family: 'Native flute',
    description: 'The foundational “straight-fingering” scale of most contemporary six-hole minor flutes.',
    spelling: 'minor'
  },
  {
    id: 'nakai-primary',
    name: 'Nakai primary (Dorian)',
    shortName: 'Nakai primary',
    intervals: [0, 2, 3, 5, 7, 9, 10, 12],
    formula: '1 · 2 · ♭3 · 4 · 5 · 6 · ♭7 · 8',
    family: 'Native flute',
    description: 'The full Dorian pitch collection implied by Nakai’s fixed four-sharp notation.',
    spelling: 'minor'
  },
  {
    id: 'major-pentatonic',
    name: 'Major pentatonic',
    shortName: 'Major pentatonic',
    intervals: [0, 2, 4, 7, 9, 12],
    formula: '1 · 2 · 3 · 5 · 6 · 8',
    family: 'Pentatonic',
    description: 'A bright five-note scale familiar from folk traditions around the world.',
    spelling: 'major'
  },
  {
    id: 'minor-blues',
    name: 'Minor blues',
    shortName: 'Minor blues',
    intervals: [0, 3, 5, 6, 7, 10, 12],
    formula: '1 · ♭3 · 4 · ♭5 · 5 · ♭7 · 8',
    family: 'Pentatonic',
    description: 'Minor pentatonic with the expressive tritone “blue note.”',
    spelling: 'minor'
  },
  {
    id: 'ionian',
    name: 'Ionian (major)',
    shortName: 'Ionian',
    intervals: [0, 2, 4, 5, 7, 9, 11, 12],
    formula: '1 · 2 · 3 · 4 · 5 · 6 · 7 · 8',
    family: 'Modes',
    description: 'The familiar Western major scale.',
    spelling: 'major'
  },
  {
    id: 'dorian',
    name: 'Dorian',
    shortName: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10, 12],
    formula: '1 · 2 · ♭3 · 4 · 5 · 6 · ♭7 · 8',
    family: 'Modes',
    description: 'A minor mode with a raised sixth; it underlies Nakai’s primary pitch collection.',
    spelling: 'minor'
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    shortName: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10, 12],
    formula: '1 · ♭2 · ♭3 · 4 · 5 · ♭6 · ♭7 · 8',
    family: 'Modes',
    description: 'A dark minor mode distinguished by its lowered second.',
    spelling: 'minor'
  },
  {
    id: 'lydian',
    name: 'Lydian',
    shortName: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11, 12],
    formula: '1 · 2 · 3 · ♯4 · 5 · 6 · 7 · 8',
    family: 'Modes',
    description: 'A bright major mode with a raised fourth.',
    spelling: 'major'
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    shortName: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10, 12],
    formula: '1 · 2 · 3 · 4 · 5 · 6 · ♭7 · 8',
    family: 'Modes',
    description: 'A major mode with a lowered seventh, common in folk and modal improvisation.',
    spelling: 'major'
  },
  {
    id: 'aeolian',
    name: 'Aeolian (natural minor)',
    shortName: 'Aeolian',
    intervals: [0, 2, 3, 5, 7, 8, 10, 12],
    formula: '1 · 2 · ♭3 · 4 · 5 · ♭6 · ♭7 · 8',
    family: 'Modes',
    description: 'The familiar Western natural-minor scale.',
    spelling: 'minor'
  },
  {
    id: 'locrian',
    name: 'Locrian',
    shortName: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10, 12],
    formula: '1 · ♭2 · ♭3 · 4 · ♭5 · ♭6 · ♭7 · 8',
    family: 'Modes',
    description: 'An unstable minor mode with lowered second and fifth.',
    spelling: 'minor'
  },
  {
    id: 'harmonic-minor',
    name: 'Harmonic minor',
    shortName: 'Harmonic minor',
    intervals: [0, 2, 3, 5, 7, 8, 11, 12],
    formula: '1 · 2 · ♭3 · 4 · 5 · ♭6 · 7 · 8',
    family: 'Minor',
    description: 'Natural minor with a leading tone, creating an augmented second.',
    spelling: 'minor'
  },
  {
    id: 'melodic-minor',
    name: 'Melodic minor (ascending)',
    shortName: 'Melodic minor',
    intervals: [0, 2, 3, 5, 7, 9, 11, 12],
    formula: '1 · 2 · ♭3 · 4 · 5 · 6 · 7 · 8',
    family: 'Minor',
    description: 'The ascending classical melodic-minor form.',
    spelling: 'minor'
  },
  {
    id: 'chromatic',
    name: 'Chromatic',
    shortName: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    formula: 'Every semitone',
    family: 'Reference',
    description: 'All twelve pitch classes; useful for comparing alternate and half-hole fingerings.',
    spelling: 'neutral'
  }
];

const f = (
  semitones: number,
  pattern: string,
  status: Fingering['status'],
  label: string,
  note?: string
): Fingering => ({
  semitones,
  holes: [...pattern].map((state) =>
    state === '●' ? 'closed' : state === '◐' ? 'half' : 'open'
  ),
  status,
  label,
  note
});

/**
 * Typical fingerings for contemporary six-hole, pentatonic-minor Native American flutes.
 * Patterns run from the mouth end to the foot end and follow Flutopedia's standard
 * six-hole chart and its documented alternates:
 * https://www.flutopedia.com/fingeringChart_SixPentatonicMinor.htm
 *
 * The reliable minor-pentatonic notes are marked primary. Other lower-register notes
 * remain marked alternate or half-hole because their tuning varies by flute. Flutopedia
 * shows two different amounts of foot-end-hole coverage for semitones 1 and 2; the
 * diagram model represents both as a half-covered hole, with the distinction in the label.
 */
export const FINGERINGS: Fingering[] = [
  f(0, '●●●●●●', 'primary', 'All holes covered'),
  f(1, '●●●●●◐', 'half-hole', 'Slightly vent the foot-end hole'),
  f(2, '●●●●●◐', 'half-hole', 'Half-hole the foot-end hole'),
  f(3, '●●●●●○', 'primary', 'Straight fingering'),
  f(4, '●●●●○●', 'alternate', 'Move the bottom finger to the foot-end hole'),
  f(5, '●●●●○○', 'primary', 'Straight fingering'),
  f(6, '●●●○●○', 'alternate', 'Cross-fingering; verify on your flute'),
  f(7, '●●●○○○', 'primary', 'Straight fingering'),
  f(8, '●●○●○○', 'alternate', 'Cross-fingering; verify on your flute'),
  f(9, '●●○○○○', 'alternate', 'Alternate straight fingering; verify intonation'),
  f(10, '●○●○○○', 'primary', 'Straight fingering'),
  f(11, '○●●○○○', 'alternate', 'Cross-fingering; verify on your flute'),
  f(12, '○○●○○○', 'primary', 'Octave fingering'),
  f(13, '○●●●●●', 'overblown', 'Second register; breath-sensitive'),
  f(14, '◐●●●●◐', 'overblown', 'Second register; maker-dependent'),
  f(15, '○●●●●○', 'overblown', 'Open both end holes and overblow'),
  f(16, '◐●●●◐○', 'overblown', 'Extended range; maker-dependent'),
  f(17, '◐●●●○○', 'overblown', 'Extended range; maker-dependent')
];

export const NOTE_OPTIONS = [
  { pitchClass: 0, label: 'C' },
  { pitchClass: 1, label: 'C♯ / D♭' },
  { pitchClass: 2, label: 'D' },
  { pitchClass: 3, label: 'D♯ / E♭' },
  { pitchClass: 4, label: 'E' },
  { pitchClass: 5, label: 'F' },
  { pitchClass: 6, label: 'F♯ / G♭' },
  { pitchClass: 7, label: 'G' },
  { pitchClass: 8, label: 'G♯ / A♭' },
  { pitchClass: 9, label: 'A' },
  { pitchClass: 10, label: 'A♯ / B♭' },
  { pitchClass: 11, label: 'B' }
];

export const REGISTER_OPTIONS = [
  { octave: 3, label: 'Low', description: 'C3–B3 fundamentals' },
  { octave: 4, label: 'Mid', description: 'C4–B4 fundamentals' },
  { octave: 5, label: 'High', description: 'C5–B5 fundamentals' }
];
