import { App, Modal } from 'obsidian';
import { get } from 'svelte/store';

import type FileManager from '~/fileManager';
import { syncYandexBooks } from '~/sync';

import { store, SyncModalState } from './store';
import SyncModalContent from './SyncModalContent.svelte';

const SyncModalTitle: Record<SyncModalState['status'], string> = {
  idle: 'Your Yandex Books highlights',
  'sync:fetching-books': 'Yandex Books sync',
  'sync:syncing': 'Yandex Books sync',
  'sync:cancelling': 'Cancelling sync...',
  'sync:cancelled': 'Sync cancelled',
  'sync:complete': 'Sync complete',
};

export default class SyncModal extends Modal {
  private modalContent: SyncModalContent;
  private unsubscribe: (() => void) | undefined;

  constructor(app: App, private fileManager: FileManager) {
    super(app);
  }

  public show(): void {
    const currentState = get(store);

    if (!currentState.status.startsWith('sync:')) {
      store.update((state) => ({ ...state, status: 'idle', activityLog: [] }));
    }

    this.modalContent = new SyncModalContent({
      target: this.contentEl,
      props: {
        onDone: () => {
          store.update((state) => ({ ...state, status: 'idle', activityLog: [] }));
        },
        onSync: () => {
          void syncYandexBooks(this.fileManager);
        },
      },
    });

    this.unsubscribe = store.subscribe((state) => {
      this.titleEl.innerText = SyncModalTitle[state.status];
    });

    this.open();
  }

  onClose(): void {
    super.onClose();
    this.unsubscribe?.();
    this.modalContent.$destroy();
  }
}
