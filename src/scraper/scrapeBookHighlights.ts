import type { Root } from 'cheerio';

import { currentAmazonRegion } from '~/amazonRegion';
import { ee } from '~/eventEmitter';
import type { Book, Highlight } from '~/models';
import { br2ln, hash } from '~/utils';

import { loadRemoteDom } from './loadRemoteDom';

type NextPageState = {
  token: string;
  contentLimitState: string;
};

export const mapTextToColor = (highlightClasses: string): Highlight['color'] => {
  const matches = /kp-notebook-highlight-(.*)/.exec(highlightClasses);
  return matches ? (matches[1] as Highlight['color']) : null;
};

const highlightsUrl = (book: Book, state?: NextPageState): string => {
  const region = currentAmazonRegion();
  return `${region.notebookUrl}?asin=${book.asin}&contentLimitState=${
    state?.contentLimitState ?? ''
  }&token=${state?.token ?? ''}`;
};

const parseNextPageState = ($: Root): NextPageState | null => {
  const contentLimitState = $('.kp-notebook-content-limit-state').val();
  const token = $('.kp-notebook-annotations-next-page-start').val();
  return token === undefined ? null : { contentLimitState, token };
};

const parseHighlights = ($: Root): Highlight[] => {
  const highlightsEl = $('.a-row.a-spacing-base').toArray();

  return highlightsEl.map((highlightEl): Highlight => {
    const pageMatch = /\d+$/.exec($('#annotationNoteHeader', highlightEl).text());

    const highlightClasses = $('.kp-notebook-highlight', highlightEl).attr('class');
    const color = mapTextToColor(highlightClasses);

    const text = $('#highlight', highlightEl).text()?.trim();
    return {
      id: hash(text),
      text,
      color,
      location: $('#kp-annotation-location', highlightEl).val(),
      page: pageMatch ? pageMatch[0] : null,
      note: br2ln($('#note', highlightEl).html()),
    };
  });
};

const loadAndScrapeHighlights = async (book: Book, url: string) => {
  const { dom } = await loadRemoteDom(url, 0, { log: false });
  const nextPageState = parseNextPageState(dom);

  return {
    highlights: parseHighlights(dom),
    nextPageUrl: highlightsUrl(book, nextPageState),
    hasNextPage: nextPageState !== null,
  };
};

const scrapeBookHighlights = async (
  book: Book,
  isCancelled?: () => boolean
): Promise<Highlight[]> => {
  let results: Highlight[] = [];

  let url = highlightsUrl(book);
  let hasNextPage = true;
  let pageIndex = 0;

  while (hasNextPage) {
    if (isCancelled?.()) {
      break;
    }

    pageIndex++;
    ee.emit('syncLog', `Reading highlights from page ${pageIndex}…`);

    const data = await loadAndScrapeHighlights(book, url);

    ee.emit(
      'syncLog',
      `Found ${data.highlights.length} highlight${
        data.highlights.length === 1 ? '' : 's'
      } on page ${pageIndex}`
    );

    results = [...results, ...data.highlights];

    url = data.nextPageUrl;
    hasNextPage = data.hasNextPage;
  }

  return results.filter((h) => h.text || h.note);
};

export default scrapeBookHighlights;
