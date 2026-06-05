import { get } from 'svelte/store';

import { ee } from '~/eventEmitter';
import type FileManager from '~/fileManager';
import { settingsStore } from '~/store';
import { YandexBooksClient } from '~/yandexBooks';

import { syncCancellation } from './syncCancellation';
import SyncManager from './syncManager';

export const syncYandexBooks = async (fileManager: FileManager): Promise<void> => {
  const mode = 'yandex-books';
  const auth = get(settingsStore).yandexAuth;

  if (!auth.isLoggedIn) {
    ee.emit('syncSessionFailure', 'Connect your Yandex Books account in plugin settings first');
    return;
  }

  const syncManager = new SyncManager(fileManager);
  const client = new YandexBooksClient((event) => {
    const details =
      event.details != null
        ? ` ${Object.entries(event.details)
            .map(([key, value]) => `${key}=${value ?? 'unknown'}`)
            .join(' ')}`
        : '';
    const message = `${event.message}${details}`;

    console.debug(`Yandex Books: ${message}`);
    ee.emit('syncLog', message);
  });

  syncCancellation.start(mode);
  ee.emit('syncSessionStart', mode);

  try {
    ee.emit('fetchingBooks');
    ee.emit('syncLog', 'Loading Yandex Books quotes');

    const bookHighlights = await client.getBookHighlights();
    ee.emit(
      'syncLog',
      `Loaded ${bookHighlights.length} book${bookHighlights.length === 1 ? '' : 's'} with quotes`
    );
    const remoteBooks = bookHighlights.map((entry) => entry.book);
    const booksToSync = syncManager.filterBooksToSync(remoteBooks);
    const highlightsByBookId = new Map(
      bookHighlights.map((entry) => [entry.book.id, entry.highlights])
    );

    ee.emit('fetchingBooksSuccess', booksToSync, remoteBooks);
    syncCancellation.setTotalCount(booksToSync.length);

    for (const [index, book] of booksToSync.entries()) {
      if (syncCancellation.isCancelled) {
        break;
      }

      const highlights = highlightsByBookId.get(book.id) ?? [];
      ee.emit('syncBook', book, index);
      ee.emit('syncLog', `Found ${highlights.length} quote${highlights.length === 1 ? '' : 's'}`);

      try {
        await syncManager.syncBook(book, highlights);
        syncCancellation.incrementSynced();
        ee.emit('syncBookSuccess', book, highlights);
      } catch (error) {
        ee.emit('syncBookFailure', book, String(error));
      }
    }

    if (!syncCancellation.isCancelled) {
      ee.emit('syncSessionSuccess');
    }
  } catch (error) {
    ee.emit('syncSessionFailure', String(error));
  } finally {
    client.destroy();
    syncCancellation.complete();
  }
};
