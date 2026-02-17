import { App, Modal } from 'obsidian';
import { get } from 'svelte/store';

import type { SyncMode } from '~/models';
import { settingsStore } from '~/store';

import { store, SyncModalState } from './store';
import SyncModalContent from './SyncModalContent.svelte';

const SyncModalTitle: Record<SyncModalState['status'], string> = {
  'upgrade-warning': 'Breaking change notice',
  'first-time': '',
  idle: 'Your Kindle highlights',
  'sync:fetching-books': 'Syncing data...',
  'sync:login': 'Syncing data...',
  'sync:syncing': 'Syncing data...',
  'sync:cancelling': 'Cancelling sync...',
  'sync:cancelled': 'Sync cancelled',
  'choose-sync-method': 'Choose a sync method...',
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

  public async show(): Promise<void> {
    const currentState = get(store);

    // Only set initial state if no sync is currently active
    if (!currentState.status.startsWith('sync:')) {
      // TODO: Remove after proliferation of v1.0.0
      const isLegacy = await settingsStore.isLegacy();
      const initialState: SyncModalState['status'] = isLegacy ? 'upgrade-warning' : 'idle';
      store.update((state) => ({ ...state, status: initialState }));
    }

    this.modalContent = new SyncModalContent({
      target: this.contentEl,
      props: {
        onDone: () => {
          store.update((state) => ({ ...state, status: 'idle' }));
          this.close();
        },
        onClick: (mode: SyncMode) => {
          if (mode === 'amazon') {
            this.props.onOnlineSync();
          } else {
            this.props.onMyClippingsSync();
          }
        },
        onUpgrade: async () => {
          await settingsStore.actions.upgradeStoreState();
          store.update((state) => ({ ...state, status: 'idle' }));
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
