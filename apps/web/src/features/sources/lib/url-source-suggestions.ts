export interface UrlSourceSuggestion {
  readonly label: string;
  readonly url: string;
}

export const URL_SOURCE_SUGGESTIONS: readonly UrlSourceSuggestion[] = [
  {
    label: 'U.S. Census Bureau News',
    url: 'https://www.census.gov/newsroom.html',
  },
  { label: 'CDC Newsroom', url: 'https://www.cdc.gov/media/index.html' },
  { label: 'NASA News', url: 'https://www.nasa.gov/news-release/' },
  { label: 'NIST News', url: 'https://www.nist.gov/news-events/news' },
  {
    label: 'SEC Press Releases',
    url: 'https://www.sec.gov/news/pressreleases',
  },
  {
    label: 'Federal Reserve Press Releases',
    url: 'https://www.federalreserve.gov/newsevents/pressreleases.htm',
  },
  { label: 'World Bank News', url: 'https://www.worldbank.org/en/news' },
  { label: 'OECD Newsroom', url: 'https://www.oecd.org/newsroom/' },
  { label: 'UN News', url: 'https://news.un.org/en/' },
  { label: 'WHO News', url: 'https://www.who.int/news' },
];

export const getRandomUrlSourceSuggestions = (
  count: number,
): UrlSourceSuggestion[] => {
  if (count <= 0) return [];

  const items = [...URL_SOURCE_SUGGESTIONS];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
  }

  return items.slice(0, Math.min(count, items.length));
};
