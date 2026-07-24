import { FINGERINGS, SCALE_DEFINITIONS } from './data';
import type {
  AccidentalPreference,
  ExplorerState,
  FingeringStatus,
  PracticeSection,
  PlaybackDirection,
  ScaleDefinition,
  ScaleNote
} from './types';

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const FLAT_MAJOR_ROOTS = new Set([1, 3, 5, 6, 8, 10]);
const FLAT_MINOR_ROOTS = new Set([0, 2, 3, 5, 7, 10]);
const INTERVAL_NAMES = [
  'Perfect unison',
  'Minor second',
  'Major second',
  'Minor third',
  'Major third',
  'Perfect fourth',
  'Tritone',
  'Perfect fifth',
  'Minor sixth',
  'Major sixth',
  'Minor seventh',
  'Major seventh',
  'Octave'
];
const DEGREE_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♯4/♭5', '5', '♭6', '6', '♭7', '7', '8'];

export const DEFAULT_WORKSHEET_SCALE_IDS = [
  'minor-pentatonic',
  'dorian',
  'aeolian',
  'minor-blues'
];

export const DEFAULT_WORKSHEET_SECTIONS: PracticeSection[] = [
  'native-modes',
  'woven',
  'thirds',
  'tonic-arpeggio',
  'chord-family',
  'chord-progression',
  'prompts'
];

export const DEFAULT_STATE: ExplorerState = {
  view: 'explore',
  pitchClass: 9,
  octave: 4,
  maxSemitones: 15,
  scaleId: 'minor-pentatonic',
  rootPitchClass: 9,
  worksheetScaleIds: [...DEFAULT_WORKSHEET_SCALE_IDS],
  worksheetSections: [...DEFAULT_WORKSHEET_SECTIONS],
  direction: 'up',
  tempo: 76,
  accidentalPreference: 'context',
  orientation: 'mouth-up'
};

export const clampTempo = (tempo: number) => Math.max(40, Math.min(200, Math.round(tempo)));

export function midiForPitch(pitchClass: number, octave: number): number {
  return (octave + 1) * 12 + pitchClass;
}

export function frequencyForMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function shouldUseFlats(
  rootPitchClass: number,
  scale: ScaleDefinition,
  preference: AccidentalPreference
): boolean {
  if (preference === 'flats') return true;
  if (preference === 'sharps') return false;
  if (scale.id === 'minor-blues' || scale.spelling === 'minor') {
    return FLAT_MINOR_ROOTS.has(rootPitchClass);
  }
  return FLAT_MAJOR_ROOTS.has(rootPitchClass);
}

export function noteName(midi: number, useFlats = false): string {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function splitNoteName(name: string): { letter: string; accidental: string } {
  const match = name.match(/^([A-G])([♯♭]?)/);
  return { letter: match?.[1] ?? 'C', accidental: match?.[2] ?? '' };
}

export function scaleById(id: string): ScaleDefinition {
  return SCALE_DEFINITIONS.find((scale) => scale.id === id) ?? SCALE_DEFINITIONS[0];
}

export function pitchClassLabel(pitchClass: number, useFlats = false): string {
  return (useFlats ? FLAT_NAMES : SHARP_NAMES)[((pitchClass % 12) + 12) % 12];
}

export function degreeLabelForInterval(interval: number): string {
  const normalized = ((interval % 12) + 12) % 12;
  if (interval > 0 && normalized === 0) return String(Math.floor(interval / 12) * 7 + 1);
  return DEGREE_LABELS[normalized] ?? String(interval);
}

export function scaleNoteForMidi(
  state: ExplorerState,
  midi: number,
  index: number,
  degree: number,
  degreeLabel: string,
  spellingScale: ScaleDefinition,
  spellingRootPitchClass = state.rootPitchClass
): ScaleNote {
  const fundamentalMidi = midiForPitch(state.pitchClass, state.octave);
  const interval = midi - fundamentalMidi;
  const fingering =
    interval >= 0 && interval <= state.maxSemitones
      ? FINGERINGS.find((candidate) => candidate.semitones === interval) ?? null
      : null;
  const useFlats = shouldUseFlats(
    spellingRootPitchClass,
    spellingScale,
    state.accidentalPreference
  );
  const concertName = noteName(midi, useFlats);
  const concert = splitNoteName(concertName);
  const nakaiMidi = 66 + interval;
  const nakaiName = noteName(nakaiMidi, false);
  const nakai = splitNoteName(nakaiName);
  const status: FingeringStatus = fingering?.status ?? 'unavailable';
  const warning =
    status === 'unavailable'
      ? 'Outside your configured flute range'
      : status === 'half-hole'
        ? 'Half-hole; intonation varies'
        : status === 'alternate'
          ? 'Alternate fingering; verify on your flute'
          : status === 'overblown'
            ? 'Second register; breath and maker dependent'
            : null;

  return {
    index,
    degree,
    degreeLabel,
    midi,
    concertName,
    concertLetter: concert.letter,
    concertAccidental: concert.accidental,
    nakaiMidi,
    nakaiName,
    nakaiLetter: nakai.letter,
    nakaiAccidental: nakai.accidental,
    frequency: frequencyForMidi(midi),
    interval,
    intervalName:
      interval <= 12 ? INTERVAL_NAMES[interval] : `${interval} semitones above the flute root`,
    fingering,
    status,
    warning
  };
}

export function getScaleNotes(state: ExplorerState): ScaleNote[] {
  const fundamentalMidi = midiForPitch(state.pitchClass, state.octave);
  const scale = scaleById(state.scaleId);
  const rootOffset = (state.rootPitchClass - state.pitchClass + 12) % 12;
  const rootMidi = fundamentalMidi + rootOffset;

  return scale.intervals.map((scaleInterval, index) => {
    const midi = rootMidi + scaleInterval;
    return scaleNoteForMidi(
      state,
      midi,
      index,
      index + 1,
      degreeLabelForInterval(scaleInterval),
      scale
    );
  });
}

export function playbackOrder(notes: ScaleNote[], direction: PlaybackDirection): ScaleNote[] {
  if (direction === 'down') return [...notes].reverse();
  if (direction === 'both') return [...notes, ...notes.slice(0, -1).reverse()];
  return notes;
}

export function serializeState(state: ExplorerState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('flute', `${pitchClassLabel(state.pitchClass)}${state.octave}`);
  params.set('scale', state.scaleId);
  params.set('root', pitchClassLabel(state.rootPitchClass));
  params.set('range', String(state.maxSemitones));
  if (state.view === 'practice') params.set('view', 'practice');
  if (state.worksheetScaleIds.join(',') !== DEFAULT_WORKSHEET_SCALE_IDS.join(',')) {
    params.set('worksheetScales', state.worksheetScaleIds.join(','));
  }
  if (state.worksheetSections.join(',') !== DEFAULT_WORKSHEET_SECTIONS.join(',')) {
    params.set('sections', state.worksheetSections.join(','));
  }
  if (state.direction !== DEFAULT_STATE.direction) params.set('direction', state.direction);
  if (state.tempo !== DEFAULT_STATE.tempo) params.set('tempo', String(state.tempo));
  if (state.accidentalPreference !== 'context') params.set('accidentals', state.accidentalPreference);
  if (state.orientation !== DEFAULT_STATE.orientation) params.set('orientation', state.orientation);
  return params;
}

const PARSED_NOTE_NAMES: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11
};

