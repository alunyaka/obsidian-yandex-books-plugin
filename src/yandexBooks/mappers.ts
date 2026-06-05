import moment from 'moment';

import type { Book, BookHighlight, BookMetadata, Highlight } from '~/models';

import type { YandexBook, YandexLibraryCard, YandexPerson, YandexQuote } from './types';

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

const asArray = <T>(value: T[] | T | undefined): T[] => {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const timestampToDate = (value: YandexQuote['created_at']): Date | undefined => {
  if (value == null) {
    return undefined;
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }

  return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
};

const timestampToDateString = (value: number | string | undefined): string | undefined => {
  const date = timestampToDate(value);

  return date != null ? moment(date).format('YYYY-MM-DD') : undefined;
};

const firstString = (values: Array<number | string | undefined>): string | undefined => {
  return values
    .map((value) => (value == null ? undefined : String(value).trim()))
    .find((value): value is string => value != null && value !== '');
};

const metadataDate = (value: number | string | undefined): string | undefined => {
  if (value == null) {
    return undefined;
  }

  const stringValue = String(value).trim();
  if (stringValue === '' || stringValue === '0') {
    return undefined;
  }

  const numeric = Number(stringValue);
  if (Number.isFinite(numeric)) {
    if (numeric > 0 && numeric < 10_000) {
      return stringValue;
    }

    return timestampToDateString(numeric);
  }

  const parsed = moment(stringValue);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : stringValue;
};

const firstMetadataDate = (values: Array<number | string | undefined>): string | undefined => {
  return values.map((value) => metadataDate(value)).find((value) => value != null);
};

const getCoverUrl = (book: YandexBook): string | undefined => {
  return book.cover?.large ?? book.cover?.small ?? book.cover?.url ?? book.cover?.placeholder;
};

const getCardBook = (card: YandexLibraryCard | undefined): YandexBook | undefined => {
  return card?.book ?? card?.audiobook ?? card?.comicbook;
};

const getBookId = (book: YandexBook | undefined): string | undefined => {
  return book?.uuid;
};

const mergeBook = (primary: YandexBook, fallback?: YandexBook): YandexBook => {
  return fallback == null ? primary : { ...fallback, ...primary };
};

const getPersonNames = (people: YandexPerson[] | YandexPerson | undefined): string[] => {
  return compact(asArray(people).map((person) => person.name));
};

const readingStatus = (libraryCard?: YandexLibraryCard): string | undefined => {
  const state = firstString([libraryCard?.state, libraryCard?.status])?.toLowerCase();
  const progress = libraryCard?.reading_progress;

  if (
    state === 'finished' ||
    state === 'completed' ||
    state === 'read' ||
    progress === 100 ||
    (progress != null && progress >= 0.999 && progress <= 1)
  ) {
    return 'Finished';
  }

  if (state === 'reading') {
    return 'Reading';
  }

  return firstString([libraryCard?.state, libraryCard?.status]);
};

const mapBookMetadata = (book: YandexBook, libraryCard?: YandexLibraryCard): BookMetadata => {
  const translator = compact([
    ...getPersonNames(book.translators_objects),
    ...getPersonNames(book.translators),
  ]).join(', ');

  return {
    isbn: firstString([book.isbn13, book.isbn_13, book.isbn, book.isbn10, book.isbn_10]),
    pages: firstString([book.paper_pages, book.pages]),
    publicationDate: firstMetadataDate([book.publication_date, book.publication_year]),
    publisher: firstString([book.publisher, book.imprint]),
    description: firstString([book.description]),
    rightsHolder: firstString([
      book.legal_rights_holder,
      book.rights_holder,
      book.copyright_holder,
    ]),
    translator: translator === '' ? undefined : translator,
    addedDate: firstMetadataDate([libraryCard?.added_at]),
    finishedDate: firstMetadataDate([
      libraryCard?.finished_at,
      libraryCard?.completed_at,
      libraryCard?.read_at,
    ]),
    readingStatus: readingStatus(libraryCard),
  };
};

const mapBook = (book: YandexBook, quotes: YandexQuote[]): Book => {
  const id = book.uuid ?? quotes.find((quote) => quote.item_uuid)?.item_uuid ?? '';
  const author = compact([
    ...asArray(book.authors_objects).map((person) => person.name),
    ...asArray(book.authors).map((person) => person.name),
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
      dates.length > 0
        ? new Date(Math.max(...dates.map((date) => date.getTime())))
        : undefined,
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

export const mapQuotesToBookHighlights = (
  quotes: YandexQuote[],
  libraryCards: YandexLibraryCard[] = []
): BookHighlight[] => {
  const quotesByBook = new Map<string, YandexQuote[]>();
  const libraryCardsByBookId = new Map<string, YandexLibraryCard>();

  libraryCards.forEach((card) => {
    const bookId = getBookId(getCardBook(card));

    if (bookId != null && bookId !== '' && !libraryCardsByBookId.has(bookId)) {
      libraryCardsByBookId.set(bookId, card);
    }
  });

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

    const libraryCard = libraryCardsByBookId.get(book.uuid ?? '');
    const fullBook = mergeBook(book, getCardBook(libraryCard));

    const highlights = bookQuotes
      .map((quote) => mapHighlight(quote))
      .filter((highlight): highlight is Highlight => highlight != null)
      .sort((a, b) => (a.createdDate?.getTime() ?? 0) - (b.createdDate?.getTime() ?? 0));

    return highlights.length > 0
      ? [
          {
            book: mapBook(fullBook, bookQuotes),
            highlights,
            metadata: mapBookMetadata(fullBook, libraryCard),
          },
        ]
      : [];
  });
};
