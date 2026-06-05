import { ee } from '~/eventEmitter';
import type { SyncMode } from '~/models';

export class SyncCancellation {
  private _cancelled = false;
  private _syncedCount = 0;
  private _totalCount = 0;
  private _mode: SyncMode = 'yandex-books';
  private _active = false;
  private abortController: AbortController | undefined;

  get isCancelled(): boolean {
    return this._cancelled;
  }

  get isActive(): boolean {
    return this._active;
  }

  get signal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }

  start(mode: SyncMode): void {
    this._cancelled = false;
    this._syncedCount = 0;
    this._totalCount = 0;
    this._mode = mode;
    this._active = true;
    this.abortController = new AbortController();
  }

  setTotalCount(count: number): void {
    this._totalCount = count;
  }

  incrementSynced(): void {
    this._syncedCount++;
  }

  cancel(): void {
    if (!this._active) {
      return;
    }
    this._cancelled = true;
    this.abortController?.abort();
    ee.emit('syncCancelRequested');
  }

  complete(): void {
    if (this._cancelled) {
      ee.emit('syncCancelled', {
        syncedCount: this._syncedCount,
        totalCount: this._totalCount,
      });
    }
    this._active = false;
    this._cancelled = false;
    this.abortController = undefined;
  }

  reset(): void {
    this._cancelled = false;
    this._syncedCount = 0;
    this._totalCount = 0;
    this._active = false;
    this.abortController?.abort();
    this.abortController = undefined;
  }
}

export const syncCancellation = new SyncCancellation();
