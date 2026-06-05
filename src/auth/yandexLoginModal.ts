import { remote } from 'electron';
import { Notice } from 'obsidian';

import {
  readYandexAuthInfo,
  YANDEX_BOOKS_OAUTH_URL,
  YANDEX_BOOKS_SESSION_PARTITION,
  type YandexAuthInfo,
} from './yandexSession';

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
        const token = this.getAccessToken(url);
        if (token == null) {
          return;
        }

        readYandexAuthInfo()
          .then((authInfo) => {
            finish({
              ...authInfo,
              isLoggedIn: true,
              oauthToken: token,
              oauthTokenCapturedAt: new Date().toISOString(),
            });
          })
          .catch((error) => {
            console.error('Error checking Yandex Books auth state:', error);
            new Notice('Could not check Yandex Books login state');
            finish({
              isLoggedIn: true,
              oauthToken: token,
              oauthTokenCapturedAt: new Date().toISOString(),
              lastCheckedAt: new Date().toISOString(),
            });
          });
      };

      this.window.webContents.on('did-navigate', (_event, url) => maybeCompleteLogin(url));
      this.window.webContents.on('did-navigate-in-page', (_event, url) =>
        maybeCompleteLogin(url)
      );
      this.window.on('closed', () => finish(undefined));

      this.window.loadURL(YANDEX_BOOKS_OAUTH_URL);
    });
  }

  private getAccessToken(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      const params = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      return params.get('access_token') ?? undefined;
    } catch {
      return undefined;
    }
  }
}
