import { App, Modal } from 'obsidian';
import { get } from 'svelte/store';

import type { SyncMode } from '~/models';

import { store, SyncModalState } from './store';
import SyncModalContent from './SyncModalContent.svelte';

const SyncModalTitle: Record<SyncModalState['status'], string> = {
  idle: 'Your Kindle highlights',
  'sync:login': 'Kindle sync',
  'sync:fetching-books': 'Kindle sync',
  'sync:syncing': 'Kindle sync',
  'sync:cancelling': 'Cancelling sync...',
  'sync:cancelled': 'Sync cancelled',
  'sync:complete': 'Sync complete',
};

type SyncModalProps = {
  onOnlineSync: () => void;
  onMyClippingsSync: () => void;
};

export default class SyncModal extends Modal {
  private modalContent: SyncModalContent;
  private unsubscribe: (() => void) | undefined;

  constructor(app: App, private props: SyncModalProps) {
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
        onClick: (mode: SyncMode) => {
          if (mode === 'amazon') {
            this.props.onOnlineSync();
          } else {
            this.props.onMyClippingsSync();
          }
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
