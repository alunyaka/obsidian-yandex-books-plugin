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
const LIBRARY_PAGE_LIMIT = 100;
const QUOTES_PAGE_LIMIT = 20;
const MAX_QUOTES_PAGES = 500;

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
    const quoteBookIds = this.getUniqueQuoteBookIds(quotes);
    const libraryBookIds = this.getUniqueLibraryBookIds(libraryCards);
    const libraryBooksWithoutQuotes = libraryBookIds.filter((bookId) => !quoteBookIds.includes(bookId));

    this.log('Quote books', {
      count: quoteBookIds.length,
      titles: this.getQuoteBookTitles(quotes).join(' | '),
    });
    this.log('Library books without quotes', {
      count: libraryBooksWithoutQuotes.length,
    });
    this.log('Mapping quotes to books', {
      quotes: quotes.length,
      uniqueBooks: quoteBookIds.length,
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
    const seen = new Set<string>();

    for (let pageNumber = 1; pageNumber <= MAX_QUOTES_PAGES; pageNumber++) {
      this.log('Loading quotes page', { page: pageNumber, perPage: QUOTES_PAGE_LIMIT });
      const response = await this.getJson<YandexQuotesResponse>(
        `/users/${encodeURIComponent(userId)}/quotes?page=${pageNumber}&per_page=${QUOTES_PAGE_LIMIT}`
      );
      if (pageNumber === 1) {
        this.log('Quotes response metadata', this.getResponseMetadata(response));
      }

      const page = response.quotes ?? [];
      const newQuotes = page.filter((quote) => {
        const id = this.getQuoteId(quote);

        if (seen.has(id)) {
          return false;
        }

        seen.add(id);
        return true;
      });

      quotes.push(...newQuotes);
      this.log('Loaded quotes page', {
        count: page.length,
        newCount: newQuotes.length,
        total: quotes.length,
      });

      if (page.length === 0 || newQuotes.length === 0) {
        return quotes;
      }
    }

    this.log('Stopped quotes pagination at safety limit', { pages: MAX_QUOTES_PAGES });
    return quotes;
  }

  private async getAllLibraryCards(): Promise<YandexLibraryCard[]> {
    const libraryCards: YandexLibraryCard[] = [];
    let offset = 0;

    while (true) {
      this.log('Loading library page', { limit: LIBRARY_PAGE_LIMIT, offset });
      const response = await this.getJson<YandexLibraryCardsResponse>(
        `/profile/library_cards?limit=${LIBRARY_PAGE_LIMIT}&offset=${offset}`
      );
      const page = response.library_cards ?? [];
      libraryCards.push(...page);
      this.log('Loaded library page', { count: page.length, total: libraryCards.length });

      if (page.length < LIBRARY_PAGE_LIMIT) {
        return libraryCards;
      }

      offset += LIBRARY_PAGE_LIMIT;
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

  private getQuoteId(quote: YandexQuote): string {
    return quote.uuid ?? quote.cfi ?? `${quote.item_uuid ?? 'quote'}-${quote.created_at ?? ''}`;
  }

  private getUniqueLibraryBookIds(libraryCards: YandexLibraryCard[]): string[] {
    return [
      ...new Set(
        libraryCards
          .map((card) => card.book?.uuid ?? card.audiobook?.uuid ?? card.comicbook?.uuid)
          .filter((value): value is string => value != null && value !== '')
      ),
    ];
  }

  private getQuoteBookTitles(quotes: YandexQuote[]): string[] {
    const titlesById = new Map<string, string>();

    quotes.forEach((quote) => {
      const bookId = quote.book?.uuid ?? quote.item_uuid;
      const title = quote.book?.title ?? quote.book?.name;

      if (bookId != null && title != null && !titlesById.has(bookId)) {
        titlesById.set(bookId, title);
      }
    });

    return [...titlesById.values()];
  }

  private getResponseMetadata(
    response: Record<string, unknown>
  ): YandexBooksDebugEvent['details'] {
    const meta = response.meta as Record<string, unknown> | undefined;
    const pagination = response.pagination as Record<string, unknown> | undefined;

    return {
      keys: Object.keys(response).join(','),
      total: this.numberish(response.total),
      totalCount: this.numberish(response.total_count),
      count: this.numberish(response.count),
      metaTotal: this.numberish(meta?.total),
      metaTotalCount: this.numberish(meta?.total_count),
      paginationTotal: this.numberish(pagination?.total),
    };
  }

  private numberish(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : undefined;
    }

    return undefined;
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
