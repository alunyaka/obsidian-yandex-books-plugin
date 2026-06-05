import type { TFile } from 'obsidian';

export type Book = {
  id: string;
  title: string;
  author: string;
  url?: string;
  imageUrl?: string;
  lastAnnotatedDate?: Date;
};

export type Highlight = {
  id: string;
  text: string;
  location?: string;
  page?: string;
  note?: string;
  color?: 'pink' | 'blue' | 'yellow' | 'orange';
  createdDate?: Date;
};

export type BookHighlight = {
  book: Book;
  highlights: Highlight[];
  metadata?: BookMetadata;
};

export type BookMetadata = {
  isbn?: string;
  pages?: string;
  publicationDate?: string;
  publisher?: string;
  authorUrl?: string;
};

export type SyncMode = 'yandex-books';

export type YandexBooksFrontmatter = {
  bookId: string;
  title: string;
  author: string;
  bookUrl?: string;
  lastAnnotatedDate?: string; // Not set for My Clipping annotations
  bookImageUrl?: string;
  highlightsCount: number;
};

export type SyncedBookFile = {
  file: TFile;
  frontmatter: YandexBooksFrontmatter;
  book?: Book;
};
