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
  cover?: YandexImage;
  name?: string;
  title?: string;
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
  audiobook?: YandexBook;
  book?: YandexBook;
  comicbook?: YandexBook;
  reading_progress?: number;
  state?: string;
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
