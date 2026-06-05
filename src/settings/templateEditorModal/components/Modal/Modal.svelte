<!-- svelte-ignore a11y-click-events-have-key-events -->
<script lang="ts">
  import Form from './Form.svelte';
  import Preview from './Preview.svelte';

  import type { TemplateEditorModalStore } from '../../store';
  import type { TemplateTab } from '../../types';

  export let store: TemplateEditorModalStore;
  export let onSave: () => void;
  export let onClose: () => void;
  export let showTips: (template: TemplateTab) => void;

  const { activeTab, isDirty, hasErrors } = store;
</script>

<div class="vertical-tabs-container tabs-container">
  <div class="vertical-tab-header tabs-container--left">
    <div class="vertical-tab-header-group">
      <div class="vertical-tab-header-group-title">Templates</div>
      <div class="vertical-tab-header-group-items">
        <div
          class:is-active={$activeTab == 'file-name'}
          on:click={() => activeTab.set('file-name')}
          class="vertical-tab-nav-item"
        >
          File name
        </div>
        <div
          class:is-active={$activeTab == 'file'}
          on:click={() => activeTab.set('file')}
          class="vertical-tab-nav-item"
        >
          File content
        </div>
        <div
          class:is-active={$activeTab == 'highlight'}
          on:click={() => activeTab.set('highlight')}
          class="vertical-tab-nav-item"
        >
          Highlight
        </div>
      </div>
    </div>
  </div>
  <div class="vertical-tab-content-container tabs-container--right">
    <div class="vertical-tab-content row-content">
      <div class="form">
        <Form editorStore={store} {showTips} />
      </div>
      <div class="preview">
        <Preview editorStore={store} />
      </div>
    </div>
    <div class="row-buttons">
      {#if $hasErrors}
        <span class="error">Template has a syntax error and cannot be compiled</span>
      {/if}
      <button
        on:click={onSave}
        class="mod-cta"
        class:error={$hasErrors}
        disabled={!$isDirty || $hasErrors}>Save</button
      >
      <button on:click={onClose}>Cancel</button>
    </div>
  </div>
</div>

<style>
  .tabs-container {
    height: 100%;
    flex-grow: inherit;
    overflow: hidden;
  }

  .tabs-container--left {
    max-width: 180px !important;
  }

  .tabs-container--right {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .row-content {
    flex-grow: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: row;
    gap: 14px;
    overflow: hidden;
  }

  .row-buttons {
    padding: 10px;
    display: flex;
    justify-content: right;
    align-items: center;
    gap: 10px;
    border-top: 1px solid var(--divider-color);
  }

  .row-buttons button[disabled] {
    opacity: 0.5;
  }

  .form {
    flex: 1 1 auto;
    min-width: 0;
    overflow: auto;
  }

  .preview {
    flex: 0 0 min(360px, 38%);
    min-width: 280px;
    padding: 10px;
    overflow: auto;
  }

  .mod-cta.error {
    background-color: var(--color-red);
  }

  span.error {
    color: var(--color-red);
    font-size: 0.8em;
  }
</style>
