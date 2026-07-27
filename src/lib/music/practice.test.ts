import { describe, expect, it } from 'vitest';
import { generatePracticeWorksheet } from './practice';
import { DEFAULT_STATE, parseState, serializeState } from './theory';
import type { ExplorerState } from './types';

describe('practice worksheet generation', () => {
  it('builds the hybrid Daily Practice preset inside the A4–C6 flute profile', () => {
    const exercises = generatePracticeWorksheet({ ...DEFAULT_STATE, view: 'practice' });
    const notes = exercises.flatMap((exercise) => exercise.notes);

    expect(exercises).toHaveLength(12);
    expect(Math.min(...notes.map((note) => note.midi))).toBe(69);
    expect(Math.max(...notes.map((note) => note.midi))).toBe(84);
    expect(notes.every((note) => note.status !== 'unavailable')).toBe(true);
  });

  it('names the natural Native-flute mode centers and labels an incomplete mode', () => {
    const exercises = generatePracticeWorksheet({ ...DEFAULT_STATE, view: 'practice' });
    const nativeModes = exercises.filter((exercise) => exercise.kind === 'mode');
    const cMajorHighC = nativeModes[1].notes.find((note) => note.concertName === 'C6');

    expect(nativeModes.map((exercise) => exercise.title)).toEqual([
      'Mode 1 · A Minor pentatonic',
      'Mode 2 · C Major pentatonic',
      'Mode 4 · D Minor pentatonic'
    ]);
    expect(nativeModes.map((exercise) => exercise.rangeLimited)).toEqual([false, false, true]);
    expect(cMajorHighC?.interval).toBe(15);
    expect(cMajorHighC?.fingering?.holes).toEqual([
      'open',
      'closed',
      'closed',
      'closed',
      'closed',
      'open'
    ]);
    expect(nativeModes[2].notes.some((note) => note.concertName === 'C6')).toBe(true);
    expect(nativeModes[2].notes.some((note) => note.concertName === 'D6')).toBe(false);
  });

  it('generates the tonic minor arpeggio and four-chord degree pattern exactly', () => {
    const exercises = generatePracticeWorksheet({ ...DEFAULT_STATE, view: 'practice' });
    const tonic = exercises.find((exercise) => exercise.id === 'tonic-arpeggio');
    const progression = exercises.find((exercise) => exercise.id === 'four-chord-dexterity');

    expect(tonic?.notes.map((note) => note.concertName)).toEqual([
      'A4',
      'C5',
      'E5',
      'A5',
      'E5',
      'C5',
      'A4'
    ]);
    expect(progression?.notes.slice(0, 16).map((note) => note.degreeLabel)).toEqual([
      '1',
      '♭3',
      '5',
      '♭3',
      '1',
      '4',
      '♭6',
      '4',
      '♭3',
      '5',
      '♭7',
      '5',
      '4',
      '♭6',
      '8',
      '♭6'
    ]);
  });

  it('keeps advanced in-range fingerings and identifies their technique', () => {
    const exercises = generatePracticeWorksheet({ ...DEFAULT_STATE, view: 'practice' });
    const dorian = exercises.find((exercise) => exercise.id === 'parallel-dorian-9');

    expect(dorian?.notes.some((note) => note.status === 'alternate')).toBe(true);
    expect(dorian?.notes.some((note) => note.status === 'overblown')).toBe(false);
  });

  it('uses an octave for unconfigured flute keys and shares worksheet choices in the URL', () => {
    const parsed = parseState(new URLSearchParams('flute=F%234&view=practice'));
    expect(parsed.maxSemitones).toBe(12);

    const state: ExplorerState = {
      ...parsed,
      maxSemitones: 16,
      worksheetScaleIds: ['dorian'],
      worksheetSections: ['thirds', 'prompts'],
      showConcertStaff: false,
      showFingeringTab: false
    };
    const restored = parseState(serializeState(state));

    expect(restored.view).toBe('practice');
    expect(restored.maxSemitones).toBe(16);
    expect(restored.worksheetScaleIds).toEqual(['dorian']);
    expect(restored.worksheetSections).toEqual(['thirds', 'prompts']);
    expect(restored.showConcertStaff).toBe(false);
    expect(restored.showFingeringTab).toBe(false);
  });
});
