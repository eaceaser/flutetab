export type HoleState = 'closed' | 'open' | 'half';
export type FingeringStatus = 'primary' | 'alternate' | 'half-hole' | 'overblown' | 'unavailable';

export interface Fingering {
  semitones: number;
  holes: HoleState[];
  status: Exclude<FingeringStatus, 'unavailable'>;
  label: string;
  note?: string;
}

export interface ScaleDefinition {
  id: string;
  name: string;
  shortName: string;
  intervals: number[];
  formula: string;
  family: 'Native flute' | 'Pentatonic' | 'Modes' | 'Minor' | 'Reference';
  description: string;
  spelling: 'major' | 'minor' | 'neutral';
}

export interface ScaleNote {
  index: number;
  degree: number;
  degreeLabel: string;
  midi: number;
  concertName: string;
  concertLetter: string;
  concertAccidental: string;
  nakaiMidi: number;
  nakaiName: string;
  nakaiLetter: string;
  nakaiAccidental: string;
  frequency: number;
  interval: number;
  intervalName: string;
  fingering: Fingering | null;
  status: FingeringStatus;
  warning: string | null;
}

export type PlaybackDirection = 'up' | 'down' | 'both';
export type AccidentalPreference = 'context' | 'sharps' | 'flats';
export type FingeringOrientation = 'mouth-up' | 'mouth-down';
export type AppView = 'explore' | 'practice' | 'listen';
export type PracticeSection =
  | 'native-modes'
  | 'woven'
  | 'thirds'
  | 'tonic-arpeggio'
  | 'chord-family'
  | 'chord-progression'
  | 'prompts';

export type ExerciseKind =
  | 'scale'
  | 'mode'
  | 'woven'
  | 'thirds'
  | 'arpeggio'
  | 'chord-family'
  | 'chord-progression';

export interface FluteCapabilityProfile {
  pitchClass: number;
  octave: number;
  maxSemitones: number;
}

export interface PracticeWorksheetOptions {
  scaleIds: string[];
  sections: PracticeSection[];
}

export interface PracticeExercise {
  id: string;
  kind: ExerciseKind;
  group: string;
  title: string;
  subtitle: string;
  formula: string;
  notes: ScaleNote[];
  rangeLimited: boolean;
}

export interface ExplorerState {
  view: AppView;
  pitchClass: number;
  octave: number;
  maxSemitones: number;
  scaleId: string;
  rootPitchClass: number;
  worksheetScaleIds: string[];
  worksheetSections: PracticeSection[];
  direction: PlaybackDirection;
  tempo: number;
  accidentalPreference: AccidentalPreference;
  orientation: FingeringOrientation;
  showConcertStaff: boolean;
  showFingeringTab: boolean;
}
