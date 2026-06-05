import { get } from 'svelte/store';

import { ee } from '~/eventEmitter';
import type FileManager from '~/fileManager';
import { settingsStore } from '~/store';
import { YandexBooksClient } from '~/yandexBooks';

import { syncCancellation } from './syncCancellation';
import SyncManager from './syncManager';

const errorMessage = (error: unknown): string => {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
};

export const syncYandexBooks = async (fileManager: FileManager): Promise<void> => {
  const mode = 'yandex-books';
  const settings = get(settingsStore);
  const auth = settings.yandexAuth;
  const debugQuoteLimit = settings.debugQuoteLimit;
  const debugLoggingEnabled = settings.debugLoggingEnabled;

  if (!auth.isLoggedIn || auth.oauthToken == null) {
    ee.emit(
      'syncSessionFailure',
      'Connect your Yandex Books account in plugin settings first to save an OAuth token'
    );
    return;
  }

  syncCancellation.start(mode);
  ee.emit('syncSessionStart', mode);

  const syncManager = new SyncManager(fileManager);
  const client = new YandexBooksClient(
    auth.oauthToken,
    debugLoggingEnabled
      ? (event) => {
          const details =
            event.details != null
              ? ` ${Object.entries(event.details)
                  .map(([key, value]) => `${key}=${value ?? 'unknown'}`)
                  .join(' ')}`
              : '';
          const message = `${event.message}${details}`;

          console.debug(`Yandex Books: ${message}`);
          ee.emit('syncLog', message);
        }
      : undefined,
    { debugQuoteLimit, signal: syncCancellation.signal }
  );

  try {
    ee.emit('fetchingBooks');
    ee.emit('syncLog', 'Loading Yandex Books quotes');
    if (debugQuoteLimit != null) {
      ee.emit('syncLog', `Debug quote limit enabled: ${debugQuoteLimit}`);
    }

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
        console.error('Yandex Books: Error syncing book', book, error);
        ee.emit('syncBookFailure', book, errorMessage(error));
      }
    }

    if (!syncCancellation.isCancelled) {
      ee.emit('syncSessionSuccess');
    }
  } catch (error) {
    if (syncCancellation.isCancelled) {
      return;
    }

    console.error('Yandex Books: Sync failed', error);
    ee.emit('syncSessionFailure', errorMessage(error));
  } finally {
    client.destroy();
    syncCancellation.complete();
  }
};
