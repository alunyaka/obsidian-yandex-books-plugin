import { addIcon, Notice, Plugin } from 'obsidian';
import { get } from 'svelte/store';

import kindleIcon from '~/assets/kindleIcon.svg';
import SyncModal from '~/components/syncModal';
import { ee } from '~/eventEmitter';
import FileManager from '~/fileManager';
import { registerNotifications } from '~/notifications';
import { SettingsTab } from '~/settings';
import { initializeStores, settingsStore } from '~/store';
import { SyncAmazon, SyncClippings, SyncManager } from '~/sync';

addIcon('kindle', kindleIcon);

export default class KindlePlugin extends Plugin {
  private fileManager!: FileManager;
  private syncAmazon!: SyncAmazon;
  private syncClippings!: SyncClippings;

  public async onload(): Promise<void> {
    console.log('Kindle Highlights plugin: loading plugin', new Date().toLocaleString());

    this.fileManager = new FileManager(this.app.vault, this.app.metadataCache);
    const syncManager = new SyncManager(this.fileManager);

    await initializeStores(this, this.fileManager);

    this.syncAmazon = new SyncAmazon(syncManager);
    this.syncClippings = new SyncClippings(syncManager);

    this.addRibbonIcon('kindle', 'Sync your Kindle highlights', async () => {
      await this.showSyncModal();
    });

    this.addCommand({
      id: 'kindle-sync',
      name: 'Sync highlights',
      callback: async () => {
        await this.showSyncModal();
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

    // Check for sync on boot asynchronously to prevent blocking
    // Use setTimeout to defer this check until after initialization completes
    setTimeout(() => {
      try {
        if (get(settingsStore).syncOnBoot) {
          // Don't await - let it run in background
          this.startAmazonSync().catch((error) => {
            console.error('Error during sync on boot:', error);
          });
        }
      } catch (error) {
        // Silently fail if settings store isn't ready yet
        console.warn('Settings store not ready for sync on boot check:', error);
      }
    }, 100);
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
            .setTitle('Resync Kindle highlights in file')
            .setIcon('kindle')
            .setDisabled(kindleFile.book.asin == null)
            .onClick(async () => {
              await this.syncAmazon.resync(kindleFile);
            });
        });
      })
    );

    this.app.workspace.onLayoutReady(() => {
      ee.emit('obsidianReady');
    });
  }

  private async showSyncModal(): Promise<void> {
    await new SyncModal(this.app, {
      onOnlineSync: () => this.startAmazonSync(),
      onMyClippingsSync: () => this.syncClippings.startSync(),
    }).show();
  }

  private async startAmazonSync(): Promise<void> {
    await this.syncAmazon.startSync();
  }

  private async migrateProperties(): Promise<void> {
    new Notice('Starting property migration...', 2000);
    
    try {
      const result = await this.fileManager.migrateToFlatProperties();
      
      if (result.migrated > 0) {
        new Notice(
          `Migration complete: ${result.migrated} file(s) migrated${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
          5000
        );
        
        if (result.errors.length > 0) {
          console.warn('Migration errors:', result.errors);
        }
      } else if (result.failed > 0) {
        new Notice(`Migration failed for ${result.failed} file(s). Check console for details.`, 5000);
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
    ee.removeAllListeners();
    console.log('Kindle Highlights plugin: unloading plugin', new Date().toLocaleString());
  }
}
