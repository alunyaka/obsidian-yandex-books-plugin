<script lang="ts">
  import { fileStore, settingsStore } from '~/store';
  import { store } from '../store';
  import SyncStats from './SyncStats.svelte';
  import type { SyncMode } from '~/models';

  export let onSync: (mode: SyncMode) => void;
  let selectedMode: SyncMode | '' = '';

  $: books = $fileStore.books;
  $: visibleCovers = books.slice(0, 36);
  $: shouldAnimate = visibleCovers.length >= 12;
  $: rows = [[], [], []] as (typeof visibleCovers)[];
  $: {
    rows = [[], [], []];
    visibleCovers.forEach((book, index) => {
      rows[index % 3].push(book);
    });
  }
  $: animatedRows = shouldAnimate ? rows.map((r) => [...r, ...r]) : rows;
  $: isSyncing = $store.status.startsWith('sync:');
  $: hasSyncedBefore = $settingsStore.lastSyncDate != null;
  $: lastSyncMode = $settingsStore.lastSyncMode;
  $: if (selectedMode === '' && hasSyncedBefore) {
    selectedMode = lastSyncMode;
  }

  $: isSelectionValid = selectedMode !== '';
  $: isSyncDisabled = isSyncing || !isSelectionValid;

  $: ignoredCount = $settingsStore.ignoredBooks?.length ?? 0;
  $: highlightsFolder = $settingsStore.highlightsFolder;
</script>

<div class="kp-idle--library">
  {#if visibleCovers.length > 0}
    <div class="kp-idle--cover-rows" class:kp-idle--cover-rows-animate={shouldAnimate}>
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
              {#each row as book, i (book.imageUrl + i)}
                <div class="kp-idle--cover-item">
                  <img
                    src={book.imageUrl}
                    alt={book.title}
                    class="kp-idle--cover-img"
                    loading="lazy"
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <div class="kp-idle--overlay">
    <SyncStats />
    <div class="kp-idle--actions">
      <div class="kp-idle--controls">
        <select class="dropdown" bind:value={selectedMode} disabled={isSyncing}>
          <option value="" disabled>Select a sync method…</option>
          <option value="amazon">Amazon Cloud</option>
          <option value="my-clippings">Upload "My Clippings" file</option>
        </select>

        <button
          class="mod-cta"
          disabled={isSyncDisabled}
          on:click={() => {
            if (selectedMode !== '') {
              onSync(selectedMode);
            }
          }}
        >
          Sync
        </button>
      </div>

      <div class="kp-idle--meta">
        {#if ignoredCount > 0}
          <span>Ignored: {ignoredCount} book pattern{ignoredCount === 1 ? '' : 's'}</span>
          <span class="kp-idle--dot">·</span>
        {/if}
        <span class="kp-idle--folder" title={highlightsFolder}
          >Library folder: {highlightsFolder}</span
        >
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
    opacity: 0.2;
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
