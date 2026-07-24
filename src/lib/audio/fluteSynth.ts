import type { ScaleNote } from '../music/types';

type NoteCallback = (note: ScaleNote | null) => void;

class FluteSynth {
  private context: AudioContext | null = null;
  private timers: number[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private runId = 0;

  private ensureContext(): AudioContext {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private scheduleVoice(frequency: number, start: number, duration: number): void {
    const context = this.ensureContext();
    const output = context.createGain();
    const filter = context.createBiquadFilter();
    const fundamental = context.createOscillator();
    const air = context.createOscillator();
    const airGain = context.createGain();

    fundamental.type = 'sine';
    fundamental.frequency.value = frequency;
    air.type = 'triangle';
    air.frequency.value = frequency * 2.01;
    airGain.gain.value = 0.075;
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(4200, frequency * 7);
    filter.Q.value = 1.2;

    output.gain.setValueAtTime(0.0001, start);
    output.gain.exponentialRampToValueAtTime(0.24, start + 0.045);
    output.gain.setValueAtTime(0.2, Math.max(start + 0.05, start + duration - 0.09));
    output.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    fundamental.connect(filter);
    air.connect(airGain).connect(filter);
    filter.connect(output).connect(context.destination);

    fundamental.start(start);
    air.start(start);
    fundamental.stop(start + duration + 0.02);
    air.stop(start + duration + 0.02);
    this.sources.push(fundamental, air);
  }

  playNote(note: ScaleNote, duration = 0.65): void {
    this.stop();
    const context = this.ensureContext();
    const start = context.currentTime + 0.02;
    this.scheduleVoice(note.frequency, start, duration);
  }

  playSequence(notes: ScaleNote[], tempo: number, callback: NoteCallback): void {
    this.playSequences([notes], tempo, callback);
  }

  playSequences(sequences: ScaleNote[][], tempo: number, callback: NoteCallback): void {
    this.stop();
    const context = this.ensureContext();
    const runId = ++this.runId;
    const secondsPerBeat = 60 / tempo;
    const start = context.currentTime + 0.08;
    let beatCursor = 0;

    sequences.forEach((notes, sequenceIndex) => {
      notes.forEach((note) => {
        const when = start + beatCursor * secondsPerBeat;
        this.scheduleVoice(note.frequency, when, secondsPerBeat * 0.82);
        this.timers.push(
          window.setTimeout(
            () => {
              if (runId === this.runId) callback(note);
            },
            Math.max(0, (when - context.currentTime) * 1000)
          )
        );
        beatCursor += 1;
      });
      if (sequenceIndex < sequences.length - 1) beatCursor += 1;
    });

    const finishAt = start + beatCursor * secondsPerBeat;
    this.timers.push(
      window.setTimeout(
        () => {
          if (runId === this.runId) callback(null);
        },
        Math.max(0, (finishAt - context.currentTime) * 1000)
      )
    );
  }

  stop(): void {
    this.runId += 1;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers = [];
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Already stopped audio nodes can safely be discarded.
      }
    }
    this.sources = [];
  }
}

export const fluteSynth = new FluteSynth();
