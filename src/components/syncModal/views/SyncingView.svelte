<script lang="ts">
  import { Jumper } from 'svelte-loading-spinners';

  import { shortenTitle } from '~/utils';
  import { currentAmazonRegion } from '~/amazonRegion';
  import { syncCancellation } from '~/sync/syncCancellation';
  import { store } from '../store';

  let progressMessage: string;

  $: if ($store.status === 'sync:login') {
    const region = currentAmazonRegion();
    progressMessage = `Logging into ${region.hostname}`;
  } else if ($store.status === 'sync:cancelling') {
    progressMessage = 'Cancelling sync…';
  } else if ($store.status === 'sync:cancelled') {
    const synced = $store.syncedCount ?? 0;
    const total = $store.totalBooks ?? 0;
    progressMessage = `Sync cancelled — ${synced} of ${total} books synced`;
  } else if ($store?.syncMode === 'amazon') {
    progressMessage = 'Looking for new Kindle highlights to sync...';
  } else {
    progressMessage = 'Parsing your My Clippings files for highlights and notes...';
  }

  $: total = $store.jobs?.length ?? $store.totalBooks;
  $: isCancelling = $store.isCancelling;

  function handleCancel() {
    syncCancellation.cancel();
  }

  export let onDone: () => void;
</script>

{#if $store.status === 'sync:cancelled'}
  <div class="kp-syncmodal--sync-content">
    <div class="kp-syncmodal--cancelled-icon">✓</div>
    <div class="kp-syncmodal--progress">
      <span class="kp-syncmodal--progress-message">{progressMessage}</span>
    </div>
  </div>
  <div class="setting-item-control">
    <button class="mod-cta" on:click={onDone}>OK</button>
  </div>
{:else if $store.erroredJobs.length > 0 && !$store.currentJob}
  <div class="kp-syncmodal--error">
    {`${$store.erroredJobs.length} books(s) could not be synced because of errors`}
  </div>
  <div class="setting-item-control">
    <button class="mod-cta" on:click={onDone}>OK</button>
  </div>
{:else}
  <div class="kp-syncmodal--sync-content">
    <Jumper color="#7f6df2" size="90" duration="1.6s" />

    <div class="kp-syncmodal--progress">
      {#if $store.currentJob}
        <span class="kp-syncmodal--progress-current">
          {$store.currentJob.index + 1}
        </span>
        <span class="kp-syncmodal--progress-total">/ {total}</span>
        <div class="kp-syncmodal--download">
          Syncing
          <span class="kp-syncmodal--book-name">
            {shortenTitle($store.currentJob.book.title)}
          </span>
        </div>
      {:else}
        <span class="kp-syncmodal--progress-message">{progressMessage}</span>
      {/if}
    </div>
  </div>

  <div class="setting-item-control">
    {#if isCancelling}
      <button class="mod-muted" disabled>Cancelling…</button>
    {:else}
      <button class="mod-warning" on:click={handleCancel}>Cancel sync</button>
    {/if}
  </div>
{/if}

<style>
  .kp-syncmodal--download {
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 350px;
    margin: 10px 100px 0;
  }

  .kp-syncmodal--book-name {
    color: var(--text-normal);
    font-weight: bold;
  }

  .kp-syncmodal--progress {
    margin: 30px 0 15px;
    text-align: center;
  }

  .kp-syncmodal--progress-message {
    font-size: 1.2em;
  }

  .kp-syncmodal--progress-current {
    font-size: 2.4em;
  }

  .kp-syncmodal--progress-total {
    color: var(--text-muted);
    font-size: 1.6em;
  }

  .kp-syncmodal--error {
    font-size: 0.9em;
    color: var(--text-error);
    margin: 40px 0;
    max-width: 500px;
  }

  .kp-syncmodal--sync-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 40px 0;
  }
</style>
