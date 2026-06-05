import { remote } from 'electron';

import { readYandexAuthInfo, YANDEX_BOOKS_SESSION_PARTITION } from '~/auth';
import type { BookHighlight } from '~/models';

import { mapQuotesToBookHighlights } from './mappers';
import type {
  YandexLibraryCard,
  YandexLibraryCardsResponse,
  YandexProfile,
  YandexQuote,
  YandexQuotesResponse,
} from './types';

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
    const userIds = this.getProfileIdentifiers(profile, authInfo.uid);

    if (userIds.length === 0) {
      throw new YandexBooksApiError('Could not determine Yandex Books user id');
    }

    const libraryCards = await this.getAllLibraryCards();
    this.log('Loaded library cards', {
      count: libraryCards.length,
    });

    this.log('Resolved profile', {
      identifiers: userIds.map((candidate) => candidate.source).join(','),
    });

    const quotes = await this.getAllQuotesWithFallback(userIds);
    this.log('Mapping quotes to books', {
      quotes: quotes.length,
      uniqueBooks: this.getUniqueQuoteBookIds(quotes).length,
    });
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

  private async getAllLibraryCards(): Promise<YandexLibraryCard[]> {
    const libraryCards: YandexLibraryCard[] = [];
    let offset = 0;

    while (true) {
      this.log('Loading library page', { limit: PAGE_LIMIT, offset });
      const response = await this.getJson<YandexLibraryCardsResponse>(
        `/profile/library_cards?limit=${PAGE_LIMIT}&offset=${offset}`
      );
      const page = response.library_cards ?? [];
      libraryCards.push(...page);
      this.log('Loaded library page', { count: page.length, total: libraryCards.length });

      if (page.length < PAGE_LIMIT) {
        return libraryCards;
      }

      offset += PAGE_LIMIT;
    }
  }

  private async getAllQuotesWithFallback(
    userIds: Array<{ source: string; value: string }>
  ): Promise<YandexQuote[]> {
    let lastError: unknown;

    for (const userId of userIds) {
      this.log('Trying quotes identifier', { source: userId.source });

      try {
        return await this.getAllQuotes(userId.value);
      } catch (error) {
        lastError = error;

        if (error instanceof YandexBooksApiError && error.status === 404) {
          this.log('Quotes identifier did not resolve', { source: userId.source });
          continue;
        }

        throw error;
      }
    }

    throw lastError;
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
      this.log('API error body', {
        path: label,
        body: this.truncateForLog(result.text),
      });
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
          'App-Language': 'ru',
          'App-Locale': 'ru',
          'App-Platform': 'android',
          'Auth-Token': ${JSON.stringify(this.oauthToken)},
          'Bookmate-Version': '20200305',
          'Content-Type': 'application/json',
          'Device-Os': 'Android',
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

  private getProfileIdentifiers(
    profile: YandexProfile,
    cookieUid?: string
  ): Array<{ source: string; value: string }> {
    const candidates = [
      { source: 'profile.uuid', value: profile.user?.uuid },
      { source: 'profile.login', value: profile.user?.login },
      { source: 'profile.id', value: profile.user?.id },
      { source: 'cookie.uid', value: cookieUid },
    ];
    const seen = new Set<string>();

    return candidates.flatMap((candidate) => {
      if (candidate.value == null || candidate.value === '') {
        return [];
      }

      const value = String(candidate.value);
      if (seen.has(value)) {
        return [];
      }

      seen.add(value);
      return [{ source: candidate.source, value }];
    });
  }

  private getUniqueQuoteBookIds(quotes: YandexQuote[]): string[] {
    return [
      ...new Set(
        quotes
          .map((quote) => quote.book?.uuid ?? quote.item_uuid)
          .filter((value): value is string => value != null && value !== '')
      ),
    ];
  }

  private requestLabel(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  private truncateForLog(value: string, maxLength = 240): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
  }
}
