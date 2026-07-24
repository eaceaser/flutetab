import { describe, expect, it } from 'vitest';
import {
  AdaptiveNoteSelector,
  calibratedFrequency,
  LISTEN_ATTACK_MS,
  LISTEN_STABLE_MS,
  median,
  StableMatch
} from './listenPractice';

describe('listen practice session logic', () => {
  it('applies a fundamental calibration in cents', () => {
    expect(calibratedFrequency(440, 100)).toBeCloseTo(466.164, 2);
    expect(median([12, -4, 7])).toBe(7);
  });

  it('suppresses attacks and requires a continuous stable match', () => {
    const match = new StableMatch();
    expect(match.update(true, 100, 0)).toBe(0);
    expect(match.update(true, LISTEN_ATTACK_MS, 0)).toBe(0);
    expect(match.update(true, LISTEN_ATTACK_MS + LISTEN_STABLE_MS, 0)).toBe(LISTEN_STABLE_MS);
    expect(match.update(false, 1200, 0)).toBe(0);
  });

  it('raises missed-note weight and avoids immediate repeats', () => {
    const selector = new AdaptiveNoteSelector(3, () => 0.99);
    selector.markMiss(2);
    expect(selector.weightFor(2)).toBe(3);
    expect(selector.next(1)).toBe(2);
    expect(selector.next(2)).not.toBe(2);
    selector.markSuccess(2);
    expect(selector.weightFor(2)).toBe(2);
  });
});
