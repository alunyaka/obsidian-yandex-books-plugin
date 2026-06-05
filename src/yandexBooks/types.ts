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
  annotation?: string;
  authors?: YandexPerson[] | YandexPerson;
  authors_objects?: YandexPerson[] | YandexPerson;
  copyright_holder?: string;
  cover?: YandexImage;
  description?: string;
  editor_annotation?: string;
  imprint?: string;
  init_uuid?: string;
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
  publishers?: YandexPerson[] | YandexPerson | string[] | string;
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
  accessed_at?: number | string;
  added_at?: number | string;
  audiobook?: YandexBook;
  book?: YandexBook;
  chapter_uuid?: string;
  completed_at?: number | string;
  completed_on?: number | string;
  comicbook?: YandexBook;
  date_finished?: number | string;
  document_uuid?: string;
  finished_at?: number | string;
  finished_on?: number | string;
  last_read_at?: number | string;
  progress?: number;
  read_at?: number | string;
  read_date?: number | string;
  read_state?: string;
  reading_status?: string;
  reading_progress?: number;
  started_at?: number | string;
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
