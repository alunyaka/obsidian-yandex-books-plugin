declare module 'electron' {
  type BrowserWindowOptions = {
    height?: number;
    show?: boolean;
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
    once(event: 'ready-to-show', listener: () => void): void;
    webContents: {
      executeJavaScript<T = unknown>(code: string): Promise<T>;
      on(
        event: 'did-navigate' | 'did-navigate-in-page',
        listener: (event: unknown, url: string) => void
      ): void;
      once(event: 'did-finish-load' | 'did-fail-load', listener: () => void): void;
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
