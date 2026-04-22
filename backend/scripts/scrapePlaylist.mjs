// Scrape Striver's A2Z playlist (all pages) into frontend/src/data/a2zPlaylist.js.
// One-shot: node backend/scripts/scrapePlaylist.mjs
import { writeFileSync } from 'node:fs';

const PLAYLIST_ID = 'PLgUwDviBIf0rPG3Ictpu74YWBQ1CaBkm2';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

const decode = (s) => s
  .replace(/\\u0026/g, '&').replace(/\\u003d/g, '=').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
  .replace(/\\"/g, '"').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const videos = [];
let page = '';
let next = `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`;

while (next) {
  const html = decode(await get(next));
  // Each video row carries its id + title; ids are 11 chars.
  for (const m of html.matchAll(/"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g)) {
    const id = m[1];
    const title = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (!videos.some((v) => v.id === id)) videos.push({ id, title });
  }
  // Pagination: a continuation token, if any.
  const tok = html.match(/"continuationCommand":\{"token":"([^"]+)"/)?.[1];
  next = tok ? `https://www.youtube.com/playlist?list=${PLAYLIST_ID}&ctoken=${tok}` : '';
  if (next) await new Promise((r) => setTimeout(r, 500));
}

if (videos.length < 100) throw new Error(`only ${videos.length} videos - suspicious`);

const js = `// Auto-generated from the Striver A2Z YouTube playlist (${new Date().toISOString().slice(0, 10)}).\n` +
  `// Regenerate: node backend/scripts/scrapePlaylist.mjs\n` +
  `export const A2Z_PLAYLIST = ${JSON.stringify(videos, null, 2)};\n`;
writeFileSync(new URL('../../frontend/src/data/a2zPlaylist.js', import.meta.url), js);
console.log(`Wrote ${videos.length} videos.`);
