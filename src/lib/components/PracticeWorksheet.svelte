<script lang="ts">
  import CombinedNotation from './CombinedNotation.svelte';
  import type {
    FingeringOrientation,
    PracticeExercise,
    ScaleNote
  } from '../music/types';

  let {
    exercises,
    activeIndex = null,
    orientation = 'mouth-up',
    showPrompts = true,
    onPlayExercise
  }: {
    exercises: PracticeExercise[];
    activeIndex?: number | null;
    orientation?: FingeringOrientation;
    showPrompts?: boolean;
    onPlayExercise: (exercise: PracticeExercise) => void;
  } = $props();

  const isActive = (exercise: PracticeExercise) =>
    exercise.notes.some((note: ScaleNote) => note.index === activeIndex);
</script>

<div class="worksheet">
  <header class="worksheet-title">
    <div>
      <p class="kicker">Generated daily practice</p>
      <h1>Scale & arpeggio worksheet</h1>
      <p>
        Every pitch is bounded by your flute profile. Concert pitch, Nakai notation, and
        fingering remain aligned note by note.
      </p>
    </div>
    <span>{exercises.length} exercises</span>
  </header>

  {#if exercises.length === 0}
    <div class="empty-state">
      <h3>Select at least one exercise</h3>
      <p>Use the worksheet controls to add scales, patterns, or arpeggios.</p>
    </div>
  {:else}
    <div class="exercise-list">
      {#each exercises as exercise, index (exercise.id)}
        {#if index === 0 || exercises[index - 1].group !== exercise.group}
          <div class="group-heading">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{exercise.group}</h3>
          </div>
        {/if}

        <article class:active={isActive(exercise)} class="exercise-card">
          <header>
            <div>
              {#if exercise.rangeLimited}
                <div class="exercise-labels"><em>Range-limited</em></div>
              {/if}
              <h3>{exercise.title}</h3>
              {#if exercise.rangeLimited || exercise.kind !== 'scale'}
                <p>{exercise.subtitle}</p>
              {/if}
              <code>{exercise.formula}</code>
            </div>
            <button
              type="button"
              class="exercise-play"
              onclick={() => onPlayExercise(exercise)}
              aria-label={`Play ${exercise.title}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 7 8 5-8 5V7Z" />
              </svg>
              <span>Play</span>
            </button>
          </header>

          <CombinedNotation
            notes={exercise.notes}
            {activeIndex}
            {orientation}
            compact
            showLayerLabels={index === 0}
          />
        </article>
      {/each}
    </div>
  {/if}

  {#if showPrompts}
    <section class="practice-prompts">
      <p class="kicker">Turn technique into music</p>
      <h2>Three passes, then one scale song</h2>
      <div>
        <article>
          <span>01</span>
          <h3>Legato</h3>
          <p>Keep the air continuous and make every finger change quiet.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Tongued</h3>
          <p>Repeat with an even “ta” attack, then try short staccato notes.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Scale song</h3>
          <p>Move forward through the focus scale, freely repeating notes before advancing.</p>
        </article>
      </div>
      <details>
        <summary>Practice-method sources</summary>
        <ul>
          <li>
            <a href="https://www.flutopedia.com/from_scales_to_songs.htm" target="_blank" rel="noreferrer">
              Flutopedia: From Scales to Songs
            </a>
          </li>
          <li>
            <a href="https://clintgoss.com/pdf/TechniqueExercises.pdf" target="_blank" rel="noreferrer">
              Clint Goss: Exercises for Developing Technique
            </a>
          </li>
          <li>
            <a href="https://www.flutopedia.com/guitar.htm" target="_blank" rel="noreferrer">
              Flutopedia: mode-based chord families
            </a>
          </li>
        </ul>
      </details>
    </section>
  {/if}
</div>

<style>
  .worksheet {
    min-width: 0;
  }

  .worksheet-title {
    align-items: flex-start;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    padding: 0.2rem 0 1.2rem;
  }

  .worksheet-title h1,
  .practice-prompts h2 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 5vw, 2.55rem);
    line-height: 1;
    margin: 0;
  }

  .worksheet-title p:not(.kicker) {
    color: var(--text-muted);
    font-size: 0.82rem;
    margin: 0.55rem 0 0;
    max-width: 45rem;
  }

  .worksheet-title > span {
    background: var(--teal-soft);
    border-radius: 999px;
    color: var(--teal-dark);
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.4rem 0.65rem;
  }

  .exercise-list {
    display: grid;
    gap: 1rem;
  }

  .group-heading {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    margin-top: 1.2rem;
  }

  .group-heading span {
    align-items: center;
    background: var(--teal-dark);
    border-radius: 50%;
    color: white;
    display: flex;
    font-size: 0.62rem;
    font-weight: 800;
    height: 2rem;
    justify-content: center;
    width: 2rem;
  }

  .group-heading h3 {
    font-family: var(--font-display);
    font-size: 1.45rem;
    margin: 0;
  }

  .exercise-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    min-width: 0;
    overflow: hidden;
    padding: 0.85rem;
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }

  .exercise-card.active {
    border-color: var(--terracotta);
    box-shadow: 0 12px 35px rgb(181 92 56 / 13%);
  }

  .exercise-card > header {
    align-items: flex-start;
    display: flex;
    gap: 0.8rem;
    justify-content: space-between;
    padding: 0.2rem 0.2rem 0.85rem;
  }

  .exercise-card h3 {
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 3vw, 1.6rem);
    line-height: 1.1;
    margin: 0.2rem 0;
  }

  .exercise-card p {
    color: var(--text-muted);
    font-size: 0.72rem;
    margin: 0.25rem 0 0.45rem;
  }

  .exercise-card code {
    color: var(--teal-dark);
    font-family: var(--font-sans);
    font-size: 0.66rem;
    font-weight: 750;
  }

  .exercise-labels {
    align-items: center;
    display: flex;
    gap: 0.45rem;
  }

  .exercise-labels em {
    font-size: 0.58rem;
    font-style: normal;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .exercise-labels em {
    background: var(--terracotta-soft);
    border-radius: 999px;
    color: var(--danger);
    padding: 0.2rem 0.38rem;
  }

  .exercise-play {
    align-items: center;
    background: var(--teal-dark);
    border: 0;
    border-radius: 999px;
    color: white;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    gap: 0.25rem;
    padding: 0.5rem 0.7rem;
  }

  .exercise-play svg {
    fill: currentColor;
    height: 1rem;
    width: 1rem;
  }

  .empty-state {
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 3rem 1rem;
    text-align: center;
  }

  .empty-state h3 {
    font-family: var(--font-display);
    margin: 0;
  }

  .empty-state p {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .practice-prompts {
    background: var(--ink);
    border-radius: var(--radius-lg);
    color: #f9f4e9;
    margin: 2rem 0 1rem;
    padding: clamp(1.1rem, 4vw, 2rem);
  }

  .practice-prompts .kicker {
    color: #86bdb4;
  }

  .practice-prompts > div {
    display: grid;
    gap: 0.8rem;
    margin-top: 1.3rem;
  }

  .practice-prompts article {
    border-top: 1px solid rgb(255 255 255 / 16%);
    padding-top: 0.7rem;
  }

  .practice-prompts span {
    color: #86bdb4;
    font-size: 0.62rem;
    font-weight: 800;
  }

  .practice-prompts h3 {
    font-family: var(--font-display);
    margin: 0.2rem 0;
  }

  .practice-prompts article p {
    color: #b6c2be;
    font-size: 0.75rem;
    margin: 0;
  }

  .practice-prompts details {
    border-top: 1px solid rgb(255 255 255 / 16%);
    margin-top: 1rem;
  }

  .practice-prompts summary {
    color: #b9ded7;
  }

  .practice-prompts ul {
    font-size: 0.72rem;
    margin: 0 0 0.5rem;
    padding-left: 1.2rem;
  }

  .practice-prompts li {
    margin: 0.35rem 0;
  }

  .practice-prompts a {
    color: #b9ded7;
  }

  @media (min-width: 700px) {
    .exercise-card {
      padding: 1rem;
    }

    .practice-prompts > div {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media print {
    .worksheet-title > span,
    .exercise-play {
      display: none;
    }

    .group-heading {
      break-after: avoid;
    }

    .exercise-card {
      border: 0;
      border-radius: 0;
      box-shadow: none;
      break-inside: auto;
      padding: 0;
    }

    .exercise-card > header {
      break-after: avoid;
    }

    .practice-prompts {
      break-inside: avoid;
    }
  }
</style>
