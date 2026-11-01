import * as FileSystem from 'node:fs';
import * as Path from 'node:path';
import * as Url from 'node:url';

// The entry chunk must stay small so the dictionary keeps loading on demand; a regression here means something statically imports dictionary data.
const appDirectory = Path.resolve(Path.dirname(Url.fileURLToPath(import.meta.url)), '..');
const distDirectory = Path.join(appDirectory, 'dist');
const entryBudgetBytes = 250 * 1024;

const html = FileSystem.readFileSync(Path.join(distDirectory, 'index.html'), 'utf8');
const entrySrc = html.match(/<script type="module" crossorigin src="\/(assets\/index-[^"]+\.js)"/)?.[1];
if (!entrySrc) throw new Error('Entry chunk not found in dist/index.html');

const entrySize = FileSystem.statSync(Path.join(distDirectory, entrySrc)).size;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(`Entry chunk ${entrySrc}: ${kb(entrySize)} (budget ${kb(entryBudgetBytes)})`);

if (entrySize > entryBudgetBytes) {
  console.error('Entry chunk exceeds budget. Check for static imports of dictionary data.');
  process.exit(1);
}
