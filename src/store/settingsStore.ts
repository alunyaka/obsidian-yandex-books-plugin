import { writable } from 'svelte/store';

import type YandexBooksPlugin from '~/.';
import type { YandexAuthInfo } from '~/auth';
import { ee } from '~/eventEmitter';
import type { SyncMode } from '~/models';

type Settings = {
  highlightsFolder: string;
  lastSyncDate?: Date;
  lastSyncMode: SyncMode;
  hasStartedSync?: boolean;
  fileTemplate?: string;
  highlightTemplate?: string;
  fileNameTemplate?: string;
  yandexAuth: YandexAuthInfo;
  ignoredBooks: string[];
  debugQuoteLimit?: number;
  debugLoggingEnabled: boolean;

  // Deprecated - delete eventually
  noteTemplate?: string;
  history?: string;
};

const DEFAULT_SETTINGS: Settings = {
  highlightsFolder: '/',
  lastSyncMode: 'yandex-books',
  hasStartedSync: false,
  yandexAuth: {
    isLoggedIn: false,
  },
  ignoredBooks: [],
  debugLoggingEnabled: false,
};

const createSettingsStore = () => {
  const store = writable(DEFAULT_SETTINGS);

  let _plugin!: YandexBooksPlugin;

  // Load settings data from disk into store
  const initialize = async (plugin: YandexBooksPlugin): Promise<void> => {
    const data = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData()) as Settings;

    const settings: Settings = {
      ...data,
      lastSyncDate: data.lastSyncDate ? new Date(data.lastSyncDate) : undefined,
    };

    store.set(settings);

    _plugin = plugin;
  };

  ee.on('resyncComplete', () => {
    store.update((state) => {
      state.lastSyncDate = new Date();
      return state;
    });
  });

  ee.on('syncSessionStart', (mode) => {
    store.update((state) => {
      state.lastSyncMode = mode;
      state.hasStartedSync = true;
      return state;
    });
  });

  ee.on('syncSessionSuccess', () => {
    store.update((state) => {
      state.lastSyncDate = new Date();
      return state;
    });
  });

  // Listen to any change to store, and write to disk
  store.subscribe((settings) => {
    if (_plugin) {
      // Transform settings fields for serialization
      const data = {
        ...settings,
        lastSyncDate: settings.lastSyncDate ? settings.lastSyncDate.toJSON() : undefined,
      };

      _plugin
        .saveData(data)
        .catch((err) => console.error(`Error saving settings: ${String(err)}`));
    }
  });

  const setHighlightsFolder = (value: string) => {
    store.update((state) => {
      state.highlightsFolder = value;
      return state;
    });
  };

  const setHighlightTemplate = (value: string) => {
    store.update((state) => {
      state.highlightTemplate = value;
      return state;
    });
  };

  const setFileTemplate = (value: string) => {
    store.update((state) => ({ ...state, fileTemplate: value }));
  };

  const setFileNameTemplate = (value: string) => {
    store.update((state) => ({ ...state, fileNameTemplate: value }));
  };

  const setIgnoredBooks = (value: string[]) => {
    store.update((state) => {
      state.ignoredBooks = value;
      return state;
    });
  };

  const setYandexAuth = (value: YandexAuthInfo) => {
    store.update((state) => {
      state.yandexAuth = value;
      return state;
    });
  };

  const setDebugQuoteLimit = (value: number | undefined) => {
    store.update((state) => {
      state.debugQuoteLimit = value;
      return state;
    });
  };

  const setDebugLoggingEnabled = (value: boolean) => {
    store.update((state) => {
      state.debugLoggingEnabled = value;
      return state;
    });
  };

  return {
    store,
    subscribe: store.subscribe,
    initialize,
    actions: {
      setHighlightsFolder,
      setFileTemplate,
      setFileNameTemplate,
      setHighlightTemplate,
      setYandexAuth,
      setIgnoredBooks,
      setDebugQuoteLimit,
      setDebugLoggingEnabled,
    },
  };
};

export const settingsStore = createSettingsStore();
