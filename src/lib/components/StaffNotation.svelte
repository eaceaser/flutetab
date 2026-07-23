<script lang="ts">
  import { onMount } from 'svelte';
  import type { ScaleNote } from '../music/types';

  let {
    notes,
    mode,
    activeIndex = null
  }: {
    notes: ScaleNote[];
    mode: 'nakai' | 'concert';
    activeIndex?: number | null;
  } = $props();

  let container: HTMLDivElement;
  let renderedFor = $state('');
  let error = $state(false);

  const pitchForVex = (name: string) => {
    const match = name.match(/^([A-G])([♯♭]?)(-?\d)$/);
    return {
      key: `${(match?.[1] ?? 'C').toLowerCase()}/${match?.[3] ?? '4'}`,
      letter: match?.[1] ?? 'C',
      accidental: match?.[2] ?? ''
    };
  };

  async function renderScore() {
    if (!container || notes.length === 0) return;
    const signature = JSON.stringify({
      notes: notes.map((note) => (mode === 'nakai' ? note.nakaiName : note.concertName)),
      activeIndex,
      mode
    });
    if (signature === renderedFor) return;
    renderedFor = signature;
    error = false;

    try {
      const { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } = await import('vexflow/bravura');
      container.innerHTML = '';
      const scoreWidth = Math.max(350, 118 + notes.length * 62);
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(scoreWidth, 150);
      const context = renderer.getContext();
      const stave = new Stave(12, 26, scoreWidth - 24);
      stave.addClef('treble');
      if (mode === 'nakai') stave.addKeySignature('E');
      stave.setContext(context).draw();

      const vexNotes = notes.map((note) => {
        const sourceName = mode === 'nakai' ? note.nakaiName : note.concertName;
        const pitch = pitchForVex(sourceName);
        const staveNote = new StaveNote({ keys: [pitch.key], duration: 'q' });

        if (mode === 'concert') {
          if (pitch.accidental) {
            staveNote.addModifier(new Accidental(pitch.accidental === '♯' ? '#' : 'b'), 0);
          }
        } else {
          const signatureSharps = new Set(['F', 'C', 'G', 'D']);
          if (signatureSharps.has(pitch.letter) && pitch.accidental !== '♯') {
            staveNote.addModifier(new Accidental('n'), 0);
          } else if (!signatureSharps.has(pitch.letter) && pitch.accidental === '♯') {
            staveNote.addModifier(new Accidental('#'), 0);
          }
        }

        if (note.index === activeIndex) {
          staveNote.setStyle({ fillStyle: '#b55c38', strokeStyle: '#b55c38' });
        }
        return staveNote;
      });

      const voice = new Voice({ numBeats: notes.length, beatValue: 4 });
      voice.addTickables(vexNotes);
      new Formatter().joinVoices([voice]).format([voice], scoreWidth - 130);
      voice.draw(context, stave);
      container.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    } catch (renderError) {
      console.error(renderError);
      error = true;
    }
  }

  onMount(() => {
    void renderScore();
  });

  $effect(() => {
    notes;
    activeIndex;
    mode;
    void renderScore();
  });
</script>

<div class="staff-shell">
  <div class="staff-heading">
    <div>
      <span class="eyebrow">{mode === 'nakai' ? 'Transposing view' : 'Sounding view'}</span>
      <h3>{mode === 'nakai' ? 'Nakai notation' : 'Concert pitch'}</h3>
    </div>
    {#if mode === 'nakai'}<span class="signature">Always 4 sharps</span>{/if}
  </div>
  <div class="score-scroll" role="region" aria-label={`${mode} staff; scroll horizontally if needed`}>
    <div class="score" bind:this={container}></div>
  </div>
  <p class="note-list">
    {mode === 'nakai' ? notes.map((note) => note.nakaiName).join(' · ') : notes.map((note) => note.concertName).join(' · ')}
  </p>
  {#if error}
    <p class="render-error">Staff rendering is unavailable; use the note names shown above.</p>
  {/if}
</div>

<style>
  .staff-shell {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .staff-heading {
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 1rem 1rem 0;
  }

  h3 {
    font-family: var(--font-display);
    font-size: clamp(1.18rem, 3vw, 1.42rem);
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

  .signature {
    background: var(--teal-soft);
    border-radius: 999px;
    color: var(--teal-dark);
    font-size: 0.7rem;
    font-weight: 750;
    padding: 0.34rem 0.58rem;
  }

  .score-scroll {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-color: var(--teal-muted) transparent;
  }

  .score {
    min-height: 150px;
    min-width: max-content;
  }

  .note-list {
    border-top: 1px solid var(--border-soft);
    color: var(--text-muted);
    font-size: 0.75rem;
    margin: 0;
    overflow-wrap: anywhere;
    padding: 0.55rem 1rem 0.75rem;
  }

  .render-error {
    color: var(--danger);
    font-size: 0.78rem;
    margin: 0;
    padding: 0 1rem 0.8rem;
  }
</style>
