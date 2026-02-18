import { get } from 'svelte/store';

import { ee } from '~/eventEmitter';
import { settingsStore } from '~/store';
import type { SyncManager } from '~/sync';
import { syncCancellation } from '~/sync/syncCancellation';

import { openDialog } from './openDialog';
import { parseBooks } from './parseBooks';

export default class SyncKindleClippings {
  constructor(private syncManager: SyncManager) {}

  public async startSync(clippingsFile?: string): Promise<void> {
    let canceled = false;
    if (typeof clippingsFile === 'undefined') {
      [clippingsFile, canceled] = await openDialog();
    }

    if (canceled) {
      return;
    }

    if (syncCancellation.isActive) {
      console.warn('Kindle: Sync already in progress, ignoring request');
      return;
    }

    syncCancellation.start('my-clippings');

    try {
      ee.emit('syncSessionStart', 'my-clippings');

      ee.emit('syncLog', 'Reading My Clippings file…');
      const bookHighlights = parseBooks(clippingsFile);
      ee.emit(
        'syncLog',
        `Parsed ${bookHighlights.length} book${
          bookHighlights.length === 1 ? '' : 's'
        } from My Clippings`
      );
      const ignoredBooks = get(settingsStore).ignoredBooks ?? [];
      const ignoredLower = ignoredBooks
        .map((t) => t.toLowerCase().trim())
        .filter((t) => t !== '');

      syncCancellation.setTotalCount(bookHighlights.length);

      for (const { book, highlights } of bookHighlights) {
        if (syncCancellation.isCancelled) {
          break;
        }

        const titleLower = book.title.toLowerCase().trim();
        if (
          ignoredLower.length > 0 &&
          ignoredLower.some((pattern) => titleLower.includes(pattern))
        ) {
          continue;
        }
        await this.syncManager.syncBook(book, highlights);
        syncCancellation.incrementSynced();
      }

      if (syncCancellation.isCancelled) {
        syncCancellation.complete();
      } else {
        syncCancellation.reset();
        ee.emit('syncSessionSuccess');
      }
    } catch (error) {
      syncCancellation.reset();
      const message = `Error parsing ${clippingsFile}.\n\n${String(error)}`;
      ee.emit('syncSessionFailure', message);
      console.error(message);
    }
  }
}
