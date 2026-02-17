<script lang="ts">
  import { fileStore } from '~/store';
  import { store } from '../store';
  import SyncStats from './SyncStats.svelte';

  export let onClick: () => void;

  $: books = $fileStore.books;
  $: visibleCovers = books.slice(0, 12);
  $: isSyncing = $store.status.startsWith('sync:');
</script>

{#if visibleCovers.length > 0}
  <div class="kp-idle--cover-grid">
    {#each visibleCovers as book}
      <div class="kp-idle--cover-item">
        <img src={book.imageUrl} alt={book.title} class="kp-idle--cover-img" loading="lazy" />
      </div>
    {/each}
  </div>
{/if}

<SyncStats />
<div class="setting-item-control">
  <button class="mod-cta" disabled={isSyncing} on:click={onClick}>Sync...</button>
</div>

<style>
  .kp-idle--cover-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 auto 20px;
    max-width: 420px;
    opacity: 0.3;
  }

  .kp-idle--cover-item {
    width: 56px;
    height: 80px;
    border-radius: 3px;
    overflow: hidden;
  }

  .kp-idle--cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