export function parseState(params: URLSearchParams): ExplorerState {
  const state: ExplorerState = {
    ...DEFAULT_STATE,
    worksheetScaleIds: [...DEFAULT_WORKSHEET_SCALE_IDS],
    worksheetSections: [...DEFAULT_WORKSHEET_SECTIONS]
  };
  const flute = params.get('flute')?.toUpperCase().replace('♯', '#').replace('♭', 'B');
  const fluteMatch = flute?.match(/^([A-G](?:#|B)?)([3-5])$/);
  if (fluteMatch && fluteMatch[1] in PARSED_NOTE_NAMES) {
    state.pitchClass = PARSED_NOTE_NAMES[fluteMatch[1]];
    state.octave = Number(fluteMatch[2]);
    state.maxSemitones = state.pitchClass === 9 && state.octave === 4 ? 15 : 12;
  }

  if (params.get('view') === 'practice') state.view = 'practice';

  const scaleId = params.get('scale');
  if (scaleId && SCALE_DEFINITIONS.some((scale) => scale.id === scaleId)) state.scaleId = scaleId;

  const root = params.get('root')?.toUpperCase().replace('♯', '#').replace('♭', 'B');
  if (root && root in PARSED_NOTE_NAMES) state.rootPitchClass = PARSED_NOTE_NAMES[root];

  const range = Number(params.get('range'));
  if (Number.isInteger(range) && range >= 12 && range <= 17) state.maxSemitones = range;

  const worksheetScales = params
    .get('worksheetScales')
    ?.split(',')
    .filter((id) => SCALE_DEFINITIONS.some((scale) => scale.id === id));
  if (worksheetScales?.length) state.worksheetScaleIds = [...new Set(worksheetScales)];

  const validSections = new Set<PracticeSection>(DEFAULT_WORKSHEET_SECTIONS);
  const sections = params
    .get('sections')
    ?.split(',')
    .filter((section): section is PracticeSection => validSections.has(section as PracticeSection));
  if (sections) state.worksheetSections = [...new Set(sections)];

  const direction = params.get('direction');
  if (direction === 'up' || direction === 'down' || direction === 'both') state.direction = direction;

  const tempo = Number(params.get('tempo'));
  if (Number.isFinite(tempo) && tempo > 0) state.tempo = clampTempo(tempo);

  const accidentals = params.get('accidentals');
  if (accidentals === 'context' || accidentals === 'sharps' || accidentals === 'flats') {
    state.accidentalPreference = accidentals;
  }

  const orientation = params.get('orientation');
  if (orientation === 'mouth-up' || orientation === 'mouth-down') state.orientation = orientation;

  return state;
}
