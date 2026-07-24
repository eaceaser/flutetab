<script lang="ts">
  import { onDestroy } from 'svelte';
  import { microphonePitch } from '$lib/audio/microphonePitch';
  import { centsBetween, type PitchReading } from '$lib/audio/pitchDetection';
  import {
    AdaptiveNoteSelector,
    calibratedFrequency,
    LISTEN_STABLE_MS,
    LISTEN_TIMEOUT_MS,
    median,
    StableMatch
  } from '$lib/music/listenPractice';
  import type { FingeringOrientation, ScaleNote } from '$lib/music/types';
  import FingeringDiagram from './FingeringDiagram.svelte';
  import StaffSystem from './StaffSystem.svelte';

  type Phase = 'idle' | 'requesting' | 'calibrating' | 'practicing' | 'error';

  let {
    notes,
    orientation,
    fluteName
  }: {
    notes: ScaleNote[];
    orientation: FingeringOrientation;
    fluteName: string;
  } = $props();

  let phase = $state<Phase>('idle');
  let errorMessage = $state('');
  let targetIndex = $state(0);
  let detectedFrequency: number | null = $state(null);
  let cents: number | null = $state(null);
  let tolerance = $state(35);
  let calibrationOffset = $state(0);
  let calibrationMessage = $state('Hold the fundamental with an easy, steady breath.');
  let stableProgress = $state(0);
  let correctCount = $state(0);
  let missedCount = $state(0);
  let feedback = $state('');
  let showHint = $state(false);
  let promptWidth = $state(320);
  let targetStartedAt = 0;
  let calibrationStartedAt = 0;
  let calibrationReadings: number[] = [];
  let transitioning = false;
  let advanceTimer: number | null = null;
  let selector = makeSelector();
  const stableMatch = new StableMatch();

  let target = $derived(notes[targetIndex] ?? notes[0]);
  let targetNotes = $derived(target ? [target] : []);
  let active = $derived(
    phase === 'requesting' || phase === 'calibrating' || phase === 'practicing'
  );
  let tuningWord = $derived(
    cents === null ? 'Waiting for a clear tone' : cents < -tolerance ? 'Flat' : cents > tolerance ? 'Sharp' : 'In tune'
  );

  function makeSelector(): AdaptiveNoteSelector {
    return new AdaptiveNoteSelector(notes.length);
  }

  function measurePrompt(node: HTMLElement): { destroy: () => void } {
    const observer = new ResizeObserver(([entry]) => {
      promptWidth = Math.max(180, Math.floor(entry.contentRect.width));
    });
    observer.observe(node);
    promptWidth = Math.max(180, Math.floor(node.getBoundingClientRect().width));
    return { destroy: () => observer.disconnect() };
  }

  async function start(): Promise<void> {
    phase = 'requesting';
    errorMessage = '';
    correctCount = 0;
    missedCount = 0;
    calibrationOffset = 0;
    detectedFrequency = null;
    cents = null;
    calibrationReadings = [];
    stableMatch.reset();
    selector = makeSelector();
    try {
      await microphonePitch.start(handleReading);
      calibrationStartedAt = performance.now();
      phase = 'calibrating';
    } catch (error) {
      phase = 'error';
      errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Microphone access was not granted. Check this site’s browser permission and try again.';
    }
  }

  async function stop(): Promise<void> {
    if (advanceTimer !== null) window.clearTimeout(advanceTimer);
    advanceTimer = null;
    transitioning = false;
    await microphonePitch.stop();
    phase = 'idle';
    detectedFrequency = null;
    cents = null;
    stableProgress = 0;
    feedback = '';
    showHint = false;
  }

  function beginPractice(message: string): void {
    calibrationMessage = message;
    phase = 'practicing';
    targetIndex = selector.next(null);
    targetStartedAt = performance.now();
    stableMatch.reset();
    stableProgress = 0;
    cents = null;
    showHint = false;
  }

  function handleReading(reading: PitchReading | null, timestamp: number): void {
    detectedFrequency = reading?.frequency ?? null;

    if (phase === 'calibrating') {
      if (timestamp - calibrationStartedAt >= LISTEN_TIMEOUT_MS) {
        calibrationOffset = 0;
        beginPractice('Calibration timed out; using standard concert tuning.');
        return;
      }
      if (!reading) {
        stableProgress = 0;
        stableMatch.reset();
        cents = null;
        return;
      }

      const calibrationCents = centsBetween(reading.frequency, notes[0].frequency);
      cents = calibrationCents;
      const progress = stableMatch.update(
        Math.abs(calibrationCents) <= 100,
        timestamp,
        calibrationStartedAt
      );
      stableProgress = Math.min(1, progress / LISTEN_STABLE_MS);
      if (progress > 0) calibrationReadings.push(calibrationCents);
      if (progress >= LISTEN_STABLE_MS) {
        calibrationOffset = Math.max(-100, Math.min(100, median(calibrationReadings.slice(-30))));
        const direction =
          Math.abs(calibrationOffset) < 1
            ? 'at concert pitch'
            : `${Math.abs(Math.round(calibrationOffset))}¢ ${calibrationOffset < 0 ? 'flat' : 'sharp'}`;
        beginPractice(`Fundamental calibrated ${direction}.`);
      }
      return;
    }

    if (phase !== 'practicing' || transitioning) return;
    if (timestamp - targetStartedAt >= LISTEN_TIMEOUT_MS) {
      completeTarget(false);
      return;
    }
    if (!reading) {
      cents = null;
      stableProgress = 0;
      stableMatch.reset();
      return;
    }

    const targetFrequency = calibratedFrequency(target.frequency, calibrationOffset);
    cents = centsBetween(reading.frequency, targetFrequency);
    const progress = stableMatch.update(
      Math.abs(cents) <= tolerance,
      timestamp,
      targetStartedAt
    );
    stableProgress = Math.min(1, progress / LISTEN_STABLE_MS);
    if (progress >= LISTEN_STABLE_MS) completeTarget(true);
  }

  function completeTarget(success: boolean): void {
    if (transitioning) return;
    transitioning = true;
    showHint = true;
    stableProgress = success ? 1 : 0;
    if (success) {
      correctCount += 1;
      selector.markSuccess(targetIndex);
      feedback = 'Matched';
    } else {
      missedCount += 1;
      selector.markMiss(targetIndex);
      feedback = 'Time — this note will return sooner';
    }

    advanceTimer = window.setTimeout(() => {
      targetIndex = selector.next(targetIndex);
      targetStartedAt = performance.now();
      stableMatch.reset();
      stableProgress = 0;
      detectedFrequency = null;
      cents = null;
      feedback = '';
      showHint = false;
      transitioning = false;
      advanceTimer = null;
    }, success ? 650 : 900);
  }

  onDestroy(() => {
    if (advanceTimer !== null) window.clearTimeout(advanceTimer);
    void microphonePitch.stop();
  });
