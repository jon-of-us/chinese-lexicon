import { createReadStream, createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import getHSKLevel from '../chinese/dong-chinese/statistics/hsk.js';

const dataDir = new URL('./tatoeba/', import.meta.url);
const path = (name) => new URL(name, dataDir).pathname;

async function lines(file) {
  const input = file.endsWith('.bz2')
    ? spawn('bzip2', ['-dc', file], { stdio: ['ignore', 'pipe', 'inherit'] }).stdout
    : createReadStream(file);
  return createInterface({ input, crlfDelay: Infinity });
}

const cmn = new Map();
for await (const line of await lines(path('cmn_sentences.tsv.bz2'))) {
  const [id, lang, text] = line.split('\t');
  if (lang === 'cmn' && getHSKLevel(text) >= 1 && getHSKLevel(text) <= 3) cmn.set(id, text);
}

const english = new Map();
for await (const line of await lines(path('eng_sentences.tsv.bz2'))) {
  const [id, lang, text] = line.split('\t');
  if (lang === 'eng') english.set(id, text);
}

const audio = new Map();
for await (const line of await lines(path('sentences_with_audio.csv'))) {
  const [sentenceId, audioId, username, license, attributionUrl] = line.split('\t');
  if (cmn.has(sentenceId) && !audio.has(sentenceId)) audio.set(sentenceId, { audioId, username, license, attributionUrl });
}

const candidates = new Map();
for (const id of audio.keys()) candidates.set(id, []);
for await (const line of await lines(path('links.csv'))) {
  const [from, to] = line.split('\t');
  if (candidates.has(from) && english.has(to)) candidates.get(from).push([to, english.get(to)]);
}

const output = createWriteStream(path('hsk1-3_cmn_eng_audio.tsv'));
output.write('sentence_id\thsk_level\tchinese\tenglish_id\tenglish\taudio_id\taudio_url\taudio_user\taudio_license\taudio_attribution_url\n');
let count = 0;
for (const [id, translations] of candidates) {
  if (!translations.length) continue;
  const a = audio.get(id);
  const [englishId, englishText] = translations[0];
  const fields = [id, getHSKLevel(cmn.get(id)), cmn.get(id), englishId, englishText, a.audioId, `https://tatoeba.org/audio/download/${a.audioId}`, a.username, a.license, a.attributionUrl];
  output.write(fields.map((x) => String(x ?? '').replaceAll('\t', ' ').replaceAll('\n', ' ')).join('\t') + '\n');
  count++;
}
output.end();
await new Promise((resolve) => output.on('finish', resolve));
console.log(`Matched ${count} Mandarin Chinese sentences.`);
