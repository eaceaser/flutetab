export interface PitchReading {
  frequency: number;
  clarity: number;
  rms: number;
}

export function centsBetween(frequency: number, targetFrequency: number): number {
  return 1200 * Math.log2(frequency / targetFrequency);
}

/**
 * YIN-style fundamental estimator. It works directly on an analyser's time-domain
 * samples and returns no pitch for quiet or ambiguous frames.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  minimumFrequency = 100,
  maximumFrequency = 2400
): PitchReading | null {
  let squareSum = 0;
  let mean = 0;
  for (const sample of samples) {
    squareSum += sample * sample;
    mean += sample;
  }
  const rms = Math.sqrt(squareSum / samples.length);
  if (rms < 0.008) return null;
  mean /= samples.length;

  const minimumLag = Math.max(2, Math.floor(sampleRate / maximumFrequency));
  const maximumLag = Math.min(
    Math.floor(sampleRate / minimumFrequency),
    Math.floor(samples.length / 2) - 1
  );
  const difference = new Float32Array(maximumLag + 1);

  for (let lag = 1; lag <= maximumLag; lag += 1) {
    let sum = 0;
    for (let index = 0; index < samples.length - lag; index += 1) {
      const delta = samples[index] - mean - (samples[index + lag] - mean);
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  let runningSum = 0;
  let selectedLag = -1;
  const normalized = new Float32Array(maximumLag + 1);
  normalized[0] = 1;
  for (let lag = 1; lag <= maximumLag; lag += 1) {
    runningSum += difference[lag];
    normalized[lag] = runningSum === 0 ? 1 : (difference[lag] * lag) / runningSum;
  }

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    if (lag < minimumLag || normalized[lag] >= 0.15) continue;
    while (lag + 1 <= maximumLag && normalized[lag + 1] < normalized[lag]) lag += 1;
    selectedLag = lag;
    break;
  }

  if (selectedLag < 0) {
    let bestValue = 1;
    for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
      if (normalized[lag] < bestValue) {
        bestValue = normalized[lag];
        selectedLag = lag;
      }
    }
    if (bestValue > 0.3) return null;
  }

  const left = normalized[selectedLag - 1] ?? normalized[selectedLag];
  const center = normalized[selectedLag];
  const right = normalized[selectedLag + 1] ?? normalized[selectedLag];
  const denominator = 2 * (2 * center - right - left);
  const refinedLag =
    denominator === 0 ? selectedLag : selectedLag + (right - left) / denominator;
  const clarity = Math.max(0, Math.min(1, 1 - center));
  if (!Number.isFinite(refinedLag) || refinedLag <= 0 || clarity < 0.7) return null;

  return { frequency: sampleRate / refinedLag, clarity, rms };
}
