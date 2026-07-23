<script lang="ts">
  import type { Fingering, FingeringOrientation } from '../music/types';

  let {
    fingering,
    orientation = 'mouth-up',
    size = 'regular'
  }: {
    fingering: Fingering | null;
    orientation?: FingeringOrientation;
    size?: 'small' | 'regular';
  } = $props();

  const holePositions = [34, 53, 72, 91, 110, 129];
</script>

<div
  class:small={size === 'small'}
  class="fingering"
  role="img"
  aria-label={fingering
    ? `${fingering.label}. ${fingering.holes.map((hole) => hole === 'closed' ? 'closed' : hole === 'half' ? 'half covered' : 'open').join(', ')} from mouth to foot`
    : 'No fingering available'}
>
  <svg viewBox="0 0 58 158" aria-hidden="true">
    <g transform={orientation === 'mouth-down' ? 'rotate(180 29 79)' : undefined}>
      <path
        class="flute-body"
        d="M12 151V27Q12 17 21 11L24 5L29 8L34 5L37 11Q46 17 46 27V151Z"
      />
      <path class="flute-highlight" d="M17 145V29Q17 20 24 15" />
      {#if fingering}
        {#each fingering.holes as hole, index}
          <circle class="hole" class:closed={hole === 'closed'} cx="29" cy={holePositions[index]} r="6.6" />
          {#if hole === 'half'}
            <path
              class="half-fill"
              d={`M29 ${holePositions[index] - 6.6} A6.6 6.6 0 0 0 29 ${holePositions[index] + 6.6} Z`}
            />
          {/if}
        {/each}
      {:else}
        <path class="unavailable-mark" d="M21 79h16" />
      {/if}
    </g>
  </svg>
</div>

<style>
  .fingering {
    display: flex;
    justify-content: center;
    min-width: 3.5rem;
  }

  svg {
    filter: drop-shadow(0 4px 5px rgb(44 30 20 / 13%));
    height: 9.8rem;
    overflow: visible;
    width: 3.6rem;
  }

  .flute-body {
    fill: #dba45f;
    stroke: #263c38;
    stroke-linejoin: round;
    stroke-width: 2.4;
  }

  .flute-highlight {
    fill: none;
    opacity: 0.32;
    stroke: #fff2d1;
    stroke-linecap: round;
    stroke-width: 2;
  }

  .hole {
    fill: #fffaf0;
    stroke: #263c38;
    stroke-width: 2.5;
  }

  .hole.closed {
    fill: #263c38;
  }

  .half-fill {
    fill: #263c38;
  }

  .unavailable-mark {
    fill: none;
    stroke: var(--danger);
    stroke-linecap: round;
    stroke-width: 3;
  }

  .small svg {
    height: 6.7rem;
    width: 2.5rem;
  }

  .small .flute-body,
  .small .hole {
    stroke-width: 2;
  }
</style>
