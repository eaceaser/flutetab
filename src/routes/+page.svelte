<script lang="ts">
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { fluteSynth } from '$lib/audio/fluteSynth';
  import CombinedNotation from '$lib/components/CombinedNotation.svelte';
  import FingeringDiagram from '$lib/components/FingeringDiagram.svelte';
  import PracticeWorksheet from '$lib/components/PracticeWorksheet.svelte';
  import { NOTE_OPTIONS, REGISTER_OPTIONS, SCALE_DEFINITIONS } from '$lib/music/data';
  import { generatePracticeWorksheet, worksheetPlaybackNotes } from '$lib/music/practice';
  import {
    DEFAULT_STATE,
    DEFAULT_WORKSHEET_SCALE_IDS,
    DEFAULT_WORKSHEET_SECTIONS,
    getScaleNotes,
    midiForPitch,
    noteName,
    parseState,
    pitchClassLabel,
    playbackOrder,
    scaleById,
    serializeState
  } from '$lib/music/theory';
  import type {
    ExplorerState,
    PracticeExercise,
    PracticeSection,
    ScaleNote
  } from '$lib/music/types';

  let settings: ExplorerState = $state({ ...DEFAULT_STATE });
  let hydrated = $state(false);
  let activeIndex: number | null = $state(null);
  let isPlaying = $state(false);
  let shareLabel = $state('Share');

  let selectedScale = $derived(scaleById(settings.scaleId));
  let notes = $derived(getScaleNotes(settings));
  let exercises = $derived(generatePracticeWorksheet(settings));
  let fundamentalMidi = $derived(midiForPitch(settings.pitchClass, settings.octave));
  let fluteName = $derived(`${noteName(fundamentalMidi, false)} minor`);
  let playableCount = $derived(notes.filter((note) => note.status !== 'unavailable').length);
  let warningCount = $derived(notes.filter((note) => note.warning).length);
  let nativeRoot = $derived(settings.rootPitchClass === settings.pitchClass);
  let activeExercise = $derived(
    exercises.find((exercise) => exercise.notes.some((note) => note.index === activeIndex)) ?? null
  );

  const rangeLabels: Record<number, string> = {
    12: 'Octave',
    13: 'Octave + minor 2nd',
    14: 'Octave + major 2nd',
    15: 'Octave + minor 3rd',
    16: 'Octave + major 3rd',
    17: 'Octave + perfect 4th'
  };

  const worksheetSections: Array<{
    id: PracticeSection;
    label: string;
    description: string;
  }> = [
    { id: 'native-modes', label: 'Mode 1, 2 & 4', description: 'Natural flute centers' },
    { id: 'woven', label: 'Woven scale', description: 'Overlapping note cells' },
    { id: 'thirds', label: 'Broken thirds', description: 'Classical interval bridge' },
    { id: 'tonic-arpeggio', label: 'Tonic arpeggio', description: 'Minor triad and return' },
    { id: 'chord-family', label: 'Mode 1 chord family', description: 'i, iv and v7' },
    {
      id: 'chord-progression',
      label: 'Four-chord pattern',
      description: 'Native-flute dexterity study'
    },
    { id: 'prompts', label: 'Practice prompts', description: 'Articulation and scale song' }
  ];

  const groupedScales = $derived(
    [...new Set(SCALE_DEFINITIONS.map((scale) => scale.family))].map((family) => ({
      family,
      scales: SCALE_DEFINITIONS.filter((scale) => scale.family === family)
    }))
  );

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    settings = parseState(params);
    if (!params.has('range')) {
      const savedRange = Number(localStorage.getItem(profileKey(settings)));
      if (Number.isInteger(savedRange) && savedRange >= 12 && savedRange <= 17) {
        settings.maxSemitones = savedRange;
      }
    }
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
    localStorage.setItem(profileKey(settings), String(settings.maxSemitones));
  });

  function profileKey(state: Pick<ExplorerState, 'pitchClass' | 'octave'>): string {
    return `flutetab-range-${state.pitchClass}-${state.octave}`;
  }

  function defaultRange(pitchClass: number, octave: number): number {
    return pitchClass === 9 && octave === 4 ? 15 : 12;
  }

  function rangeForProfile(pitchClass: number, octave: number): number {
    const saved = Number(localStorage.getItem(profileKey({ pitchClass, octave })));
    return Number.isInteger(saved) && saved >= 12 && saved <= 17
      ? saved
      : defaultRange(pitchClass, octave);
  }

  function changeFundamental(event: Event) {
    const pitchClass = Number((event.currentTarget as HTMLSelectElement).value);
    settings.pitchClass = pitchClass;
    settings.maxSemitones = rangeForProfile(pitchClass, settings.octave);
  }

  function changeRegister(event: Event) {
    const octave = Number((event.currentTarget as HTMLSelectElement).value);
    settings.octave = octave;
    settings.maxSemitones = rangeForProfile(settings.pitchClass, octave);
  }

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
    if (settings.view === 'practice') {
      const sequences = worksheetPlaybackNotes(exercises);
      if (sequences.length === 0) return;
      isPlaying = true;
      fluteSynth.playSequences(sequences, settings.tempo, (note) => {
        activeIndex = note?.index ?? null;
        if (!note) isPlaying = false;
      });
      return;
    }
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

  function playExercise(exercise: PracticeExercise) {
    stopPlayback();
    const sequence = exercise.notes.filter((note) => note.status !== 'unavailable');
    if (!sequence.length) return;
    isPlaying = true;
    fluteSynth.playSequence(sequence, settings.tempo, (note) => {
      activeIndex = note?.index ?? null;
      if (!note) isPlaying = false;
    });
  }

  function resetWorksheet() {
    settings.worksheetScaleIds = [...DEFAULT_WORKSHEET_SCALE_IDS];
    settings.worksheetSections = [...DEFAULT_WORKSHEET_SECTIONS];
    settings.scaleId = 'minor-pentatonic';
  }
