import { remote } from 'electron';

import {
  readYandexAuthInfo,
  YANDEX_BOOKS_HOME_URL,
  YANDEX_BOOKS_SESSION_PARTITION,
} from '~/auth';
import type { BookHighlight } from '~/models';

import { mapQuotesToBookHighlights } from './mappers';
import type { YandexProfile, YandexQuote, YandexQuotesResponse } from './types';

const REST_BASE_URL = 'https://api.bookmate.yandex.net/api/v5';
const PAGE_LIMIT = 100;

type FetchResult = {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
};

type BrowserWindow = InstanceType<typeof remote.BrowserWindow>;

export class YandexBooksApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export default class YandexBooksClient {
  private window: BrowserWindow | undefined;
  private ready: Promise<void> | undefined;

  public async getProfile(): Promise<YandexProfile> {
    return this.getJson<YandexProfile>('/profile');
  }

  public async getBookHighlights(): Promise<BookHighlight[]> {
    const authInfo = await readYandexAuthInfo();
    const profile = await this.getProfile();
    const userId = profile.user?.uuid ?? profile.user?.id ?? authInfo.uid;

    if (userId == null || userId === '') {
      throw new YandexBooksApiError('Could not determine Yandex Books user id');
    }

    const quotes = await this.getAllQuotes(String(userId));
    return mapQuotesToBookHighlights(quotes);
  }

  public destroy(): void {
    if (this.window != null && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  private async getAllQuotes(userId: string): Promise<YandexQuote[]> {
    const quotes: YandexQuote[] = [];
    let offset = 0;

    while (true) {
      const response = await this.getJson<YandexQuotesResponse>(
        `/users/${encodeURIComponent(userId)}/quotes?limit=${PAGE_LIMIT}&offset=${offset}`
      );
      const page = response.quotes ?? [];
      quotes.push(...page);

      if (page.length < PAGE_LIMIT) {
        return quotes;
      }

      offset += PAGE_LIMIT;
    }
  }

  private async getJson<T>(path: string): Promise<T> {
    const url = path.startsWith('http') ? path : `${REST_BASE_URL}${path}`;
    const result = await this.fetchFromYandexSession(url);

    if (!result.ok) {
      throw new YandexBooksApiError(
        `Yandex Books API request failed: ${result.status} ${result.statusText}`,
        result.status
      );
    }

    try {
      return JSON.parse(result.text) as T;
    } catch (error) {
      throw new YandexBooksApiError(`Yandex Books API returned invalid JSON: ${String(error)}`);
    }
  }

  private async fetchFromYandexSession(url: string): Promise<FetchResult> {
    await this.ensureReady();

    const script = `
      fetch(${JSON.stringify(url)}, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        text: await response.text()
      }))
    `;

    return this.window.webContents.executeJavaScript<FetchResult>(script);
  }

  private async ensureReady(): Promise<void> {
    if (this.ready != null) {
      return this.ready;
    }

    this.window = new remote.BrowserWindow({
      width: 960,
      height: 700,
      show: false,
      title: 'Yandex Books API session',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: YANDEX_BOOKS_SESSION_PARTITION,
      },
    });

    this.ready = new Promise((resolve, reject) => {
      this.window.webContents.once('did-finish-load', resolve);
      this.window.webContents.once('did-fail-load', () => {
        reject(new YandexBooksApiError('Could not initialize Yandex Books session window'));
      });
      this.window.loadURL(YANDEX_BOOKS_HOME_URL);
    });

    return this.ready;
  }
}
