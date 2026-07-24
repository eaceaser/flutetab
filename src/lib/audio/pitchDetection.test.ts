import { describe, expect, it } from 'vitest';
import { centsBetween, detectPitch } from './pitchDetection';

function sine(frequency: number, sampleRate = 48_000, length = 4096): Float32Array {
  return Float32Array.from(
    { length },
    (_, index) => 0.25 * Math.sin((2 * Math.PI * frequency * index) / sampleRate)
  );
}

describe('local pitch detection', () => {
  it('finds flute-range fundamentals', () => {
    expect(detectPitch(sine(440), 48_000)?.frequency).toBeCloseTo(440, 0);
    expect(detectPitch(sine(880), 48_000)?.frequency).toBeCloseTo(880, 0);
  });

  it('rejects silence', () => {
    expect(detectPitch(new Float32Array(4096), 48_000)).toBeNull();
  });

  it('reports signed cents', () => {
    expect(centsBetween(440, 440)).toBe(0);
    expect(centsBetween(466.1638, 440)).toBeCloseTo(100, 2);
    expect(centsBetween(415.3047, 440)).toBeCloseTo(-100, 2);
  });
});

