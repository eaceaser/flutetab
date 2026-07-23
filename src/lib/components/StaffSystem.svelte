<script lang="ts">
  import { onMount } from 'svelte';
  import type { ScaleNote } from '../music/types';

  let {
    notes,
    mode,
    activeIndex,
    width,
    columnPositions,
    onPositions
  }: {
    notes: ScaleNote[];
    mode: 'nakai' | 'concert';
    activeIndex: number | null;
    width: number;
    columnPositions?: number[];
    onPositions?: (positions: number[]) => void;
  } = $props();

  let container: HTMLDivElement;
  let renderedFor = '';
  let renderVersion = 0;
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
    if (!container || notes.length === 0 || width < 180) return;
    const target = container;
    const signature = JSON.stringify({
      notes: notes.map((note) => (mode === 'nakai' ? note.nakaiName : note.concertName)),
      activeIndex,
      mode,
      width,
      columnPositions
    });
    if (signature === renderedFor) return;
    renderedFor = signature;
    const version = ++renderVersion;
    error = false;

    try {
      const { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } = await import(
        'vexflow/bravura'
      );
      if (!target.isConnected || version !== renderVersion) return;
      target.innerHTML = '';
      const renderer = new Renderer(target, Renderer.Backends.SVG);
      renderer.resize(width, 126);
      const context = renderer.getContext();
      const stave = new Stave(8, 20, width - 16);
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
      new Formatter().joinVoices([voice]).formatToStave([voice], stave);
      voice.draw(context, stave);
      await document.fonts.ready;
      if (!target.isConnected || version !== renderVersion) return;
      const noteGroups = [...target.querySelectorAll<SVGGElement>('.vf-stavenote')];
      const renderedCenters = noteGroups.map((noteGroup, index) => {
          const notehead = noteGroup.querySelector<SVGGElement>('.vf-notehead');
          if (!notehead) return vexNotes[index].getAbsoluteX() + 6;
          const glyph = notehead.querySelector<SVGGraphicsElement>('text, path');
          if (!glyph) return vexNotes[index].getAbsoluteX() + 6;
          const bounds = glyph.getBBox();
          return bounds.x + bounds.width / 2;
        }
      );
      if (columnPositions?.length === renderedCenters.length) {
        noteGroups.forEach((noteGroup, index) => {
          noteGroup.setAttribute(
            'transform',
            `translate(${columnPositions[index] - renderedCenters[index]} 0)`
          );
        });
        onPositions?.(columnPositions);
      } else {
        onPositions?.(renderedCenters);
      }
      target.querySelector('svg')?.setAttribute('aria-hidden', 'true');
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
    width;
    void renderScore();
  });
</script>

<div class="score-line" bind:this={container}></div>
{#if error}
  <p>Staff rendering is unavailable; use the note names below.</p>
{/if}

<style>
  .score-line {
    height: 126px;
    overflow: hidden;
    width: 100%;
  }

  p {
    color: var(--danger);
    font-size: 0.75rem;
    margin: 0;
    padding: 0 1rem 0.5rem;
  }
</style>
