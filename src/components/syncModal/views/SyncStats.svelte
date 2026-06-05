<script lang="ts">
  import { settingsStore, fileStore } from '~/store';

  const { moment } = window;

  function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  $: hasSyncedBefore = $settingsStore.lastSyncDate != null;
  $: hasAnyData = $fileStore.fileCount > 0 || $fileStore.highlightCount > 0;
</script>

<div class="kp-stats--wrapper">
  {#if !hasSyncedBefore && !hasAnyData}
    <div class="kp-stats--empty">
      <div class="kp-stats--empty-subtitle">
        Choose a sync method below to import your Yandex Books highlights.
      </div>
    </div>
  {:else}
    <div class="kp-stats--item-wrapper">
      <div class="kp-stats--item">
        <div>Books</div>
        <div class="kp-stats--value">{numberWithCommas($fileStore.fileCount)}</div>
      </div>
      <div class="kp-stats--item">
        <div>Highlights</div>
        <div class="kp-stats--value">{numberWithCommas($fileStore.highlightCount)}</div>
      </div>
    </div>
    <div class="kp-stats--sync-date">
      {#if $settingsStore.lastSyncDate}
        Last sync {moment($settingsStore.lastSyncDate).fromNow()}
      {:else}
        Synced previously
      {/if}
    </div>
  {/if}
</div>

<style>
  .kp-stats--wrapper {
    margin: 40px 0;
  }

  .kp-stats--item-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .kp-stats--item {
    margin-right: 40px;
  }

  .kp-stats--item:last-child {
    margin-right: 0;
  }

  .kp-stats--value {
    color: var(--text-accent);
    font-size: 3em;
    line-height: normal;
  }

  .kp-stats--sync-date {
    color: var(--text-muted);
    font-size: 0.8em;
    text-align: center;
    margin-top: 5px;
  }

  .kp-stats--empty {
    text-align: center;
    padding: 8px 4px;
  }

  .kp-stats--empty-subtitle {
    color: var(--text-muted);
    font-size: 0.95em;
    max-width: 360px;
  }
</style>
