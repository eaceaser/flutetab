import type {
  ExplorerState,
  ExerciseKind,
  PracticeExercise,
  ScaleDefinition,
  ScaleNote
} from './types';
import {
  degreeLabelForInterval,
  midiForPitch,
  pitchClassLabel,
  scaleById,
  scaleNoteForMidi,
  shouldUseFlats
} from './theory';

interface NoteSpec {
  midi: number;
  degree: number;
  degreeLabel: string;
}

interface ExerciseSpec {
  id: string;
  kind: ExerciseKind;
  group: string;
  title: string;
  subtitle: string;
  formula: string;
  notes: NoteSpec[];
  rangeLimited: boolean;
  spellingScale: ScaleDefinition;
  spellingRootPitchClass: number;
}

const nativeModes = [
  {
    id: 'mode-1',
    name: 'Mode 1',
    scaleId: 'minor-pentatonic',
    rootOffset: 0,
    description: 'Home minor-pentatonic center'
  },
  {
    id: 'mode-2',
    name: 'Mode 2',
    scaleId: 'major-pentatonic',
    rootOffset: 3,
    description: 'Related major-pentatonic center'
  },
  {
    id: 'mode-4',
    name: 'Mode 4',
    scaleId: 'minor-pentatonic',
    rootOffset: 5,
    description: 'Related minor-pentatonic center'
  }
] as const;

function rootMidiForPitchClass(state: ExplorerState, pitchClass: number): number {
  const fundamental = midiForPitch(state.pitchClass, state.octave);
  return fundamental + ((pitchClass - state.pitchClass + 12) % 12);
}

function ascendingScaleSpecs(
  state: ExplorerState,
  scale: ScaleDefinition,
  rootMidi: number
): { notes: NoteSpec[]; rangeLimited: boolean } {
  const fundamental = midiForPitch(state.pitchClass, state.octave);
  const maximum = fundamental + state.maxSemitones;
  const notes = scale.intervals
    .map((interval, index) => ({
      midi: rootMidi + interval,
      degree: index + 1,
      degreeLabel: degreeLabelForInterval(interval)
    }))
    .filter((note) => note.midi >= fundamental && note.midi <= maximum);

  return {
    notes,
    rangeLimited: notes.length !== scale.intervals.length
  };
}

function upAndDown(notes: NoteSpec[]): NoteSpec[] {
  if (notes.length < 2) return notes;
  return [...notes, ...notes.slice(0, -1).reverse()];
}

function scaleExercise(
  state: ExplorerState,
  scaleId: string,
  rootPitchClass: number,
  idPrefix = 'parallel',
  kind: ExerciseKind = 'scale',
  titlePrefix = ''
): ExerciseSpec {
  const scale = scaleById(scaleId);
  const rootMidi = rootMidiForPitchClass(state, rootPitchClass);
  const generated = ascendingScaleSpecs(state, scale, rootMidi);
  const useFlats = shouldUseFlats(rootPitchClass, scale, state.accidentalPreference);
  const rootName = pitchClassLabel(rootPitchClass, useFlats);

  return {
    id: `${idPrefix}-${scaleId}-${rootPitchClass}`,
    kind,
    group: kind === 'mode' ? 'Native mode family' : 'Parallel scales',
    title: `${titlePrefix}${rootName} ${scale.shortName}`,
    subtitle: generated.rangeLimited
      ? 'Playable portion within this flute profile'
      : 'One octave, ascending and descending',
    formula: scale.formula,
    notes: upAndDown(generated.notes),
    rangeLimited: generated.rangeLimited,
    spellingScale: scale,
    spellingRootPitchClass: rootPitchClass
  };
}

function focusScale(state: ExplorerState): {
  scale: ScaleDefinition;
  rootMidi: number;
  notes: NoteSpec[];
  rangeLimited: boolean;
} {
  const scale = scaleById(state.scaleId);
  const rootMidi = rootMidiForPitchClass(state, state.rootPitchClass);
  return { scale, rootMidi, ...ascendingScaleSpecs(state, scale, rootMidi) };
}

function wovenExercise(state: ExplorerState): ExerciseSpec | null {
  const focus = focusScale(state);
  if (focus.notes.length < 3) return null;
  const notes: NoteSpec[] = [];
  for (let index = 0; index < focus.notes.length - 2; index += 1) {
    notes.push(
      focus.notes[index],
      focus.notes[index + 1],
      focus.notes[index + 2],
      focus.notes[index + 1]
    );
  }

  return {
    id: 'woven',
    kind: 'woven',
    group: 'Scale patterns',
    title: 'Woven scale',
    subtitle: `${pitchClassLabel(state.rootPitchClass)} ${focus.scale.shortName} · overlap four-note cells`,
    formula: '1–2–3–2 · 2–3–4–3 · continue',
    notes,
    rangeLimited: focus.rangeLimited,
    spellingScale: focus.scale,
    spellingRootPitchClass: state.rootPitchClass
  };
}

