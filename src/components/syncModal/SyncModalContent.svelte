<script lang="ts">
  import IdleView from './views/IdleView.svelte';
  import SyncingView from './views/SyncingView.svelte';
  import { store } from './store';
  import type { SyncMode } from '~/models';

  export let onDone: () => void;
  export let onClick: (mode: SyncMode) => void;
</script>

{#if $store.status === 'idle'}
  <IdleView
    onSync={(mode) => {
      onClick(mode);
    }}
  />
{:else if $store.status.startsWith('sync:')}
  <SyncingView {onDone} />
{/if}
