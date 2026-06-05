import { Notice } from 'obsidian';

import { ee } from '~/eventEmitter';
import type { SyncedBookFile } from '~/models';
import { shortenTitle } from '~/utils';

export const registerNotifications = (): void => {
  ee.on('resyncBook', (syncedBookFile) => {
    new Notice(`Resyncing "${shortenTitle(syncedBookFile.book.title)}" book highlights`);
  });

  ee.on('resyncComplete', (_syncedBookFile, diffCount) => {
    let message = 'No new highlights to resync';

    if (diffCount === 1) {
      message = '1 new highlight imported';
    } else if (diffCount > 1) {
      message = `${diffCount} highlights imported`;
    }

    new Notice(message);
  });

  ee.on('syncSessionFailure', (message: string) => {
    new Notice(message);
  });

  ee.on('syncCancelled', (summary) => {
    const { syncedCount, totalCount } = summary;

    if (syncedCount === 0) {
      new Notice('Sync cancelled — no books were synced');
    } else {
      new Notice(
        `Sync cancelled — ${syncedCount} of ${totalCount} book${
          totalCount !== 1 ? 's' : ''
        } synced`
      );
    }
  });

  ee.on('resyncFailure', (_file: SyncedBookFile, message: string) => {
    new Notice(message);
  });
};
