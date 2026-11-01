import searchEntriesUrl from '../generated/search-entries.json?url';
import * as DictionarySearch from './dictionary-search';
import * as SearchWorkerProtocol from './search-worker-protocol';

let entriesRequest: Promise<DictionarySearch.SearchEntry[]> | undefined;

function loadEntries() {
  entriesRequest ??= fetch(searchEntriesUrl).then((response) => {
    if (!response.ok) throw new Error(`Search data request failed with status ${response.status}`);
    return response.json() as Promise<DictionarySearch.SearchEntry[]>;
  });
  return entriesRequest;
}

self.addEventListener('message', (event: MessageEvent<SearchWorkerProtocol.SearchRequest>) => {
  const { id, term, limit } = event.data;
  loadEntries()
    .then((entries) => {
      const response: SearchWorkerProtocol.SearchResponse = { id, results: DictionarySearch.searchEntries(entries, term, limit) };
      self.postMessage(response);
    })
    .catch((error: unknown) => {
      entriesRequest = undefined;
      console.error('Dictionary search data failed to load.', error);
      const response: SearchWorkerProtocol.SearchResponse = { id, results: [], failed: true };
      self.postMessage(response);
    });
});
