import { remote } from 'electron';
import { Notice } from 'obsidian';

import {
  readYandexAuthInfo,
  YANDEX_BOOKS_HOME_URL,
  YANDEX_BOOKS_SESSION_PARTITION,
  YANDEX_PASSPORT_LOGIN_URL,
  type YandexAuthInfo,
} from './yandexSession';

const CHECK_DELAY_MS = 500;

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

export default class YandexLoginModal {
  private window: BrowserWindow | undefined;
  private resolved = false;

  public open(): Promise<YandexAuthInfo | undefined> {
    return new Promise((resolve) => {
      this.window = new remote.BrowserWindow({
        width: 1050,
        height: 760,
        title: 'Connect Yandex Books',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: YANDEX_BOOKS_SESSION_PARTITION,
        },
      });

      const finish = (authInfo: YandexAuthInfo | undefined) => {
        if (this.resolved) {
          return;
        }

        this.resolved = true;
        resolve(authInfo);

        if (this.window != null && !this.window.isDestroyed()) {
          this.window.close();
        }
      };

      const maybeCompleteLogin = (url: string) => {
        if (!url.startsWith(YANDEX_BOOKS_HOME_URL)) {
          return;
        }

        window.setTimeout(() => {
          readYandexAuthInfo()
            .then((authInfo) => {
              if (authInfo.isLoggedIn) {
                finish(authInfo);
              }
            })
            .catch((error) => {
              console.error('Error checking Yandex Books auth state:', error);
              new Notice('Could not check Yandex Books login state');
            });
        }, CHECK_DELAY_MS);
      };

      this.window.webContents.on('did-navigate', (_event, url) => maybeCompleteLogin(url));
      this.window.webContents.on('did-navigate-in-page', (_event, url) =>
        maybeCompleteLogin(url)
      );
      this.window.on('closed', () => finish(undefined));

      this.window.loadURL(YANDEX_PASSPORT_LOGIN_URL);
    });
  }
}
