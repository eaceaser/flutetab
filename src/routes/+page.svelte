<script lang="ts">
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { fluteSynth } from '$lib/audio/fluteSynth';
  import CombinedNotation from '$lib/components/CombinedNotation.svelte';
  import FingeringDiagram from '$lib/components/FingeringDiagram.svelte';
  import { NOTE_OPTIONS, REGISTER_OPTIONS, SCALE_DEFINITIONS } from '$lib/music/data';
  import {
    DEFAULT_STATE,
    getScaleNotes,
    midiForPitch,
    noteName,
    parseState,
    pitchClassLabel,
    playbackOrder,
    scaleById,
    serializeState
  } from '$lib/music/theory';
  import type { ExplorerState, ScaleNote } from '$lib/music/types';

  let settings: ExplorerState = $state({ ...DEFAULT_STATE });
  let hydrated = $state(false);
  let activeIndex: number | null = $state(null);
  let isPlaying = $state(false);
  let shareLabel = $state('Share');

  let selectedScale = $derived(scaleById(settings.scaleId));
  let notes = $derived(getScaleNotes(settings));
  let fundamentalMidi = $derived(midiForPitch(settings.pitchClass, settings.octave));
  let fluteName = $derived(`${noteName(fundamentalMidi, false)} minor`);
  let playableCount = $derived(notes.filter((note) => note.status !== 'unavailable').length);
  let warningCount = $derived(notes.filter((note) => note.warning).length);
  let nativeRoot = $derived(settings.rootPitchClass === settings.pitchClass);

  const groupedScales = $derived(
    [...new Set(SCALE_DEFINITIONS.map((scale) => scale.family))].map((family) => ({
      family,
      scales: SCALE_DEFINITIONS.filter((scale) => scale.family === family)
    }))
  );

  onMount(() => {
    settings = parseState(new URLSearchParams(window.location.search));
    const readyTimer = window.setTimeout(() => {
      hydrated = true;
    }, 0);
    return () => {
      window.clearTimeout(readyTimer);
      fluteSynth.stop();
    };
  });

  $effect(() => {
    if (!hydrated) return;
    const params = serializeState(settings);
    const query = params.toString();
    replaceState(query ? `?${query}` : window.location.pathname, {});
    fluteSynth.stop();
    isPlaying = false;
    activeIndex = null;
  });

  function preview(note: ScaleNote) {
    if (note.status === 'unavailable') return;
    fluteSynth.playNote(note);
    activeIndex = note.index;
    isPlaying = false;
    window.setTimeout(() => {
      if (!isPlaying && activeIndex === note.index) activeIndex = null;
    }, 650);
  }

  function startPlayback() {
    const sequence = playbackOrder(
      notes.filter((note) => note.status !== 'unavailable'),
      settings.direction
    );
    if (sequence.length === 0) return;
    isPlaying = true;
    fluteSynth.playSequence(sequence, settings.tempo, (note) => {
      activeIndex = note?.index ?? null;
      if (!note) isPlaying = false;
    });
  }

  function stopPlayback() {
    fluteSynth.stop();
    isPlaying = false;
    activeIndex = null;
  }

  function restartPlayback() {
    stopPlayback();
    startPlayback();
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareLabel = 'Link copied';
    } catch {
      shareLabel = 'Copy the URL';
    }
    window.setTimeout(() => (shareLabel = 'Share'), 1800);
  }

  function resetNativeScale() {
    settings.rootPitchClass = settings.pitchClass;
    settings.scaleId = 'minor-pentatonic';
  }
</script>

<svelte:head>
  <title>FluteTab — Nakai scale explorer</title>
  <meta
    name="description"
    content="Explore Native American-style flute scales through Nakai notation, concert pitch, fingerings, and audio."
  />
</svelte:head>

<header class="site-header">
  <a class="brand" href="/" aria-label="FluteTab home">
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 38 36 11c2-2 5-2 7 0s2 5 0 7L16 45H9v-7Z" />
      <circle cx="34" cy="20" r="2.1" />
      <circle cx="29" cy="25" r="2.1" />
      <circle cx="24" cy="30" r="2.1" />
    </svg>
    <span>FluteTab</span>
  </a>
  <nav aria-label="Page actions">
    <button class="quiet-button" onclick={share} aria-live="polite">{shareLabel}</button>
    <button class="quiet-button print-button" onclick={() => window.print()}>Print</button>
  </nav>
</header>