function thirdsExercise(state: ExplorerState): ExerciseSpec | null {
  const focus = focusScale(state);
  if (focus.notes.length < 3) return null;
  const ascending: NoteSpec[] = [];
  for (let index = 0; index < focus.notes.length - 2; index += 1) {
    ascending.push(focus.notes[index], focus.notes[index + 2]);
  }

  return {
    id: 'thirds',
    kind: 'thirds',
    group: 'Scale patterns',
    title: 'Broken thirds',
    subtitle: `${pitchClassLabel(state.rootPitchClass)} ${focus.scale.shortName} · classical interval bridge`,
    formula: '1–3 · 2–4 · 3–5 · reverse',
    notes: [...ascending, ...ascending.slice().reverse()],
    rangeLimited: focus.rangeLimited,
    spellingScale: focus.scale,
    spellingRootPitchClass: state.rootPitchClass
  };
}

function compactVoicing(
  state: ExplorerState,
  chordRootPitchClass: number,
  chordIntervals: number[]
): number[] | null {
  const minimum = midiForPitch(state.pitchClass, state.octave);
  const maximum = minimum + state.maxSemitones;
  const center = (minimum + maximum) / 2;
  const rootMidi = rootMidiForPitchClass(state, chordRootPitchClass);
  const candidates: number[][] = [];

  for (let inversion = 0; inversion < chordIntervals.length; inversion += 1) {
    const rotated = [
      ...chordIntervals.slice(inversion),
      ...chordIntervals.slice(0, inversion).map((interval) => interval + 12)
    ];
    for (let shift = -24; shift <= 24; shift += 12) {
      const voicing = rotated.map((interval) => rootMidi + interval + shift);
      if (voicing.every((midi) => midi >= minimum && midi <= maximum)) candidates.push(voicing);
    }
  }

  return (
    candidates.sort((a, b) => {
      const aCenter = (a[0] + a[a.length - 1]) / 2;
      const bCenter = (b[0] + b[b.length - 1]) / 2;
      return Math.abs(aCenter - center) - Math.abs(bCenter - center) || a[0] - b[0];
    })[0] ?? null
  );
}

function specsForMidi(
  midiNotes: number[],
  tonalRootMidi: number
): NoteSpec[] {
  return midiNotes.map((midi) => {
    const interval = ((midi - tonalRootMidi) % 12 + 12) % 12;
    return {
      midi,
      degree: interval + 1,
      degreeLabel: degreeLabelForInterval(interval)
    };
  });
}

function tonicArpeggioExercise(state: ExplorerState): ExerciseSpec | null {
  const scale = scaleById('aeolian');
  const tonicMidi = rootMidiForPitchClass(state, state.rootPitchClass);
  const voicing = compactVoicing(state, state.rootPitchClass, [0, 3, 7]);
  if (!voicing) return null;
  const hasOctave = tonicMidi + 12 <= midiForPitch(state.pitchClass, state.octave) + state.maxSemitones;
  const ascent = hasOctave ? [tonicMidi, tonicMidi + 3, tonicMidi + 7, tonicMidi + 12] : voicing;

  return {
    id: 'tonic-arpeggio',
    kind: 'arpeggio',
    group: 'Arpeggios',
    title: `${pitchClassLabel(state.rootPitchClass)} minor tonic arpeggio`,
    subtitle: hasOctave ? 'Root position with octave return' : 'Compact playable inversion',
    formula: hasOctave ? '1–♭3–5–8–5–♭3–1' : '1–♭3–5 · compact inversion',
    notes: specsForMidi(upAndDown(ascent.map((midi) => ({ midi, degree: 1, degreeLabel: '1' }))).map((note) => note.midi), tonicMidi),
    rangeLimited: !hasOctave,
    spellingScale: scale,
    spellingRootPitchClass: state.rootPitchClass
  };
}