</script>

<section class="listen-practice" aria-label="Listen practice">
  <div class="listen-heading">
    <div>
      <p class="kicker">Hands-free Nakai sight-reading drill</p>
      <h1>Listen practice</h1>
      <p>Play the shown note. FluteTab listens locally and moves on after a steady match.</p>
    </div>
    {#if active}
      <button class="stop-listening" onclick={stop}>Stop listening</button>
    {/if}
  </div>

  {#if phase === 'idle' || phase === 'error'}
    <div class="permission-card">
      <div class="privacy-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 15a4 4 0 0 0 4-4V7a4 4 0 0 0-8 0v4a4 4 0 0 0 4 4Zm-7-4a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>
      </div>
      <div>
        <h2>Ready when you are</h2>
        <p>
          Start once, allow microphone access, then keep both hands on your {fluteName} flute.
          Audio is analysed in this browser tab and is never recorded or uploaded.
        </p>
        {#if phase === 'error'}<p class="listen-error" role="alert">{errorMessage}</p>{/if}
        <button class="start-listening" onclick={start}>
          {phase === 'error' ? 'Try microphone again' : 'Start listen practice'}
        </button>
      </div>
    </div>
  {:else if phase === 'requesting'}
    <div class="permission-card" aria-live="polite">
      <div class="privacy-mark listening" aria-hidden="true"></div>
      <div><h2>Waiting for microphone permission…</h2></div>
    </div>
  {:else if phase === 'calibrating'}
    <div class="practice-stage calibration-stage">
      <p class="stage-label">First, calibrate your flute</p>
      <div class="target-note">
        <span>Fundamental</span>
        <strong>{notes[0].concertName}</strong>
        <small>{notes[0].frequency.toFixed(1)} Hz reference</small>
      </div>
      <div class="calibration-fingering">
        <FingeringDiagram fingering={notes[0].fingering} {orientation} />
      </div>
      <p>{calibrationMessage}</p>
      <div class="stability-meter" aria-label="Calibration stability">
        <i style={`width: ${stableProgress * 100}%`}></i>
      </div>
      <p class="detected-readout" aria-live="polite">
        {detectedFrequency ? `${detectedFrequency.toFixed(1)} Hz · ${Math.round(cents ?? 0)}¢` : 'Listening…'}
      </p>
    </div>
  {:else}
    <div class="practice-stage">
      <div class="session-line">
        <span>{calibrationMessage}</span>
        <span><strong>{correctCount}</strong> matched · <strong>{missedCount}</strong> timed out</span>
      </div>

      <div class="practice-target" class:matched={feedback === 'Matched'}>
        <div class="target-copy">
          <p class="stage-label">Play this Nakai note</p>
          <div
            class="nakai-prompt"
            use:measurePrompt
            role="img"
            aria-label={`Nakai notation ${target.nakaiName}`}
          >
            <StaffSystem
              notes={targetNotes}
              mode="nakai"
              activeIndex={null}
              width={promptWidth}
            />
          </div>
        </div>
      </div>

      <div class="answer-area">
        {#if showHint}
          <div class="answer-reveal" class:result={Boolean(feedback)}>
            <FingeringDiagram fingering={target.fingering} {orientation} size="small" />
            <div>
              <span>{feedback ? 'Answer' : 'Fingering hint'}</span>
              <strong>{target.concertName}</strong>
              <small>Nakai {target.nakaiName} · {target.intervalName}</small>
            </div>
          </div>
        {:else}
          <button class="hint-button" onclick={() => (showHint = true)}>Show fingering hint</button>
        {/if}
      </div>

      <div class="tuner" class:in-tune={cents !== null && Math.abs(cents) <= tolerance}>
        <div class="tuner-scale" aria-hidden="true">
          <span>♭</span>
          <div class="tuner-track">
            <i class="tolerance-zone" style={`left: ${50 - tolerance / 2}%; width: ${tolerance}%`}></i>
            <i
              class="tuner-needle"
              style={`left: ${50 + Math.max(-50, Math.min(50, cents ?? 0)) / 2}%`}
            ></i>
          </div>
          <span>♯</span>
        </div>
        <strong aria-live="polite">{feedback || tuningWord}</strong>
        <small>
          {cents === null ? 'Play and hold the note' : `${cents > 0 ? '+' : ''}${Math.round(cents)} cents`}
        </small>
        <div class="stability-meter" aria-label="Stable match progress">
          <i style={`width: ${stableProgress * 100}%`}></i>
        </div>
      </div>

      <label class="tolerance-control">
        <span>Match tolerance <strong>±{tolerance}¢</strong></span>
        <input
          type="range"
          min="20"
          max="50"
          step="5"
          bind:value={tolerance}
          aria-label="Pitch match tolerance in cents"
        />
        <small>Wider is more forgiving. Note attacks are ignored before matching begins.</small>
      </label>
    </div>
  {/if}
</section>
