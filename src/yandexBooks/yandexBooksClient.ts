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
const QUOTES_PAGE_LIMIT = 200;
const MAX_QUOTES_PAGES = 500;

export type YandexBooksDebugEvent = {
  message: string;
  details?: Record<string, number | string | undefined>;
};

type DebugLogger = (event: YandexBooksDebugEvent) => void;

type YandexBooksClientOptions = {
  debugQuoteLimit?: number;
  signal?: AbortSignal;
};

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

export class YandexBooksSyncCancelledError extends Error {
  constructor() {
    super('Yandex Books sync cancelled');
    this.name = 'YandexBooksSyncCancelledError';
  }
}

export default class YandexBooksClient {
  private window: BrowserWindow | undefined;
  private ready: Promise<void> | undefined;

  constructor(
    private oauthToken: string,
    private debug?: DebugLogger,
    private options: YandexBooksClientOptions = {}
  ) {}

  public async getProfile(): Promise<YandexProfile> {
    this.throwIfAborted();
    this.log('Loading profile');
    return this.getJson<YandexProfile>('/profile');
  }

  public async getBookHighlights(): Promise<BookHighlight[]> {
    this.throwIfAborted();
    const authInfo = await readYandexAuthInfo();
    const profile = await this.getProfile();
    const userIds = this.getProfileIdentifiers(profile, authInfo.uid);

    if (userIds.length === 0) {
      throw new YandexBooksApiError('Could not determine Yandex Books user id');
    }

    const libraryCards = await this.getAllLibraryCards();
    this.throwIfAborted();
    this.log('Loaded library cards', {
      count: libraryCards.length,
    });

    this.log('Resolved profile', {
      identifiers: userIds.map((candidate) => candidate.source).join(','),
    });

    const quotes = await this.getAllQuotesWithFallback(userIds);
    this.throwIfAborted();
    const quoteBookIds = this.getUniqueQuoteBookIds(quotes);
    const libraryBookIds = this.getUniqueLibraryBookIds(libraryCards);
    const libraryBooksWithoutQuotes = libraryBookIds.filter(
      (bookId) => !quoteBookIds.includes(bookId)
    );

    this.log('Quote books', {
      count: quoteBookIds.length,
      titles: this.getQuoteBookTitles(quotes).join(' | '),
    });
    this.log('Library books without quotes', {
      count: libraryBooksWithoutQuotes.length,
    });
    this.logLibraryCardDiagnostics(quoteBookIds, libraryCards);
    this.log('Mapping quotes to books', {
      quotes: quotes.length,
      uniqueBooks: quoteBookIds.length,
    });
    this.throwIfAborted();
    return mapQuotesToBookHighlights(quotes, libraryCards);
  }