function chordFamilyExercise(state: ExplorerState): ExerciseSpec | null {
  const tonicMidi = rootMidiForPitchClass(state, state.rootPitchClass);
  const chords = [
    { label: 'i', root: state.rootPitchClass, intervals: [0, 3, 7] },
    { label: 'iv', root: (state.rootPitchClass + 5) % 12, intervals: [0, 3, 7] },
    { label: 'v7', root: (state.rootPitchClass + 7) % 12, intervals: [0, 3, 7, 10] }
  ];
  const voicings = chords.map((chord) => compactVoicing(state, chord.root, chord.intervals));
  const playable = voicings.filter((voicing): voicing is number[] => Boolean(voicing));
  if (!playable.length) return null;
  const midiNotes = playable.flatMap((voicing) => [
    ...voicing,
    ...voicing.slice(0, -1).reverse()
  ]);

  return {
    id: 'mode-1-chord-family',
    kind: 'chord-family',
    group: 'Arpeggios',
    title: 'Mode 1 chord family',
    subtitle: `${pitchClassLabel(state.rootPitchClass)} minor · i, iv, and v7 in compact flute-range voicings`,
    formula: 'i · iv · v7',
    notes: specsForMidi(midiNotes, tonicMidi),
    rangeLimited: playable.length !== chords.length,
    spellingScale: scaleById('aeolian'),
    spellingRootPitchClass: state.rootPitchClass
  };
}

function chordProgressionExercise(state: ExplorerState): ExerciseSpec | null {
  const scale = scaleById('aeolian');
  const tonicMidi = rootMidiForPitchClass(state, state.rootPitchClass);
  const generated = ascendingScaleSpecs(state, scale, tonicMidi);
  const degrees = new Map(generated.notes.map((note) => [note.degree, note]));
  const pattern = [1, 3, 5, 3, 1, 4, 6, 4, 3, 5, 7, 5, 4, 6, 8, 6];
  const ascending = pattern
    .map((degree) => degrees.get(degree))
    .filter((note): note is NoteSpec => Boolean(note));
  if (!ascending.length) return null;

  return {
    id: 'four-chord-dexterity',
    kind: 'chord-progression',
    group: 'Arpeggios',
    title: 'Four-chord dexterity pattern',
    subtitle: 'Flesch-like chord-tone motion adapted from a documented Native-flute exercise',
    formula: '1–3–5–3 · 1–4–6–4 · 3–5–7–5 · 4–6–8–6 · reverse',
    notes: [...ascending, ...ascending.slice().reverse()],
    rangeLimited: ascending.length !== pattern.length,
    spellingScale: scale,
    spellingRootPitchClass: state.rootPitchClass
  };
}

export function generatePracticeWorksheet(state: ExplorerState): PracticeExercise[] {
  const specs: ExerciseSpec[] = [];

  for (const scaleId of state.worksheetScaleIds) {
    specs.push(scaleExercise(state, scaleId, state.rootPitchClass));
  }

  if (state.worksheetSections.includes('native-modes')) {
    for (const mode of nativeModes) {
      specs.push(
        scaleExercise(
          state,
          mode.scaleId,
          (state.pitchClass + mode.rootOffset) % 12,
          mode.id,
          'mode',
          `${mode.name} · `
        )
      );
      specs[specs.length - 1].subtitle = `${mode.description} · ${specs[specs.length - 1].subtitle}`;
    }
  }

  const optionalSpecs: Array<[boolean, ExerciseSpec | null]> = [
    [state.worksheetSections.includes('woven'), wovenExercise(state)],
    [state.worksheetSections.includes('thirds'), thirdsExercise(state)],
    [state.worksheetSections.includes('tonic-arpeggio'), tonicArpeggioExercise(state)],
    [state.worksheetSections.includes('chord-family'), chordFamilyExercise(state)],
    [state.worksheetSections.includes('chord-progression'), chordProgressionExercise(state)]
  ];
  for (const [enabled, spec] of optionalSpecs) {
    if (enabled && spec) specs.push(spec);
  }

  let nextIndex = 10_000;
  return specs
    .filter((exercise) => exercise.notes.length > 0)
    .map((exercise) => ({
      id: exercise.id,
      kind: exercise.kind,
      group: exercise.group,
      title: exercise.title,
      subtitle: exercise.subtitle,
      formula: exercise.formula,
      rangeLimited: exercise.rangeLimited,
      notes: exercise.notes.map((note) =>
        scaleNoteForMidi(
          state,
          note.midi,
          nextIndex++,
          note.degree,
          note.degreeLabel,
          exercise.spellingScale,
          exercise.spellingRootPitchClass
        )
      )
    }));
}

export function worksheetPlaybackNotes(exercises: PracticeExercise[]): ScaleNote[][] {
  return exercises
    .map((exercise) => exercise.notes.filter((note) => note.status !== 'unavailable'))
    .filter((notes) => notes.length > 0);
}
