export {};

describe('ignoreBooks', () => {
  // Helper that replicates the ignore filtering logic from filterBooksToSync
  const filterIgnored = (books: { title: string }[], ignoredBooks: string[]) => {
    const ignoredLower = ignoredBooks
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t !== '');
    if (ignoredLower.length === 0) return books;
    return books.filter((book) => {
      const titleLower = book.title.toLowerCase().trim();
      return !ignoredLower.some((pattern) => titleLower.includes(pattern));
    });
  };

  it('returns all books when ignore list is empty', () => {
    const books = [{ title: 'Book A' }, { title: 'Book B' }];
    expect(filterIgnored(books, [])).toHaveLength(2);
  });

  it('filters by exact title match (backward compat)', () => {
    const books = [{ title: 'My Book Title' }, { title: 'Other Book' }];
    const result = filterIgnored(books, ['My Book Title']);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Other Book');
  });

  it('filters by substring match', () => {
    const books = [
      {
        title:
          'Words of Radiance: Book Two of the Stormlight Archive (The Stormlight Archive, Book 2)',
      },
      { title: 'Atomic Habits' },
    ];
    const result = filterIgnored(books, ['Stormlight']);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Atomic Habits');
  });

  it('is case insensitive', () => {
    const books = [{ title: 'The Stormlight Archive' }];
    expect(filterIgnored(books, ['stormlight'])).toHaveLength(0);
    expect(filterIgnored(books, ['STORMLIGHT'])).toHaveLength(0);
  });

  it('does not filter when ignore patterns are empty strings', () => {
    const books = [{ title: 'Book A' }, { title: 'Book B' }];
    expect(filterIgnored(books, ['', '  ', ''])).toHaveLength(2);
  });

  it('applies multiple ignore patterns independently', () => {
    const books = [
      { title: 'Words of Radiance' },
      { title: 'Atomic Habits' },
      { title: 'Deep Work' },
    ];
    const result = filterIgnored(books, ['Radiance', 'Deep']);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Atomic Habits');
  });

  it('matches partial title with subtitle and series info', () => {
    const books = [
      { title: 'Tress of the Emerald Sea: A Cosmere Novel (Hoid\'s Travails)' },
      { title: 'Project Hail Mary' },
    ];
    const result = filterIgnored(books, ['Tress of the Emerald Sea']);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Project Hail Mary');
  });
});
