<script lang="ts">
  import { fileStore, settingsStore } from '~/store';
  import { store } from '../store';
  import SyncStats from './SyncStats.svelte';


  $: books = $fileStore.books;
  $: visibleCovers = books.slice(0, 36);

  type CoverItem =
    | { kind: 'real'; imageUrl: string; title: string }
    | { kind: 'placeholder'; seed: number };

  const TARGET_PER_ROW = 18;

  $: rows = [[], [], []] as Array<CoverItem[]>;
  $: {
    rows = [[], [], []];
    visibleCovers.forEach((book, index) => {
      rows[index % 3].push({ kind: 'real', imageUrl: book.imageUrl, title: book.title });
    });

    let seed = 0;
    for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
      const missing = Math.max(0, TARGET_PER_ROW - rows[rowIndex].length);
      for (let i = 0; i < missing; i++) {
        rows[rowIndex].push({ kind: 'placeholder', seed: seed++ + rowIndex * 1000 });
      }
    }
  }

  $: shouldAnimate = rows.some((r) => r.length >= 12);
  $: animatedRows = shouldAnimate ? rows.map((r) => [...r, ...r]) : rows;
  $: isSyncing = $store.status.startsWith('sync:');
  $: isSyncDisabled = isSyncing;

  $: ignoredCount = $settingsStore.ignoredBooks?.length ?? 0;
  $: highlightsFolder = $settingsStore.highlightsFolder;
</script>

<div class="kp-idle--library">
  <div
    class="kp-idle--cover-rows"
    class:kp-idle--cover-rows-animate={shouldAnimate}
    aria-hidden="true"
  >
    {#each animatedRows as row, rowIndex (rowIndex)}
      {#if row.length > 0}
        <div
          class="kp-idle--cover-row"
          style="--scroll-duration: {rowIndex === 1
            ? '115s'
            : rowIndex === 2
            ? '105s'
            : '95s'}; --scroll-direction: normal"
        >
          <div class="kp-idle--cover-track">
            {#each row as item, i (item.kind === 'real' ? item.imageUrl + i : `ph-${item.seed}-${i}`)}
              <div class="kp-idle--cover-item">
                {#if item.kind === 'real'}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    class="kp-idle--cover-img"
                    loading="lazy"
                  />
                {:else}
                  <div class="kp-idle--cover-placeholder" style="--cover-seed: {item.seed}" />
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <div class="kp-idle--overlay">
    <SyncStats />
    <div class="kp-idle--actions">
      <div class="kp-idle--controls">
        <button class="mod-cta" disabled={isSyncDisabled}>Sync source not configured</button>
      </div>

      <div class="kp-idle--meta">
        {#if ignoredCount > 0}
          <span>Ignored: {ignoredCount} book pattern{ignoredCount === 1 ? '' : 's'}</span>
          <span class="kp-idle--dot">·</span>
        {/if}
        <span class="kp-idle--folder" title={highlightsFolder}>
          Library folder:
          <code class="kp-idle--folder-path">{highlightsFolder}</code>
        </span>
      </div>
    </div>
  </div>
</div>

<style>
  .kp-idle--library {
    position: relative;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    min-height: 360px;
  }

  .kp-idle--cover-rows {
    width: calc(100% + var(--size-4-5, 20px) + var(--size-4-5, 20px));
    margin-left: calc(0px - var(--size-4-5, 20px));
    margin-right: calc(0px - var(--size-4-5, 20px));
    padding: 0;
    opacity: 1;
  }

  .kp-idle--cover-row {
    overflow: hidden;
    padding: 6px 0;
  }

  .kp-idle--cover-track {
    display: flex;
    flex-wrap: nowrap;
    gap: 12px;
    justify-content: center;
    width: max-content;
    padding: 0 var(--size-4-5, 20px);
    will-change: transform;
  }

  .kp-idle--cover-rows-animate .kp-idle--cover-track {
    justify-content: flex-start;
    animation: kp-idle-scroll var(--scroll-duration, 95s) linear infinite;
    animation-direction: var(--scroll-direction, normal);
  }

  .kp-idle--cover-item {
    flex: 0 0 auto;
    width: 78px;
    height: 112px;
    border-radius: 6px;
    overflow: hidden;
  }

  .kp-idle--cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.2;
  }

  .kp-idle--cover-placeholder {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
    background: #ffffff;
    opacity: 0.05;
  }

  .kp-idle--overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 0;
  }

  .kp-idle--actions {
    margin-top: 8px;
  }

  .kp-idle--meta {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    color: var(--text-muted);
    font-size: 0.8em;
  }

  .kp-idle--dot {
    color: var(--text-faint);
  }

  .kp-idle--folder {
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .kp-idle--folder-path {
    display: inline-block;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-monospace);
    font-size: 0.95em;
    padding: 2px 6px;
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-normal);
  }

  .kp-idle--overlay :global(.kp-stats--wrapper) {
    margin: 0;
    padding: 42px 54px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    background: var(--background-primary);
    opacity: 0.95;
  }

  .kp-idle--overlay :global(.kp-stats--value) {
    font-size: 2.4em;
  }

  .kp-idle--controls {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
  }

  .kp-idle--controls :global(select.dropdown) {
    width: 220px;
  }

  @keyframes kp-idle-scroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
</style>