  public destroy(): void {
    if (this.window != null && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  private async getAllQuotes(userId: string): Promise<YandexQuote[]> {
    const quotes: YandexQuote[] = [];
    const seen = new Set<string>();
    const quoteLimit = this.options.debugQuoteLimit;

    for (let pageNumber = 1; pageNumber <= MAX_QUOTES_PAGES; pageNumber++) {
      this.throwIfAborted();
      const remainingQuotes =
        quoteLimit != null ? Math.max(0, quoteLimit - quotes.length) : QUOTES_PAGE_LIMIT;

      if (remainingQuotes === 0) {
        this.log('Stopped quotes pagination at debug limit', { limit: quoteLimit });
        return quotes;
      }

      const perPage = Math.min(QUOTES_PAGE_LIMIT, remainingQuotes);

      this.log('Loading quotes page', { page: pageNumber, perPage });
      const response = await this.getJson<YandexQuotesResponse>(
        `/users/${encodeURIComponent(userId)}/quotes?page=${pageNumber}&per_page=${perPage}`
      );
      this.throwIfAborted();

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

      if (quoteLimit != null && quotes.length >= quoteLimit) {
        this.log('Stopped quotes pagination at debug limit', { limit: quoteLimit });
        return quotes.slice(0, quoteLimit);
      }

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
      this.throwIfAborted();
      this.log('Loading library page', { limit: LIBRARY_PAGE_LIMIT, offset });
      const response = await this.getJson<YandexLibraryCardsResponse>(
        `/profile/library_cards?limit=${LIBRARY_PAGE_LIMIT}&offset=${offset}`
      );
      this.throwIfAborted();
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
      this.throwIfAborted();
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
    this.throwIfAborted();
    const url = path.startsWith('http') ? path : `${REST_BASE_URL}${path}`;
    const label = this.requestLabel(url);
    const result = await this.fetchFromYandexSession(url);
    this.throwIfAborted();

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
      throw new YandexBooksApiError(
        `Yandex Books API returned invalid JSON: ${String(error)}`
      );
    }
  }

  private async fetchFromYandexSession(url: string): Promise<FetchResult> {
    this.throwIfAborted();
    await this.ensureReady();
    this.throwIfAborted();

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

    let rejectAbort: (error: YandexBooksSyncCancelledError) => void;
    const abortPromise = new Promise<never>((_resolve, reject) => {
      rejectAbort = reject;
    });
    const abortFetch = () => {
      this.log('Aborting active API request', { path: this.requestLabel(url) });
      this.destroy();
      rejectAbort(new YandexBooksSyncCancelledError());
    };

    try {
      this.options.signal?.addEventListener('abort', abortFetch, { once: true });
      const fetchPromise = this.window.webContents.executeJavaScript<FetchResult>(script);
      return await Promise.race([fetchPromise, abortPromise]);
    } catch (error) {
      this.throwIfAborted();
      this.log('API fetch failed before HTTP response', {
        path: this.requestLabel(url),
        error: String(error),
      });
      throw new YandexBooksApiError(
        `Yandex Books API network request failed for ${this.requestLabel(url)}: ${String(
          error
        )}`
      );
    } finally {
      this.options.signal?.removeEventListener('abort', abortFetch);
    }
  }

  private async ensureReady(): Promise<void> {
    this.throwIfAborted();
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
      const abortReady = () => {
        this.destroy();
        reject(new YandexBooksSyncCancelledError());
      };

      this.options.signal?.addEventListener('abort', abortReady, { once: true });
      this.window.webContents.once('did-finish-load', () => {
        this.options.signal?.removeEventListener('abort', abortReady);
        resolve();
      });
      this.window.webContents.once('did-fail-load', () => {
        this.options.signal?.removeEventListener('abort', abortReady);
        reject(new YandexBooksApiError('Could not initialize Yandex Books session window'));
      });
      this.window.loadURL(API_ORIGIN);
    });

    return this.ready;
  }

  private log(message: string, details?: YandexBooksDebugEvent['details']): void {
    this.debug?.({ message, details });
  }

  private throwIfAborted(): void {
    if (this.options.signal?.aborted) {
      throw new YandexBooksSyncCancelledError();
    }
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
    return (
      quote.uuid ?? quote.cfi ?? `${quote.item_uuid ?? 'quote'}-${quote.created_at ?? ''}`
    );
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

  private logLibraryCardDiagnostics(
    quoteBookIds: string[],
    libraryCards: YandexLibraryCard[]
  ): void {
    if (this.debug == null) {
      return;
    }

    const libraryCardsByBookId = new Map<string, YandexLibraryCard>();

    libraryCards.forEach((card) => {
      const bookIds = this.getLibraryCardBookIds(card);

      bookIds.forEach((bookId) => {
        if (!libraryCardsByBookId.has(bookId)) {
          libraryCardsByBookId.set(bookId, card);
        }
      });
    });

    quoteBookIds.forEach((bookId) => {
      const card = libraryCardsByBookId.get(bookId);

      this.log('Library card metadata fields', {
        bookId,
        matched: card == null ? 'no' : 'yes',
        cardKeys: card == null ? undefined : Object.keys(card).sort().join(','),
        bookKeys:
          card == null
            ? undefined
            : Object.keys(this.getLibraryCardBook(card) ?? {})
                .sort()
                .join(','),
        state: card?.state,
        status: card?.status,
        readingStatus: card?.reading_status,
        readState: card?.read_state,
        progress: card?.progress,
        readingProgress: card?.reading_progress,
        addedAt: card?.added_at,
        finishedAt: card?.finished_at,
        completedAt: card?.completed_at,
        readAt: card?.read_at,
        dateFinished: card?.date_finished,
        finishedOn: card?.finished_on,
        completedOn: card?.completed_on,
        readDate: card?.read_date,
        accessedAt: card?.accessed_at,
        startedAt: card?.started_at,
        lastReadAt: card?.last_read_at,
      });
    });
  }

  private getLibraryCardBook(card: YandexLibraryCard) {
    return card.book ?? card.audiobook ?? card.comicbook;
  }

  private getLibraryCardBookIds(card: YandexLibraryCard): string[] {
    const book = this.getLibraryCardBook(card);

    return [book?.uuid, book?.init_uuid, card.document_uuid, card.chapter_uuid].filter(
      (value): value is string => value != null && value !== ''
    );
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
