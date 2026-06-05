declare module 'electron' {
  type BrowserWindowOptions = {
    height?: number;
    title?: string;
    webPreferences?: {
      contextIsolation?: boolean;
      nodeIntegration?: boolean;
      partition?: string;
    };
    width?: number;
  };

  type BrowserWindow = {
    close(): void;
    isDestroyed(): boolean;
    loadURL(url: string): void;
    on(event: 'closed', listener: () => void): void;
    webContents: {
      on(
        event: 'did-navigate' | 'did-navigate-in-page',
        listener: (event: unknown, url: string) => void
      ): void;
    };
  };

  type Cookie = {
    name: string;
    value: string;
  };

  type Session = {
    clearStorageData(options?: { storages?: string[]; quotas?: string[] }): Promise<void>;
    cookies: {
      get(filter: { name?: string; url?: string }): Promise<Cookie[]>;
    };
  };

  type MessageBoxResult = {
    response: number;
  };

  type MessageBoxOptions = {
    buttons?: string[];
    message?: string;
    title?: string;
    type?: 'warning';
  };

  export const remote: {
    BrowserWindow: new (options: BrowserWindowOptions) => BrowserWindow;
    dialog: {
      showMessageBox(window: unknown, options: MessageBoxOptions): Promise<MessageBoxResult>;
    };
    getCurrentWindow(): unknown;
    session: {
      fromPartition(partition: string): Session;
    };
  };
}
