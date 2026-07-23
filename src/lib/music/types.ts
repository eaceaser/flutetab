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

export interface ExplorerState {
  pitchClass: number;
  octave: number;
  scaleId: string;
  rootPitchClass: number;
  direction: PlaybackDirection;
  tempo: number;
  accidentalPreference: AccidentalPreference;
  orientation: FingeringOrientation;
}
