import { mapQuotesToBookHighlights } from './mappers';
import type { YandexQuote } from './types';

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
});