<main>
  <section class="hero">
    <div>
      <p class="kicker">Nakai scale explorer</p>
      <h1>See the music you already know.</h1>
      <p class="hero-copy">
        Connect fingering, interval, Nakai tablature, and concert pitch—then hear the scale on your
        flute.
      </p>
    </div>
    <div class="hero-mark" aria-hidden="true">
      <span>F♯</span>
      <small>always written</small>
    </div>
  </section>

  <div class="workspace">
    <aside class="control-panel" aria-label="Scale configuration">
      <div class="panel-heading">
        <div>
          <span class="step">01</span>
          <h2>Set your flute</h2>
        </div>
        <span class="flute-chip">{fluteName}</span>
      </div>

      <div class="control-grid flute-controls">
        <label>
          <span>Fundamental</span>
          <select bind:value={settings.pitchClass} aria-label="Fundamental">
            {#each NOTE_OPTIONS as option}
              <option value={option.pitchClass}>{option.label}</option>
            {/each}
          </select>
        </label>
        <label>
          <span>Register</span>
          <select bind:value={settings.octave} aria-label="Register">
            {#each REGISTER_OPTIONS as option}
              <option value={option.octave}>{option.label} · octave {option.octave}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="divider"></div>

      <div class="panel-heading">
        <div>
          <span class="step">02</span>
          <h2>Choose a scale</h2>
        </div>
      </div>

      <div class="control-stack">
        <label>
          <span>Scale type</span>
          <select bind:value={settings.scaleId} aria-label="Scale type">
            {#each groupedScales as group}
              <optgroup label={group.family}>
                {#each group.scales as scale}
                  <option value={scale.id}>{scale.name}</option>
                {/each}
              </optgroup>
            {/each}
          </select>
        </label>
        <label>
          <span>Scale root</span>
          <select bind:value={settings.rootPitchClass} aria-label="Scale root">
            {#each NOTE_OPTIONS as option}
              <option value={option.pitchClass}>{option.label}</option>
            {/each}
          </select>
        </label>
      </div>

      {#if !nativeRoot}
        <div class="root-notice">
          <div>
            <strong>Alternate root</strong>
            <span>This scale begins above your flute’s fundamental.</span>
          </div>
          <button onclick={resetNativeScale}>Use native scale</button>
        </div>
      {/if}

      <div class="scale-summary">
        <span>{selectedScale.family}</span>
        <strong>{pitchClassLabel(settings.rootPitchClass)} {selectedScale.shortName}</strong>
        <p>{selectedScale.description}</p>
        <code>{selectedScale.formula}</code>
      </div>

      <details class="advanced-controls">
        <summary>Display preferences</summary>
        <div class="control-stack details-body">
          <label>
            <span>Accidental spelling</span>
            <select bind:value={settings.accidentalPreference} aria-label="Accidental spelling">
              <option value="context">Follow scale context</option>
              <option value="sharps">Prefer sharps</option>
              <option value="flats">Prefer flats</option>
            </select>
          </label>
          <label>
            <span>Fingering orientation</span>
            <select bind:value={settings.orientation} aria-label="Fingering orientation">
              <option value="mouth-up">Mouth end up</option>
              <option value="mouth-down">Mouth end down</option>
            </select>
          </label>
        </div>
      </details>
    </aside>

    <section class="explorer" aria-label="Generated scale">
      <div class="explorer-heading">
        <div>
          <p class="kicker">Your scale</p>
          <h2>{pitchClassLabel(settings.rootPitchClass)} {selectedScale.shortName}</h2>
          <p>
            On a {fluteName} flute · {playableCount} of {notes.length} notes modeled
            {#if warningCount > 0}<span class="warning-count">· {warningCount} need care</span>{/if}
          </p>
        </div>
        <div class="legend" aria-label="Fingering legend">
          <span><i class="dot primary"></i> Straight</span>
          <span><i class="dot caution"></i> Varies</span>
          <span><i class="dot unavailable"></i> Outside range</span>
        </div>
      </div>

      <div class="staffs">
        <CombinedNotation
          {notes}
          {activeIndex}
          orientation={settings.orientation}
        />
      </div>

      <div class="bridge-note">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5" />
        </svg>
        <p>
          <strong>Why two staves?</strong> Nakai notation keeps the flute root at written F♯ so
          finger patterns transfer between flutes. Concert pitch shows what your {fluteName} flute
          actually sounds.
        </p>
      </div>

      <div class="note-section-heading">
        <div>
          <p class="kicker">Note by note</p>
          <h2>Finger the scale</h2>
        </div>
        <span>Tap a card to hear it</span>
      </div>

      <div class="note-cards" aria-label="Scale fingering cards">
        {#each notes as note}
          <button
            class:active={activeIndex === note.index}
            class:unavailable={note.status === 'unavailable'}
            class:caution={note.warning && note.status !== 'unavailable'}
            class="note-card"
            onclick={() => preview(note)}
            disabled={note.status === 'unavailable'}
            aria-label={`${note.concertName}, ${note.intervalName}${note.warning ? `, ${note.warning}` : ''}`}
          >
            <div class="card-top">
              <span class="degree">Degree {note.degree}</span>
              {#if note.warning}<span class="status-icon" aria-hidden="true">!</span>{/if}
            </div>
            <FingeringDiagram fingering={note.fingering} orientation={settings.orientation} />
            <div class="note-identity">
              <strong>{note.concertName}</strong>
              <span>{note.frequency.toFixed(1)} Hz</span>
            </div>
            <div class="note-meta">
              <span><small>Nakai</small>{note.nakaiName}</span>
              <span><small>Interval</small>{note.intervalName}</span>
            </div>
            {#if note.warning}<p class="warning-text">{note.warning}</p>{/if}
          </button>
        {/each}
      </div>

      <section class="learn-card">
        <div class="learn-intro">
          <p class="kicker">A classical player’s bridge</p>
          <h2>What changes—and what stays familiar</h2>
          <p>
            Rhythm, contour, phrasing, intervals, and expressive intent work as you expect. Nakai
            notation changes the reference pitch so one fingering-based score can travel between
            differently keyed flutes.
          </p>
        </div>
        <div class="learn-points">
          <div>
            <span>01</span>
            <h3>Read the interval first</h3>
            <p>The straight scale is 1–♭3–4–5–♭7–8, regardless of flute key.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Expect flexible pitch</h3>
            <p>Breath pressure and partial coverage can move pitch more than keyed instruments do.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Verify extensions</h3>
            <p>Cross-fingerings and upper-register notes differ across individual makers and flutes.</p>
          </div>
        </div>
        <details>
          <summary>Sources and further learning</summary>
          <ul>
            <li><a href="https://www.flutopedia.com/nakai_tablature.htm" target="_blank" rel="noreferrer">Flutopedia: Nakai tablature</a></li>
            <li><a href="https://www.flutopedia.com/fingerings.htm" target="_blank" rel="noreferrer">Flutopedia: fingering charts</a></li>
            <li><a href="https://nativeflutehandbook.com/pdf/NativeFluteHandbook_NinthEdition.pdf" target="_blank" rel="noreferrer">Clint & Vera’s Native Flute Handbook</a></li>
            <li><a href="https://www.flutetree.org/songbook/scales/" target="_blank" rel="noreferrer">FluteTree scale library</a></li>
          </ul>
        </details>
      </section>
    </section>
  </div>
</main>

<section class="practice-bar" aria-label="Practice playback">
  <div class="practice-inner">
    <div class="now-playing">
      <span class="sound-bars" class:playing={isPlaying} aria-hidden="true"><i></i><i></i><i></i></span>
      <div>
        <small>{isPlaying ? 'Now playing' : 'Practice player'}</small>
        <strong>{activeIndex === null ? `${pitchClassLabel(settings.rootPitchClass)} ${selectedScale.shortName}` : notes[activeIndex]?.concertName}</strong>
      </div>
    </div>

    <div class="transport">
      <button class="icon-button" onclick={restartPlayback} aria-label="Restart scale">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v6h6M5.5 16A8 8 0 1 0 6 7" /></svg>
      </button>
      {#if isPlaying}
        <button class="play-button" onclick={stopPlayback} aria-label="Stop playback">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h8v10H8z" /></svg>
        </button>
      {:else}
        <button class="play-button" onclick={startPlayback} aria-label="Play scale">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z" /></svg>
        </button>
      {/if}
    </div>

    <div class="practice-settings">
      <label class="direction-control">
        <span>Direction</span>
        <select bind:value={settings.direction} aria-label="Direction">
          <option value="up">Ascending</option>
          <option value="down">Descending</option>
          <option value="both">Up & down</option>
        </select>
      </label>
      <label class="tempo-control">
        <span>Tempo <strong>{settings.tempo}</strong></span>
        <input type="range" min="40" max="200" step="2" bind:value={settings.tempo} aria-label="Tempo in beats per minute" />
      </label>
    </div>
  </div>
</section>

<footer>
  <span>FluteTab</span>
  <p>Built for exploration. Verify alternate fingerings and tuning on your own instrument.</p>
</footer>
