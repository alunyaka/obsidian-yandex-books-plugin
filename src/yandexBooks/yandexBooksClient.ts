import { remote } from 'electron';

import { readYandexAuthInfo, YANDEX_BOOKS_SESSION_PARTITION } from '~/auth';
import type { BookHighlight } from '~/models';

import { mapQuotesToBookHighlights } from './mappers';
import type { YandexProfile, YandexQuote, YandexQuotesResponse } from './types';

const API_ORIGIN = 'https://api.bookmate.yandex.net';
const REST_BASE_URL = `${API_ORIGIN}/api/v5`;
const PAGE_LIMIT = 100;

export type YandexBooksDebugEvent = {
  message: string;
  details?: Record<string, number | string | undefined>;
};

type DebugLogger = (event: YandexBooksDebugEvent) => void;

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

  constructor(private oauthToken: string, private debug?: DebugLogger) {}

  public async getProfile(): Promise<YandexProfile> {
    this.log('Loading profile');
    return this.getJson<YandexProfile>('/profile');
  }

  public async getBookHighlights(): Promise<BookHighlight[]> {
    const authInfo = await readYandexAuthInfo();
    const profile = await this.getProfile();
    const userId = profile.user?.uuid ?? profile.user?.id ?? authInfo.uid;

    if (userId == null || userId === '') {
      throw new YandexBooksApiError('Could not determine Yandex Books user id');
    }

    this.log('Resolved profile', {
      userIdSource: profile.user?.uuid != null ? 'profile.uuid' : 'profile.id/cookie',
    });

    const quotes = await this.getAllQuotes(String(userId));
    this.log('Mapping quotes to books', { quotes: quotes.length });
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
      this.log('Loading quotes page', { limit: PAGE_LIMIT, offset });
      const response = await this.getJson<YandexQuotesResponse>(
        `/users/${encodeURIComponent(userId)}/quotes?limit=${PAGE_LIMIT}&offset=${offset}`
      );
      const page = response.quotes ?? [];
      quotes.push(...page);
      this.log('Loaded quotes page', { count: page.length, total: quotes.length });

      if (page.length < PAGE_LIMIT) {
        return quotes;
      }

      offset += PAGE_LIMIT;
    }
  }

  private async getJson<T>(path: string): Promise<T> {
    const url = path.startsWith('http') ? path : `${REST_BASE_URL}${path}`;
    const label = this.requestLabel(url);
    const result = await this.fetchFromYandexSession(url);

    this.log('API response', {
      path: label,
      status: result.status,
      bytes: result.text.length,
    });

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
          Authorization: ${JSON.stringify(`OAuth ${this.oauthToken}`)},
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        text: await response.text()
      }))
    `;

    try {
      return await this.window.webContents.executeJavaScript<FetchResult>(script);
    } catch (error) {
      this.log('API fetch failed before HTTP response', {
        path: this.requestLabel(url),
        error: String(error),
      });
      throw new YandexBooksApiError(
        `Yandex Books API network request failed for ${this.requestLabel(url)}: ${String(error)}`
      );
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.ready != null) {
      return this.ready;
    }

    this.log('Initializing Yandex Books browser session');

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
      this.window.loadURL(API_ORIGIN);
    });

    return this.ready;
  }

  private log(message: string, details?: YandexBooksDebugEvent['details']): void {
    this.debug?.({ message, details });
  }

  private requestLabel(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }
}
