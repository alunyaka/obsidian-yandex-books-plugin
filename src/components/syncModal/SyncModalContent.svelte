<script lang="ts">
  import IdleView from './views/IdleView.svelte';
  import SyncingView from './views/SyncingView.svelte';
  import { store } from './store';

  export let onDone: () => void;
  export let onSync: () => void;
</script>

{#if $store.status === 'idle'}
  <IdleView {onSync} />
{:else if $store.status.startsWith('sync:')}
  <SyncingView {onDone} />
{/if}
