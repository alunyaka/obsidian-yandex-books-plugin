import { addIcon, Notice, Plugin } from 'obsidian';
import { get } from 'svelte/store';

import kindleIcon from '~/assets/kindleIcon.svg';
import { ConfirmDeleteModal } from '~/components/confirmDeleteModal';
import SyncModal from '~/components/syncModal';
import { store as syncModalStore } from '~/components/syncModal/store';
import { ee } from '~/eventEmitter';
import FileManager from '~/fileManager';
import { registerNotifications } from '~/notifications';
import { SettingsTab } from '~/settings';
import { initializeStores, settingsStore } from '~/store';
import { syncCancellation } from '~/sync';

addIcon('kindle', kindleIcon);

const SYNC_STATUS_MESSAGES: Record<string, string> = {
  'sync:fetching-books': 'Kindle: Loading library…',
  'sync:syncing': 'Kindle: Syncing…',
  'sync:cancelling': 'Kindle: Cancelling…',
};

export default class KindlePlugin extends Plugin {
  private fileManager!: FileManager;
  private ribbonIconEl!: HTMLElement;
  private statusBarEl!: HTMLElement;
  private storeUnsubscribe: (() => void) | undefined;

  public async onload(): Promise<void> {
    console.log('Kindle Highlights plugin: loading plugin', new Date().toLocaleString());

    this.fileManager = new FileManager(this.app.vault, this.app.metadataCache);

    await initializeStores(this, this.fileManager);

    this.ribbonIconEl = this.addRibbonIcon('kindle', 'Sync your Kindle highlights', () => {
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
        this.statusBarEl.setText(`Kindle: Syncing ${progress}`);
      } else if (statusMessage) {
        this.statusBarEl.setText(statusMessage);
      } else {
        this.statusBarEl.setText('');
      }

      this.ribbonIconEl.toggleClass('kindle-ribbon-syncing', isSyncing);
    });

    this.addCommand({
      id: 'kindle-sync',
      name: 'Sync highlights',
      callback: () => {
        this.showSyncModal();
      },
    });

    this.addCommand({
      id: 'kindle-migrate-properties',
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
        const kindleFile = this.fileManager.mapToKindleFile(file);
        if (kindleFile == null) {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle('Kindle: Ignore this book')
            .setIcon('eye-off')
            .onClick(() => {
              const title = kindleFile.frontmatter.title;
              const current = get(settingsStore).ignoredBooks ?? [];
              settingsStore.actions.setIgnoredBooks([...current, title]);
              console.log('Kindle: Ignored book:', title);
              new Notice('Book ignored: will be skipped on future syncs');
            });
        });

        menu.addItem((item) => {
          item
            .setTitle('Kindle: Ignore and delete this book')
            .setIcon('trash')
            .onClick(async () => {
              const title = kindleFile.frontmatter.title;
              const modal = new ConfirmDeleteModal(this.app, title);
              const confirmed = await modal.confirm();

              if (!confirmed) {
                return;
              }

              // Add to ignore list BEFORE trash (failsafe)
              const current = get(settingsStore).ignoredBooks ?? [];
              settingsStore.actions.setIgnoredBooks([...current, title]);

              await this.app.vault.trash(kindleFile.file, false);
              console.log('Kindle: Ignored and deleted book:', title, kindleFile.file.path);
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
    this.ribbonIconEl.removeClass('kindle-ribbon-syncing');
    this.statusBarEl.setText('');
    ee.removeAllListeners();
    console.log('Kindle Highlights plugin: unloading plugin', new Date().toLocaleString());
  }
}
