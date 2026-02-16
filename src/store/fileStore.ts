import _ from 'lodash';
import { readable } from 'svelte/store';

import { ee } from '~/eventEmitter';
import type FileManager from '~/fileManager';

type FileStoreState = {
  fileCount: number;
  highlightCount: number;
};

const INITIAL_STATE: FileStoreState = {
  fileCount: 0,
  highlightCount: 0,
};

const createFileStore = () => {
  let _fileManager: FileManager;

  const initialize = (fileManager: FileManager): void => {
    _fileManager = fileManager;
  };

  const store = readable(INITIAL_STATE, (set) => {
    const updateFileCount = () => {
      try {
        // Only update if fileManager is initialized
        if (!_fileManager) {
          return;
        }
        
        const files = _fileManager.getKindleFiles();
        set({
          fileCount: files.length,
          highlightCount: _.sumBy(files, (file) => file.frontmatter?.highlightsCount || 0),
        });
      } catch (error) {
        console.error('Error updating file count:', error);
        // Set to initial state on error to prevent blocking
        set(INITIAL_STATE);
      }
    };

    // Don't update immediately - wait for Obsidian to be ready
    // This prevents blocking during plugin initialization
    ee.on('obsidianReady', () => {
      // Add a longer delay to ensure everything is fully initialized
      // and metadata cache is fully populated
      window.setTimeout(() => {
        try {
          updateFileCount();
        } catch (error) {
          console.warn('Error in delayed file count update:', error);
        }
      }, 2000);
    });

    // Delay fetching of latest count to give Obsidian time to cache newly created file
    ee.on('syncBookSuccess', () => {
      window.setTimeout(() => {
        try {
          updateFileCount();
        } catch (error) {
          console.warn('Error updating file count after sync:', error);
        }
      }, 500);
    });
  });

  return {
    subscribe: store.subscribe,
    initialize,
  };
};

export const fileStore = createFileStore();
