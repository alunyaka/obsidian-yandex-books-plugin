import { parseAuthors } from './parseAuthor';

describe('parseAuthor', () => {
  it.each([
    ['Michael Port', 'Michael', 'Port'],
    ['Strunk Jr., William', 'William', 'Strunk Jr'],
    ['Yuval Noah Harari', 'Yuval', 'Harari'],
    ['P2K', undefined, 'P2K'],
    ['Toole, John Kennedy', 'John', 'Toole'],
    [null, undefined, undefined],
    ['Schwab, V. E.', 'V', 'Schwab'],
    ['Brandon Sanderson', 'Brandon', 'Sanderson'],
    ['Sanderson, Brandon', 'Brandon', 'Sanderson'],
  ])(
    'Parse "%s" evaluated as firstName: "%s" and lastName: "%s',
    (author, firstName, lastName) => {
      const authors = parseAuthors(author);
      expect(authors).toHaveLength(1);
      expect(authors[0]).toEqual({ firstName, lastName });
    }
  );

  it.each([
    ['Michael Port', 1],
    ['Vicki Robin, Joe Dominguez, And Mr. Money Mustache', 3],
    ['Robert Kegan aNd Lisa Laskow Lahey', 2],
    ['Chan, Francis;Sprinkle, Preston', 2],
  ])('"%s" is parsed as %s author(s)', (author, expectedAuthorCount) => {
    const authors = parseAuthors(author);
    expect(authors).toHaveLength(expectedAuthorCount);
  });

  // Issue #306: "LastName, FirstName and LastName2, FirstName2" format
  // Catalog providers commonly use this format. The old regex split on both comma and "and"
  // simultaneously, destroying the LastName/FirstName pairing.
  it('correctly parses "LastName, FirstName and LastName2, FirstName2" format', () => {
    const authors = parseAuthors('Kegan, Robert and Lahey, Lisa Laskow');
    expect(authors).toHaveLength(2);
    expect(authors[0]).toEqual({ firstName: 'Robert', lastName: 'Kegan' });
    expect(authors[1]).toEqual({ firstName: 'Lisa', lastName: 'Lahey' });
  });

  it('correctly parses "LastName, FirstName, and LastName2, FirstName2" format with Oxford comma', () => {
    const authors = parseAuthors('Newport, Cal, and Holiday, Ryan');
    expect(authors).toHaveLength(2);
    expect(authors[0]).toEqual({ firstName: 'Cal', lastName: 'Newport' });
    expect(authors[1]).toEqual({ firstName: 'Ryan', lastName: 'Holiday' });
  });

  it('correctly parses three authors in "LastName, FirstName" format', () => {
    const authors = parseAuthors('Smith, John, Jones, Jane, and Brown, Bob');
    expect(authors).toHaveLength(3);
    expect(authors[0]).toEqual({ firstName: 'John', lastName: 'Smith' });
    expect(authors[1]).toEqual({ firstName: 'Jane', lastName: 'Jones' });
    expect(authors[2]).toEqual({ firstName: 'Bob', lastName: 'Brown' });
  });

  it('does not split on "and" within a single author name like "Husband"', () => {
    const authors = parseAuthors('Husband');
    expect(authors).toHaveLength(1);
    expect(authors[0]).toEqual({ firstName: undefined, lastName: 'Husband' });
  });

  it('does not split on "and" within "Alexander McCall Smith"', () => {
    const authors = parseAuthors('Alexander McCall Smith');
    expect(authors).toHaveLength(1);
    expect(authors[0]).toEqual({ firstName: 'Alexander', lastName: 'Smith' });
  });
});
