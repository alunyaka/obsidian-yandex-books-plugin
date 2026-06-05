import { addIcon, Notice, Plugin } from 'obsidian';
import { get } from 'svelte/store';

import yandexBooksIcon from '~/assets/yandexBooksIcon.svg';
import { ConfirmDeleteModal } from '~/components/confirmDeleteModal';
import SyncModal from '~/components/syncModal';
import { store as syncModalStore } from '~/components/syncModal/store';
import { ee } from '~/eventEmitter';
import FileManager from '~/fileManager';
import { registerNotifications } from '~/notifications';
import { SettingsTab } from '~/settings';
import { initializeStores, settingsStore } from '~/store';
import { syncCancellation } from '~/sync';

addIcon('yandex-books', yandexBooksIcon);

const SYNC_STATUS_MESSAGES: Record<string, string> = {
  'sync:fetching-books': 'Yandex Books: Loading library…',
  'sync:syncing': 'Yandex Books: Syncing…',
  'sync:cancelling': 'Yandex Books: Cancelling…',
};

export default class YandexBooksPlugin extends Plugin {
  private fileManager!: FileManager;
  private ribbonIconEl!: HTMLElement;
  private statusBarEl!: HTMLElement;
  private storeUnsubscribe: (() => void) | undefined;

  public async onload(): Promise<void> {
    console.log('Yandex Books Highlights plugin: loading plugin', new Date().toLocaleString());

    this.fileManager = new FileManager(this.app.vault, this.app.metadataCache);

    await initializeStores(this, this.fileManager);

    this.ribbonIconEl = this.addRibbonIcon('yandex-books', 'Sync your Yandex Books highlights', () => {
      this.showSyncModal();
    });

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass('mod-clickable');
    this.statusBarEl.onClickEvent(() => {
      this.showSyncModal();
    });

    this.storeUnsubscribe = syncModalStore.subscribe((state) => {
      const isSyncing = state.status.startsWith('sync:');
      const statusMessage = SYNC_STATUS_MESSAGES[state.status];

      if (isSyncing && state.status === 'sync:syncing' && state.currentJob) {
        const progress = `${state.currentJob.index + 1}/${state.totalBooks ?? '?'}`;
        this.statusBarEl.setText(`Yandex Books: Syncing ${progress}`);
      } else if (statusMessage) {
        this.statusBarEl.setText(statusMessage);
      } else {
        this.statusBarEl.setText('');
      }

      this.ribbonIconEl.toggleClass('yandex-books-ribbon-syncing', isSyncing);
    });

    this.addCommand({
      id: 'yandex-books-sync',
      name: 'Sync highlights',
      callback: () => {
        this.showSyncModal();
      },
    });

    this.addCommand({
      id: 'yandex-books-migrate-properties',
      name: 'Migrate properties to new format',
      callback: async () => {
        await this.migrateProperties();
      },
    });

    this.addSettingTab(new SettingsTab(this.app, this, this.fileManager));

    registerNotifications();
    this.registerEvents();
  }

  private registerEvents(): void {
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        const syncedBookFile = this.fileManager.mapToSyncedBookFile(file);
        if (syncedBookFile == null) {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle('Yandex Books: Ignore this book')
            .setIcon('eye-off')
            .onClick(() => {
              const title = syncedBookFile.frontmatter.title;
              const current = get(settingsStore).ignoredBooks ?? [];
              settingsStore.actions.setIgnoredBooks([...current, title]);
              console.log('Yandex Books: Ignored book:', title);
              new Notice('Book ignored: will be skipped on future syncs');
            });
        });

        menu.addItem((item) => {
          item
            .setTitle('Yandex Books: Ignore and delete this book')
            .setIcon('trash')
            .onClick(async () => {
              const title = syncedBookFile.frontmatter.title;
              const modal = new ConfirmDeleteModal(this.app, title);
              const confirmed = await modal.confirm();

              if (!confirmed) {
                return;
              }

              // Add to ignore list BEFORE trash (failsafe)
              const current = get(settingsStore).ignoredBooks ?? [];
              settingsStore.actions.setIgnoredBooks([...current, title]);

              await this.app.vault.trash(syncedBookFile.file, false);
              console.log('Yandex Books: Ignored and deleted book:', title, syncedBookFile.file.path);
              new Notice('Book deleted and added to ignore list');
            });
        });
      })
    );

    this.app.workspace.onLayoutReady(() => {
      ee.emit('obsidianReady');
    });
  }

  private showSyncModal(): void {
    new SyncModal(this.app, this.fileManager).show();
  }

  private async migrateProperties(): Promise<void> {
    new Notice('Starting property migration...', 2000);

    try {
      const result = await this.fileManager.migrateToFlatProperties();

      if (result.migrated > 0) {
        new Notice(
          `Migration complete: ${result.migrated} file(s) migrated${
            result.failed > 0 ? `, ${result.failed} failed` : ''
          }`,
          5000
        );

        if (result.errors.length > 0) {
          console.warn('Migration errors:', result.errors);
        }
      } else if (result.failed > 0) {
        new Notice(
          `Migration failed for ${result.failed} file(s). Check console for details.`,
          5000
        );
        console.error('Migration errors:', result.errors);
      } else {
        new Notice('No files need migration. All files are already in the new format.', 3000);
      }
    } catch (error) {
      new Notice(`Migration error: ${String(error)}`, 5000);
      console.error('Migration error:', error);
    }
  }

  public onunload(): void {
    this.storeUnsubscribe?.();
    syncCancellation.reset();
    this.ribbonIconEl.removeClass('yandex-books-ribbon-syncing');
    this.statusBarEl.setText('');
    ee.removeAllListeners();
    console.log('Yandex Books Highlights plugin: unloading plugin', new Date().toLocaleString());
  }
}