</script>

<svelte:head>
  <title>FluteTab — Nakai scale explorer & practice worksheets</title>
  <meta
    name="description"
    content="Explore Native American-style flute scales and generate range-aware practice worksheets with Nakai notation, concert pitch, fingerings, and audio."
  />
</svelte:head>

<header class="site-header">
  <a class="brand" href="/" aria-label="FluteTab home">
    <svg viewBox="0 0 28 48" aria-hidden="true">
      <path d="M9 3h10l3 5v36H6V8l3-5Z" />
      <circle class="tone-hole" cx="14" cy="14" r="1.8" />
      <circle class="tone-hole" cx="14" cy="19" r="1.8" />
      <circle class="tone-hole" cx="14" cy="24" r="1.8" />
      <circle class="tone-hole" cx="14" cy="29" r="1.8" />
      <circle class="tone-hole" cx="14" cy="34" r="1.8" />
      <circle class="tone-hole" cx="14" cy="39" r="1.8" />
    </svg>
    <span>FluteTab</span>
  </a>
  <nav aria-label="Page actions">
    <button class="quiet-button" onclick={share} aria-live="polite">{shareLabel}</button>
    <button class="quiet-button print-button" onclick={() => window.print()}>Print</button>
  </nav>
</header>

<main>
  <nav class="view-switcher" aria-label="App view">
    <button
      class:active={settings.view === 'explore'}
      aria-pressed={settings.view === 'explore'}
      onclick={() => (settings.view = 'explore')}
    >
      <span>Explore</span>
      <small>One scale in depth</small>
    </button>
    <button
      class:active={settings.view === 'practice'}
      aria-pressed={settings.view === 'practice'}
      onclick={() => (settings.view = 'practice')}
    >
      <span>Practice worksheet</span>
      <small>Scales, patterns & arpeggios</small>
    </button>
  </nav>

  <div class="workspace">
    <aside class="control-panel" aria-label={settings.view === 'practice' ? 'Worksheet configuration' : 'Scale configuration'}>
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
          <select value={settings.pitchClass} onchange={changeFundamental} aria-label="Fundamental">
            {#each NOTE_OPTIONS as option}
              <option value={option.pitchClass}>{option.label}</option>
            {/each}
          </select>
        </label>
        <label>
          <span>Register</span>
          <select value={settings.octave} onchange={changeRegister} aria-label="Register">
            {#each REGISTER_OPTIONS as option}
              <option value={option.octave}>{option.label} · octave {option.octave}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="control-stack">
        <label>
          <span>Highest stable note</span>
          <select bind:value={settings.maxSemitones} aria-label="Highest stable note">
            {#each [12, 13, 14, 15, 16, 17] as semitones}
              <option value={semitones}>
                {noteName(fundamentalMidi + semitones, false)} · {rangeLabels[semitones]}
              </option>
            {/each}
          </select>
        </label>
        <p class="control-help">
          Notes through {noteName(fundamentalMidi + settings.maxSemitones, false)} may be used.
          Half-hole and upper-register fingerings remain marked.
        </p>
      </div>

      <div class="divider"></div>

      <div class="panel-heading">
        <div>
          <span class="step">02</span>
          <h2>{settings.view === 'practice' ? 'Build worksheet' : 'Choose a scale'}</h2>
        </div>
      </div>

      {#if settings.view === 'explore'}
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
      {:else}
        <div class="control-stack">
          <label>
            <span>Practice key</span>
            <select bind:value={settings.rootPitchClass} aria-label="Practice key">
              {#each NOTE_OPTIONS as option}
                <option value={option.pitchClass}>{option.label}</option>
              {/each}
            </select>
          </label>
          <label>
            <span>Focus scale for patterns</span>
            <select bind:value={settings.scaleId} aria-label="Focus scale">
              {#each groupedScales as group}
                <optgroup label={group.family}>
                  {#each group.scales as scale}
                    <option value={scale.id}>{scale.name}</option>
                  {/each}
                </optgroup>
              {/each}
            </select>
          </label>
        </div>

        <fieldset class="worksheet-options">
          <legend>Parallel scale pages</legend>
          {#each [
            ['minor-pentatonic', 'Minor pentatonic'],
            ['dorian', 'Dorian / Nakai'],
            ['aeolian', 'Natural minor'],
            ['minor-blues', 'Minor blues'],
            ['harmonic-minor', 'Harmonic minor'],
            ['melodic-minor', 'Melodic minor']
          ] as scaleOption}
            <label class="check-row">
              <input
                type="checkbox"
                value={scaleOption[0]}
                bind:group={settings.worksheetScaleIds}
              />
              <span>{scaleOption[1]}</span>
            </label>
          {/each}
        </fieldset>

        <fieldset class="worksheet-options">
          <legend>Exercise blocks</legend>
          {#each worksheetSections as section}
            <label class="check-row">
              <input type="checkbox" value={section.id} bind:group={settings.worksheetSections} />
              <span>
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </span>
            </label>
          {/each}
        </fieldset>

        <button class="preset-button" onclick={resetWorksheet}>Restore Daily Practice preset</button>

        <div class="scale-summary worksheet-summary">
          <span>Physical range</span>
          <strong>{noteName(fundamentalMidi, false)}–{noteName(fundamentalMidi + settings.maxSemitones, false)}</strong>
          <p>
            {exercises.length} exercises in {pitchClassLabel(settings.rootPitchClass)}.
            Range-limited pages are labeled instead of silently changing their notes.
          </p>
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
      {/if}
    </aside>

    {#if settings.view === 'practice'}
      <section class="explorer" aria-label="Generated practice worksheet">
        <PracticeWorksheet
          {exercises}
          {activeIndex}
          orientation={settings.orientation}
          showPrompts={settings.worksheetSections.includes('prompts')}
          onPlayExercise={playExercise}
        />
      </section>
    {:else}
    <section class="explorer" aria-label="Generated scale">
      <div class="explorer-heading">
        <div>
          <p class="kicker">Your scale</p>
          <h1>{pitchClassLabel(settings.rootPitchClass)} {selectedScale.shortName}</h1>
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
              <span class="degree">Degree {note.degreeLabel}</span>
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
    {/if}
  </div>
</main>

<section class="practice-bar" aria-label="Practice playback">
  <div class="practice-inner">
    <div class="now-playing">
      <span class="sound-bars" class:playing={isPlaying} aria-hidden="true"><i></i><i></i><i></i></span>
      <div>
        <small>{isPlaying ? 'Now playing' : 'Practice player'}</small>
        <strong>
          {#if settings.view === 'practice'}
            {activeExercise?.title ?? `${pitchClassLabel(settings.rootPitchClass)} worksheet`}
          {:else}
            {activeIndex === null ? `${pitchClassLabel(settings.rootPitchClass)} ${selectedScale.shortName}` : notes[activeIndex]?.concertName}
          {/if}
        </strong>
      </div>
    </div>

    <div class="transport">
      <button class="icon-button" onclick={restartPlayback} aria-label={settings.view === 'practice' ? 'Restart worksheet' : 'Restart scale'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v6h6M5.5 16A8 8 0 1 0 6 7" /></svg>
      </button>
      {#if isPlaying}
        <button class="play-button" onclick={stopPlayback} aria-label="Stop playback">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h8v10H8z" /></svg>
        </button>
      {:else}
        <button class="play-button" onclick={startPlayback} aria-label={settings.view === 'practice' ? 'Play worksheet' : 'Play scale'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z" /></svg>
        </button>
      {/if}
    </div>

    <div class="practice-settings" class:single={settings.view === 'practice'}>
      {#if settings.view === 'explore'}
      <label class="direction-control">
        <span>Direction</span>
        <select bind:value={settings.direction} aria-label="Direction">
          <option value="up">Ascending</option>
          <option value="down">Descending</option>
          <option value="both">Up & down</option>
        </select>
      </label>
      {/if}
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
