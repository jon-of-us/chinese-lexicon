import dictionaryEntriesFile from '../../../chinese-dataset/dictionary/entries.json';
import * as DictionarySearch from './dictionary-search';
import * as SearchWorkerProtocol from './search-worker-protocol';

const entries = dictionaryEntriesFile.entries as DictionarySearch.SearchEntry[];

self.addEventListener('message', (event: MessageEvent<SearchWorkerProtocol.SearchRequest>) => {
  const { id, term, limit } = event.data;
  const results = DictionarySearch.searchEntries(entries, term, limit);
  const response: SearchWorkerProtocol.SearchResponse = { id, results };
  self.postMessage(response);
});
