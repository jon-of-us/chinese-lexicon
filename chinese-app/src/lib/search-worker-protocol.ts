import type * as DictionarySearch from './dictionary-search';

export type SearchRequest = {
  id: number;
  term: string;
  limit: number;
};

export type SearchResponse = {
  id: number;
  results: DictionarySearch.SearchEntry[];
};
