import EventEmitter from 'events';
import type TypedEmitter from 'typed-emitter';

import type { Book, Highlight, SyncedBookFile, SyncMode } from '~/models';

interface MessageEvents {
  obsidianReady: () => void;
  fetchingBooks: () => void;
  fetchingBooksSuccess: (booksToSync: Book[], remoteBooks: Book[]) => void;
  syncSessionStart: (mode: SyncMode) => void;
  syncSessionSuccess: () => void;
  syncSessionFailure: (message: string) => void;
  syncBook: (book: Book, index: number) => void;
  syncBookSuccess: (book: Book, highlights: Highlight[]) => void;
  syncBookFailure: (book: Book, message: string) => void;
  resyncBook: (file: SyncedBookFile) => void;
  resyncComplete: (file: SyncedBookFile, diffCount: number) => void;
  resyncFailure: (file: SyncedBookFile, message: string) => void;
  syncCancelRequested: () => void;
  syncCancelled: (summary: { syncedCount: number; totalCount: number }) => void;
  syncLog: (message: string) => void;
}

export const ee = new EventEmitter() as TypedEmitter<MessageEvents>;
