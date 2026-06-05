import { mapQuotesToBookHighlights } from './mappers';
import type { YandexLibraryCard, YandexQuote } from './types';

describe('mapQuotesToBookHighlights', () => {
  it('groups quotes by book and maps them to sync models', () => {
    const quotes: YandexQuote[] = [
      {
        uuid: 'quote-2',
        content: 'Second quote',
        color: 2,
        comment: 'A note',
        created_at: 1_700_000_100,
        progress: 42,
        item_uuid: 'book-1',
        book: {
          uuid: 'book-1',
          title: 'The Book',
          authors_objects: [{ name: 'First Author' }, { name: 'Second Author' }],
          cover: { large: 'https://example.com/large.jpg' },
        },
      },
      {
        uuid: 'quote-1',
        content: 'First quote',
        color: 'yellow',
        created_at: 1_700_000_000,
        item_uuid: 'book-1',
        book: {
          uuid: 'book-1',
          title: 'The Book',
          authors_objects: [{ name: 'First Author' }, { name: 'Second Author' }],
          cover: { large: 'https://example.com/large.jpg' },
        },
      },
    ];

    const [entry] = mapQuotesToBookHighlights(quotes);

    expect(entry.book).toEqual({
      id: 'book-1',
      title: 'The Book',
      author: 'First Author, Second Author',
      url: 'https://books.yandex.ru/books/book-1',
      imageUrl: 'https://example.com/large.jpg',
      lastAnnotatedDate: new Date(1_700_000_100 * 1000),
    });
    expect(entry.highlights).toEqual([
      {
        id: 'quote-1',
        text: 'First quote',
        color: 'yellow',
        createdDate: new Date(1_700_000_000 * 1000),
      },
      {
        id: 'quote-2',
        text: 'Second quote',
        location: '42',
        note: 'A note',
        color: 'blue',
        createdDate: new Date(1_700_000_100 * 1000),
      },
    ]);
  });

  it('skips quotes without book ids or content', () => {
    const result = mapQuotesToBookHighlights([
      { content: 'No book' },
      {
        content: '',
        item_uuid: 'book-1',
        book: { uuid: 'book-1', title: 'Book' },
      },
    ]);

    expect(result).toEqual([]);
  });

  it('handles single-object author fields from the API', () => {
    const [entry] = mapQuotesToBookHighlights([
      {
        uuid: 'quote-1',
        content: 'Quote',
        item_uuid: 'book-1',
        book: {
          uuid: 'book-1',
          title: 'Book',
          authors_objects: { name: 'Single Author' },
        },
      },
    ]);

    expect(entry.book.author).toBe('Single Author');
  });

  it('enriches book metadata from library cards', () => {
    const quotes: YandexQuote[] = [
      {
        uuid: 'quote-1',
        content: 'Quote',
        item_uuid: 'book-1',
        book: {
          uuid: 'book-1',
          title: 'Book',
        },
      },
    ];
    const libraryCards: YandexLibraryCard[] = [
      {
        added_at: 1_700_049_600,
        finished_at: 1_700_136_000,
        state: 'finished',
        book: {
          uuid: 'book-1',
          description: 'Book description',
          isbn13: '9781234567890',
          paper_pages: 320,
          publication_date: 1_700_049_600,
          publisher: 'Publisher',
          legal_rights_holder: 'Rights Holder',
          translators_objects: [{ name: 'First Translator' }, { name: 'Second Translator' }],
        },
      },
    ];

    const [entry] = mapQuotesToBookHighlights(quotes, libraryCards);

    expect(entry.metadata).toEqual({
      isbn: '9781234567890',
      pages: '320',
      publicationDate: '2023-11-15',
      publisher: 'Publisher',
      description: 'Book description',
      rightsHolder: 'Rights Holder',
      translator: 'First Translator, Second Translator',
      addedDate: '2023-11-15',
      finishedDate: '2023-11-16',
      readingStatus: 'Finished',
    });
  });

  it('does not map empty finished timestamps to 1970 dates', () => {
    const [entry] = mapQuotesToBookHighlights(
      [
        {
          uuid: 'quote-1',
          content: 'Quote',
          item_uuid: 'book-1',
          book: {
            uuid: 'book-1',
            title: 'Book',
          },
        },
      ],
      [
        {
          finished_at: 0,
          reading_progress: 42,
          state: 'reading',
          book: {
            uuid: 'book-1',
          },
        },
      ]
    );

    expect(entry.metadata?.finishedDate).toBeUndefined();
    expect(entry.metadata?.readingStatus).toBe('Reading');
  });

  it('infers finished status from complete reading progress', () => {
    const [entry] = mapQuotesToBookHighlights(
      [
        {
          uuid: 'quote-1',
          content: 'Quote',
          item_uuid: 'book-1',
          book: {
            uuid: 'book-1',
            title: 'Book',
          },
        },
      ],
      [
        {
          finished_at: 0,
          reading_progress: 100,
          state: 'reading',
          book: {
            uuid: 'book-1',
          },
        },
      ]
    );

    expect(entry.metadata?.finishedDate).toBeUndefined();
    expect(entry.metadata?.readingStatus).toBe('Finished');
  });
});
