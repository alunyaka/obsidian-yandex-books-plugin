type Author = {
  firstName: string;
  lastName: string;
};

export const parseAuthors = (author: string | undefined): Author[] => {
  if (author == null) {
    return [{ firstName: undefined, lastName: undefined }];
  }

  if (new RegExp(/\band\b/, 'i').exec(author)) {
    if (isLastNameFirstNameFormat(author)) {
      // "LastName, FirstName, LastName2, FirstName2, and LastName3, FirstName3" format
      // Split on "and", then split each remaining chunk into "LastName, FirstName" pairs
      return author
        .split(new RegExp(/\band\b/, 'i'))
        .map((a) => a.replace(/,$/, '').trim())
        .filter((a) => a !== '')
        .flatMap((chunk) => {
          // Each chunk may contain multiple "LastName, FirstName" pairs separated by commas
          // e.g. "Smith, John, Jones, Jane" → ["Smith, John", "Jones, Jane"]
          const segments = chunk.split(',').map((s) => s.trim());
          const authors: string[] = [];
          for (let i = 0; i < segments.length; i += 2) {
            if (i + 1 < segments.length) {
              authors.push(`${segments[i]}, ${segments[i + 1]}`);
            } else if (segments[i]) {
              authors.push(segments[i]);
            }
          }
          return authors;
        })
        .map(parseSingleAuthor);
    }

    // "FirstName LastName, FirstName LastName, And FirstName LastName" format
    // Use comma+and as delimiters
    return author
      .split(new RegExp(/\b(and|,)+/, 'i'))
      .map((a) => a.trim())
      .filter((a) => ['and', ',', ''].indexOf(a.toLowerCase()) === -1)
      .map(parseSingleAuthor);
  }

  if (author.includes(';')) {
    return author
      .split(';')
      .map((a) => a.trim())
      .map(parseSingleAuthor);
  }

  return [parseSingleAuthor(author)];
};

/**
 * Detect whether an author string uses "LastName, FirstName" format vs
 * "FirstName LastName" format.
 *
 * The strongest signal is the chunk AFTER "and" — in "LastName, FirstName"
 * format, it will contain a comma (e.g. "Brown, Bob"). In "FirstName LastName"
 * format, it won't (e.g. "Mr. Money Mustache").
 *
 * Examples:
 *   "Kegan, Robert and Lahey, Lisa Laskow"  → true  (last chunk has comma)
 *   "Newport, Cal, and Holiday, Ryan"        → true  (last chunk has comma)
 *   "Smith, John, Jones, Jane, and Brown, Bob" → true (last chunk has comma)
 *   "Vicki Robin, Joe Dominguez, And Mr. Money Mustache" → false (last chunk: no comma)
 *   "Robert Kegan and Lisa Laskow Lahey"     → false (last chunk: no comma)
 */
const isLastNameFirstNameFormat = (author: string): boolean => {
  const chunks = author
    .split(new RegExp(/\band\b/, 'i'))
    .map((a) => a.replace(/,$/, '').trim())
    .filter((a) => a !== '');

  // The chunk after "and" is the cleanest signal — no ambiguity from
  // Oxford commas or multiple authors before the conjunction
  const lastChunk = chunks[chunks.length - 1];
  return lastChunk.includes(',');
};

const parseSingleAuthor = (author: string): Author => {
  const hasComma = author.includes(',');

  if (hasComma) {
    const names = splitAndTrim(',', author);
    return {
      firstName: names.length == 1 ? undefined : splitAndTrim(' ', names[names.length - 1])[0],
      lastName: names[0],
    };
  }

  const names = splitAndTrim(' ', author);
  return {
    firstName: names.length == 1 ? undefined : names[0],
    lastName: names[names.length - 1],
  };
};

const splitAndTrim = (needle: string, author: string): string[] => {
  return author
    .split(needle)
    .map((a) => a.trim())
    .map((a) => a.replace(/\.$/, ''));
};
