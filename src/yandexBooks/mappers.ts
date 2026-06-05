import type { Book, BookHighlight, Highlight } from '~/models';

import type { YandexBook, YandexQuote } from './types';

const YANDEX_BOOKS_BOOK_URL = 'https://books.yandex.ru/books';

const colorMap: Record<string, Highlight['color']> = {
  '1': 'yellow',
  '2': 'blue',
  '3': 'pink',
  '4': 'orange',
  blue: 'blue',
  orange: 'orange',
  pink: 'pink',
  yellow: 'yellow',
};

const compact = (values: Array<string | undefined>): string[] => {
  return values.filter((value): value is string => value != null && value.trim() !== '');
};

const timestampToDate = (value: YandexQuote['created_at']): Date | undefined => {
  if (value == null) {
    return undefined;
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
};

const getCoverUrl = (book: YandexBook): string | undefined => {
  return book.cover?.large ?? book.cover?.small ?? book.cover?.url ?? book.cover?.placeholder;
};

const mapBook = (book: YandexBook, quotes: YandexQuote[]): Book => {
  const id = book.uuid ?? quotes.find((quote) => quote.item_uuid)?.item_uuid ?? '';
  const author = compact([
    ...(book.authors_objects ?? []).map((person) => person.name),
    ...(book.authors ?? []).map((person) => person.name),
  ]).join(', ');
  const dates = quotes
    .map((quote) => timestampToDate(quote.created_at))
    .filter((value): value is Date => value != null);

  return {
    id,
    title: book.title ?? book.name ?? id,
    author,
    url: id ? `${YANDEX_BOOKS_BOOK_URL}/${id}` : undefined,
    imageUrl: getCoverUrl(book),
    lastAnnotatedDate:
      dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : undefined,
  };
};

const mapHighlight = (quote: YandexQuote): Highlight | undefined => {
  const text = quote.content?.trim();
  if (text == null || text === '') {
    return undefined;
  }

  return {
    id: quote.uuid ?? quote.cfi ?? `${quote.item_uuid ?? 'quote'}-${quote.created_at ?? text}`,
    text,
    location: quote.progress != null ? String(quote.progress) : undefined,
    note: quote.comment?.trim() || undefined,
    color: quote.color != null ? colorMap[String(quote.color)] : undefined,
    createdDate: timestampToDate(quote.created_at),
  };
};

export const mapQuotesToBookHighlights = (quotes: YandexQuote[]): BookHighlight[] => {
  const quotesByBook = new Map<string, YandexQuote[]>();

  quotes.forEach((quote) => {
    const bookId = quote.book?.uuid ?? quote.item_uuid;
    if (bookId == null || bookId === '') {
      return;
    }

    quotesByBook.set(bookId, [...(quotesByBook.get(bookId) ?? []), quote]);
  });

  return [...quotesByBook.values()].flatMap((bookQuotes) => {
    const book = bookQuotes.find((quote) => quote.book != null)?.book;
    if (book == null) {
      return [];
    }

    const highlights = bookQuotes
      .map((quote) => mapHighlight(quote))
      .filter((highlight): highlight is Highlight => highlight != null)
      .sort((a, b) => (a.createdDate?.getTime() ?? 0) - (b.createdDate?.getTime() ?? 0));

    return highlights.length > 0 ? [{ book: mapBook(book, bookQuotes), highlights }] : [];
  });
};
