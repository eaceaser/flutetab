import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  frequencyForMidi,
  getScaleNotes,
  parseState,
  playbackOrder,
  serializeState
} from './theory';

describe('music theory model', () => {
  it('generates the native A4 minor pentatonic scale in concert and Nakai pitch', () => {
    const notes = getScaleNotes({ ...DEFAULT_STATE });

    expect(notes.map((note) => note.concertName)).toEqual(['A4', 'C5', 'D5', 'E5', 'G5', 'A5']);
    expect(notes.map((note) => note.nakaiName)).toEqual(['F♯4', 'A4', 'B4', 'C♯5', 'E5', 'F♯5']);
    expect(notes.every((note) => note.status === 'primary')).toBe(true);
  });

  it('uses A440 equal-temperament frequencies', () => {
    expect(frequencyForMidi(69)).toBe(440);
    expect(frequencyForMidi(81)).toBe(880);
  });

  it('marks notes beyond the configured flute profile as unavailable', () => {
    const notes = getScaleNotes({
      ...DEFAULT_STATE,
      rootPitchClass: 7,
      scaleId: 'ionian'
    });

    expect(notes.some((note) => note.status === 'unavailable')).toBe(true);
    expect(notes.at(-1)?.warning).toBe('Outside your configured flute range');
  });

  it('creates ascending, descending, and turn-around playback orders', () => {
    const notes = getScaleNotes({ ...DEFAULT_STATE });

    expect(playbackOrder(notes, 'up').map((note) => note.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(playbackOrder(notes, 'down').map((note) => note.index)).toEqual([5, 4, 3, 2, 1, 0]);
    expect(playbackOrder(notes, 'both').map((note) => note.index)).toEqual([
      0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0
    ]);
  });

  it('round-trips shareable settings through URL parameters', () => {
    const original = {
      ...DEFAULT_STATE,
      pitchClass: 6,
      octave: 3,
      scaleId: 'dorian',
      rootPitchClass: 8,
      direction: 'both' as const,
      tempo: 112,
      accidentalPreference: 'flats' as const,
      orientation: 'mouth-down' as const
    };

    expect(parseState(serializeState(original))).toEqual(original);
  });

  it('rejects invalid URL values and clamps tempo', () => {
    const parsed = parseState(
      new URLSearchParams('flute=Q9&scale=unknown&root=Z&direction=sideways&tempo=500')
    );

    expect(parsed).toEqual({ ...DEFAULT_STATE, tempo: 200 });
  });
});
