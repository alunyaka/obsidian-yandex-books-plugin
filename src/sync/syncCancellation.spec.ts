import { SyncCancellation } from './syncCancellation';

jest.mock('~/eventEmitter', () => {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    ee: {
      emit: jest.fn((event: string, ...args: unknown[]) => {
        listeners[event]?.forEach((fn) => fn(...args));
      }),
      on: jest.fn((event: string, fn: (...args: unknown[]) => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(fn);
      }),
      removeAllListeners: jest.fn(),
    },
  };
});

describe('SyncCancellation', () => {
  let cancellation: SyncCancellation;

  beforeEach(() => {
    cancellation = new SyncCancellation();
    const { ee } = jest.requireMock('~/eventEmitter');
    ee.emit.mockClear();
  });

  it('starts in inactive state', () => {
    expect(cancellation.isCancelled).toBe(false);
    expect(cancellation.isActive).toBe(false);
  });

  it('becomes active after start()', () => {
    cancellation.start('amazon');
    expect(cancellation.isActive).toBe(true);
    expect(cancellation.isCancelled).toBe(false);
  });

  it('sets cancelled flag on cancel()', () => {
    cancellation.start('amazon');
    cancellation.cancel();
    expect(cancellation.isCancelled).toBe(true);
  });

  it('cancel() is a no-op when not active', () => {
    cancellation.cancel();
    expect(cancellation.isCancelled).toBe(false);
  });

  it('emits syncCancelRequested on cancel()', () => {
    const { ee } = jest.requireMock('~/eventEmitter');
    cancellation.start('amazon');
    cancellation.cancel();
    expect(ee.emit).toHaveBeenCalledWith('syncCancelRequested');
  });

  it('emits syncCancelled with summary on complete() after cancel', () => {
    const { ee } = jest.requireMock('~/eventEmitter');
    cancellation.start('amazon');
    cancellation.setTotalCount(5);
    cancellation.incrementSynced();
    cancellation.incrementSynced();
    cancellation.cancel();
    cancellation.complete();

    expect(ee.emit).toHaveBeenCalledWith('syncCancelled', {
      syncedCount: 2,
      totalCount: 5,
    });
  });

  it('does not emit syncCancelled on complete() without cancel', () => {
    const { ee } = jest.requireMock('~/eventEmitter');
    cancellation.start('amazon');
    cancellation.setTotalCount(3);
    cancellation.incrementSynced();
    cancellation.complete();

    expect(ee.emit).not.toHaveBeenCalledWith('syncCancelled', expect.anything());
  });

  it('resets state after complete()', () => {
    cancellation.start('amazon');
    cancellation.cancel();
    cancellation.complete();

    expect(cancellation.isActive).toBe(false);
    expect(cancellation.isCancelled).toBe(false);
  });

  it('resets state after reset()', () => {
    cancellation.start('amazon');
    cancellation.setTotalCount(10);
    cancellation.incrementSynced();
    cancellation.reset();

    expect(cancellation.isActive).toBe(false);
    expect(cancellation.isCancelled).toBe(false);
  });

  it('can be reused after reset', () => {
    cancellation.start('amazon');
    cancellation.cancel();
    cancellation.reset();

    cancellation.start('my-clippings');
    expect(cancellation.isActive).toBe(true);
    expect(cancellation.isCancelled).toBe(false);
  });

  it('cancel flag stops iteration pattern', () => {
    cancellation.start('amazon');
    cancellation.setTotalCount(5);

    const processed: number[] = [];
    for (let i = 0; i < 5; i++) {
      if (cancellation.isCancelled) {
        break;
      }
      processed.push(i);
      cancellation.incrementSynced();
      if (i === 2) {
        cancellation.cancel();
      }
    }

    expect(processed).toEqual([0, 1, 2]);
  });
});
