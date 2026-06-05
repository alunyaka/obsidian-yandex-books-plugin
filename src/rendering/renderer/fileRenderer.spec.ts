import faker from 'faker';

import type { BookHighlight } from '~/models';
import defaultFileTemplate from '~/rendering/templates/bookTemplate.njk';

import FileRenderer from './fileRenderer';

describe('FileRenderer', () => {
  describe('validate', () => {
    it.each([null, undefined])('should return true for %s template', (template) => {
      const renderer = new FileRenderer('', '');
      expect(renderer.validate(template)).toBe(true);
    });
  });

  describe('render', () => {
    describe('file template variables', () => {
      const bookHighlight: BookHighlight = {
        book: {
          id: faker.random.alphaNumeric(4),
          title: 'My book title: extended description',
          author: faker.name.findName(),
          url: faker.internet.url(),
          imageUrl: faker.image.imageUrl(),
          lastAnnotatedDate: new Date(2022, 3, 4),
        },
        metadata: {
          isbn: faker.random.alphaNumeric(4),
          pages: faker.datatype.number(100).toString(),
          publicationDate: faker.date.past().toISOString(),
          publisher: faker.company.companyName(),
          description: faker.lorem.sentence(),
          rightsHolder: faker.company.companyName(),
          translator: faker.name.findName(),
          addedDate: '2026-01-12',
          startedDate: '2026-01-13',
          finishedDate: '2026-01-18',
          readingStatus: 'finished',
          authorUrl: faker.internet.url(),
        },
        highlights: [
          {
            id: faker.random.alphaNumeric(4),
            text: 'highlighted text',
          },
        ],
      };

      it.each([
        ['{{id}}', ''],
        ['{{title}}', 'My book title'],
        ['{{longTitle}}', 'My book title: extended description'],
        ['{{bookId}}', bookHighlight.book.id],
        ['{{url}}', bookHighlight.book.url],
        ['{{imageUrl}}', bookHighlight.book.imageUrl],
        ['{{lastAnnotatedDate}}', '2022-04-04'],
        ['{{isbn}}', bookHighlight.metadata.isbn],
        ['{{pages}}', bookHighlight.metadata.pages],
        ['{{publicationDate}}', bookHighlight.metadata.publicationDate],
        ['{{publisher}}', bookHighlight.metadata.publisher],
        ['{{description}}', bookHighlight.metadata.description],
        ['{{rightsHolder}}', bookHighlight.metadata.rightsHolder],
        ['{{translator}}', bookHighlight.metadata.translator],
        ['{{addedDate}}', bookHighlight.metadata.addedDate],
        ['{{startedDate}}', bookHighlight.metadata.startedDate],
        ['{{finishedDate}}', bookHighlight.metadata.finishedDate],
        ['{{readingStatus}}', bookHighlight.metadata.readingStatus],
        ['{{authorUrl}}', bookHighlight.metadata.authorUrl],
        ['{{highlightsCount}}', '1'],
      ])('template variable "%s" evaluated as "%s"', (template, expected) => {
        const renderer = new FileRenderer(template, '');
        expect(renderer.render(bookHighlight)).toBe(expected);
      });
    });

    describe('file template variables works for null values', () => {
      const bookHighlight: BookHighlight = {
        book: {
          id: faker.random.alphaNumeric(4),
          title: 'My book title: extended description',
          author: faker.name.findName(),
        },
        metadata: {},
        highlights: [
          {
            id: faker.random.alphaNumeric(4),
            text: 'highlighted text',
          },
        ],
      };

      it.each([
        ['{{bookId}}', bookHighlight.book.id],
        ['{{url}}', ''],
        ['{{imageUrl}}', ''],
        ['{{lastAnnotatedDate}}', ''],
        ['{{isbn}}', ''],
        ['{{pages}}', ''],
        ['{{publicationDate}}', ''],
        ['{{publisher}}', ''],
        ['{{description}}', ''],
        ['{{rightsHolder}}', ''],
        ['{{translator}}', ''],
        ['{{addedDate}}', ''],
        ['{{startedDate}}', ''],
        ['{{finishedDate}}', ''],
        ['{{readingStatus}}', ''],
        ['{{authorUrl}}', ''],
        ['{{highlightsCount}}', '1'],
      ])('template variable "%s" evaluated as "%s"', (template, expected) => {
        const renderer = new FileRenderer(template, '');
        expect(renderer.render(bookHighlight)).toBe(expected);
      });
    });

    it('Simple render of a minimalist file template', () => {
      const bookHighlight: BookHighlight = {
        book: {
          id: faker.random.alphaNumeric(4),
          title: 'My book title: extended description',
          author: faker.name.findName(),
        },
        metadata: {
          publisher: faker.company.companyName(),
        },
        highlights: [
          {
            id: 'H1',
            text: 'highlighted text',
          },
          {
            id: 'H2',
            text: 'another piece of text',
          },
        ],
      };

      const fileTemplate = `
# {{title}}

## Metadata
- Author:: {{author}}
- Publisher:: {{publisher}}
- Highlights count:: {{highlightsCount}}

## Highlights
{{highlights}}
`;

      const renderedContent = `
# My book title

## Metadata
- Author:: ${bookHighlight.book.author}
- Publisher:: ${bookHighlight.metadata.publisher}
- Highlights count:: 2

## Highlights
- highlighted text ^ref-H1
- another piece of text ^ref-H2
`;

      const renderer = new FileRenderer(fileTemplate, '- {{text}}');
      expect(renderer.render(bookHighlight)).toBe(renderedContent);
    });

    it('Simple render works without optional metadata', () => {
      const bookHighlight: BookHighlight = {
        book: {
          id: faker.random.alphaNumeric(4),
          title: 'My book title: extended description',
          author: faker.name.findName(),
        },
        highlights: [],
      };

      const fileTemplate = `
# {{title}}

## Metadata
- Author:: {{author}}
- Publisher:: {{publisher}}.

## Highlights
{{highlights}}
`;

      const renderedContent = `
# My book title

## Metadata
- Author:: ${bookHighlight.book.author}
- Publisher:: .

## Highlights

`;

      const renderer = new FileRenderer(fileTemplate, '- {{text}}');
      expect(renderer.render(bookHighlight)).toBe(renderedContent);
    });

    it('renders editable YAML properties from file template', () => {
      const bookHighlight: BookHighlight = {
        book: {
          id: 'book:1',
          title: 'Title with "quotes": extended',
          author: 'Test Author',
        },
        highlights: [],
      };

      const fileTemplate = `---
book-id: {{ bookId | yaml }}
book-title: {{ longTitle | yaml }}
---
# {{title}}
`;

      const renderer = new FileRenderer(fileTemplate, '');

      expect(renderer.render(bookHighlight)).toBe(`---
book-id: "book:1"
book-title: "Title with \\"quotes\\": extended"
---
# Title with "quotes"
`);
    });

    it('renders the default Yandex Books file template', () => {
      const bookHighlight: BookHighlight = {
        book: {
          id: 'book:1',
          title: 'Title with "quotes": extended',
          author: 'Test Author',
          url: 'https://books.yandex.ru/books/book:1',
          imageUrl: 'https://example.com/cover.jpg',
          lastAnnotatedDate: new Date(2026, 0, 31),
        },
        metadata: {
          pages: '275',
          publicationDate: '2025-09-11',
          publisher: 'Test Publisher',
          description: 'Book description',
          translator: 'Test Translator',
          addedDate: '2026-01-12',
          startedDate: '2026-01-13',
          finishedDate: '2026-01-18',
          readingStatus: 'Finished',
        },
        highlights: [{ id: 'H1', text: 'highlighted text' }],
      };

      const renderer = new FileRenderer(defaultFileTemplate, '- {{text}}');

      expect(renderer.render(bookHighlight)).toBe(`---
bookId: "book:1"
title: "Title with \\"quotes\\": extended"
author: "Test Author"
highlightsCount: 1
bookUrl: "https://books.yandex.ru/books/book:1"
lastAnnotatedDate: "2026-01-31"
publisher: "Test Publisher"
pages: 275
publication_date: "2025-09-11"
status: Finished
added_date: 2026-01-12
started_date: 2026-01-13
finished_date: 2026-01-18
translators: "Test Translator"
ImageUrl: "https://example.com/cover.jpg"
---
# Title with "quotes"
![](https://example.com/cover.jpg)


## Description
Book description


## Highlights
- highlighted text ^ref-H1
`);
    });
  });
});
