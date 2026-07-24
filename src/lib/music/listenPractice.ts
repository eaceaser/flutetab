export const LISTEN_ATTACK_MS = 450;
export const LISTEN_STABLE_MS = 600;
export const LISTEN_TIMEOUT_MS = 10_000;

export function calibratedFrequency(frequency: number, offsetCents: number): number {
  return frequency * 2 ** (offsetCents / 1200);
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export class StableMatch {
  private since: number | null = null;

  reset(): void {
    this.since = null;
  }

  update(inTolerance: boolean, now: number, targetStartedAt: number): number {
    if (now - targetStartedAt < LISTEN_ATTACK_MS || !inTolerance) {
      this.since = null;
      return 0;
    }
    if (this.since === null) this.since = now;
    return Math.max(0, now - this.since);
  }
}

export class AdaptiveNoteSelector {
  private weights: number[];

  constructor(
    count: number,
    private readonly random: () => number = Math.random
  ) {
    this.weights = Array.from({ length: count }, () => 1);
  }

  markMiss(index: number): void {
    this.weights[index] = Math.min(7, this.weights[index] + 2);
  }

  markSuccess(index: number): void {
    this.weights[index] = Math.max(1, this.weights[index] - 1);
  }

  weightFor(index: number): number {
    return this.weights[index] ?? 0;
  }

  next(previousIndex: number | null): number {
    const candidates = this.weights
      .map((weight, index) => ({ index, weight }))
      .filter(({ index }) => this.weights.length === 1 || index !== previousIndex);
    const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let pick = this.random() * total;
    for (const candidate of candidates) {
      pick -= candidate.weight;
      if (pick < 0) return candidate.index;
    }
    return candidates.at(-1)?.index ?? 0;
  }
}

