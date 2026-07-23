<script lang="ts">
  import { onMount } from 'svelte';
  import FingeringDiagram from './FingeringDiagram.svelte';
  import StaffSystem from './StaffSystem.svelte';
  import type { FingeringOrientation, ScaleNote } from '../music/types';

  let {
    notes,
    activeIndex = null,
    orientation = 'mouth-up'
  }: {
    notes: ScaleNote[];
    activeIndex?: number | null;
    orientation?: FingeringOrientation;
  } = $props();

  let sheet: HTMLDivElement;
  let width = $state(320);
  let alignedLayers: Record<string, boolean> = $state({});
  let columnStart = 174;
  let columnEnd = $derived(width - 34);
  let notesPerSystem = $derived(
    Math.max(2, Math.min(8, Math.floor((columnEnd - columnStart) / 54) + 1))
  );
  let systems = $derived(
    Array.from({ length: Math.ceil(notes.length / notesPerSystem) }, (_, index) =>
      notes.slice(index * notesPerSystem, (index + 1) * notesPerSystem)
    )
  );

  function columnsFor(count: number): number[] {
    if (count === 1) return [(columnStart + columnEnd) / 2];
    return Array.from(
      { length: count },
      (_, index) => columnStart + (index * (columnEnd - columnStart)) / (count - 1)
    );
  }

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      width = Math.floor(entry.contentRect.width);
      alignedLayers = {};
    });
    observer.observe(sheet);
    width = Math.floor(sheet.getBoundingClientRect().width);
    return () => observer.disconnect();
  });
</script>

<div class="notation-sheet" bind:this={sheet}>
  <div class="sheet-heading">
    <div>
      <span class="eyebrow">Unified score</span>
      <h3>Concert, Nakai & fingering</h3>
    </div>
    <span class="alignment-note">Note-aligned</span>
  </div>

  <div class="sheet-systems" role="group" aria-label="Concert pitch, Nakai notation, and fingering tablature">
    {#each systems as system, systemIndex (`${systemIndex}-${system.map((note) => note.midi).join('-')}`)}
      {@const columns = columnsFor(system.length)}
      <section class="notation-system" aria-label={`Music system ${systemIndex + 1}`}>
        <div class="layer-heading">
          <h4>Concert pitch</h4>
          {#if systemIndex === 0}<small>Sounding notes</small>{/if}
        </div>
        <div class="concert-layer">
          <StaffSystem
            notes={system}
            mode="concert"
            {activeIndex}
            {width}
            columnPositions={columns}
            onPositions={() => {
              alignedLayers[`concert-${systemIndex}`] = true;
            }}
          />
        </div>

        <div class="layer-heading nakai-heading">
          <h4>Nakai notation</h4>
          {#if systemIndex === 0}<small>Fixed four-sharp transposition</small>{/if}
        </div>
        <div class="nakai-layer">
          <StaffSystem
            notes={system}
            mode="nakai"
            {activeIndex}
            {width}
            columnPositions={columns}
            onPositions={() => {
              alignedLayers[`nakai-${systemIndex}`] = true;
            }}
          />
        </div>

        <div class="layer-heading fingering-heading">
          <h4>Fingering tablature</h4>
          {#if systemIndex === 0}<small>Mouth end shown by the tapered cap</small>{/if}
        </div>
        <div
          class="fingering-layer"
          data-aligned={alignedLayers[`concert-${systemIndex}`] === true &&
          alignedLayers[`nakai-${systemIndex}`] === true}
        >
          {#each system as note, noteIndex}
            <div class="fingering-position" style={`left: ${columns[noteIndex]}px`}>
              <FingeringDiagram fingering={note.fingering} {orientation} size="small" />
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <div class="sheet-note-names">
    <p><strong>Concert</strong> {notes.map((note) => note.concertName).join(' · ')}</p>
    <p><strong>Nakai</strong> {notes.map((note) => note.nakaiName).join(' · ')}</p>
  </div>
</div>

<style>
  .notation-sheet {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .sheet-heading {
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 1rem 1rem 0.65rem;
  }

  h3 {
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 3vw, 1.55rem);
    font-weight: 650;
    margin: 0.12rem 0 0;
  }

  .eyebrow {
    color: var(--teal);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .alignment-note {
    background: var(--teal-soft);
    border-radius: 999px;
    color: var(--teal-dark);
    font-size: 0.7rem;
    font-weight: 750;
    padding: 0.34rem 0.58rem;
  }

  .notation-system {
    padding-top: 0.25rem;
  }

  .notation-system + .notation-system {
    border-top: 1px dashed var(--border);
    margin-top: 0.85rem;
    padding-top: 1rem;
  }

  .layer-heading {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
    margin: 0 1rem -0.35rem;
    position: relative;
    z-index: 1;
  }

  .layer-heading h4 {
    color: var(--teal);
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    margin: 0;
    text-transform: uppercase;
  }

  .layer-heading small {
    color: var(--text-muted);
    font-size: 0.62rem;
  }

  .nakai-heading {
    margin-top: 0.2rem;
  }

  .fingering-heading {
    margin-top: -0.3rem;
  }

  .fingering-layer {
    height: 7.35rem;
    position: relative;
    width: 100%;
  }

  .fingering-position {
    position: absolute;
    top: 0.35rem;
    transform: translateX(-50%);
  }

  .sheet-note-names {
    border-top: 1px solid var(--border-soft);
    color: var(--text-muted);
    font-size: 0.72rem;
    padding: 0.55rem 1rem 0.7rem;
  }

  .sheet-note-names p {
    margin: 0.15rem 0;
    overflow-wrap: anywhere;
  }

  .sheet-note-names strong {
    color: var(--ink);
    display: inline-block;
    font-size: 0.62rem;
    letter-spacing: 0.05em;
    min-width: 4.2rem;
    text-transform: uppercase;
  }

  @media (max-width: 480px) {
    .layer-heading small {
      display: none;
    }

    .alignment-note {
      font-size: 0.62rem;
    }
  }
</style>
