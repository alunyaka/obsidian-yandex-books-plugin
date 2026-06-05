export type YandexImage = {
  large?: string;
  placeholder?: string;
  small?: string;
  url?: string;
};

export type YandexPerson = {
  name?: string;
};

export type YandexBook = {
  authors?: YandexPerson[] | YandexPerson;
  authors_objects?: YandexPerson[] | YandexPerson;
  copyright_holder?: string;
  cover?: YandexImage;
  description?: string;
  imprint?: string;
  isbn?: number | string;
  isbn10?: number | string;
  isbn13?: number | string;
  isbn_10?: number | string;
  isbn_13?: number | string;
  legal_rights_holder?: string;
  name?: string;
  pages?: number | string;
  paper_pages?: number | string;
  publication_date?: number | string;
  publication_year?: number | string;
  publisher?: string;
  rights_holder?: string;
  title?: string;
  translators?: YandexPerson[] | YandexPerson;
  translators_objects?: YandexPerson[] | YandexPerson;
  uuid?: string;
};

export type YandexQuote = {
  book?: YandexBook;
  cfi?: string;
  color?: number | string;
  comment?: string | null;
  content?: string;
  created_at?: number | string;
  item_uuid?: string;
  progress?: number;
  uuid?: string;
};

export type YandexLibraryCard = {
  added_at?: number | string;
  audiobook?: YandexBook;
  book?: YandexBook;
  completed_at?: number | string;
  comicbook?: YandexBook;
  finished_at?: number | string;
  last_read_at?: number | string;
  read_at?: number | string;
  reading_progress?: number;
  state?: string;
  status?: string;
  uuid?: string;
};

export type YandexProfile = {
  user?: {
    id?: number | string;
    login?: string;
    uuid?: string;
  };
};

export type YandexQuotesResponse = {
  quotes?: YandexQuote[];
};

export type YandexLibraryCardsResponse = {
  library_cards?: YandexLibraryCard[];
};
