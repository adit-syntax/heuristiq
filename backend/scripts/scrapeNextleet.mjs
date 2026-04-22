// Scrape nextleet.com company questions (public Appwrite collection) into
// frontend/src/data/companies/ (merged into the registry).
// One-shot: node backend/scripts/scrapeNextleet.mjs
//
// Their SPA reads Appwrite directly with the public project id; anonymous
// document reads are allowed, so we can paginate the collection with plain
// REST + cursor offsets.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
const PROJECT = '682a63b1002d7f6e6e93';
const DB = '682e3e8a00262227c2fd';
const COL = '6844349400259e35ef83'; // company -> questions bank
const OUT_DIR = new URL('../../frontend/src/data/companies/', import.meta.url);
const REGISTRY = new URL('../../frontend/src/data/companies/registry.js', import.meta.url);

const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'X-Appwrite-Project': PROJECT, Origin: 'https://nextleet.com' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

// The API silently caps page size (25 for plain lists, 100 for ordered), so
// cursor-paginate by the unique $id.
const q = async (queries) => {
  const qs = queries.map((x) => 'queries[]=' + encodeURIComponent(JSON.stringify(x))).join('&');
  return get(`https://fra.cloud.appwrite.io/v1/databases/${DB}/collections/${COL}/documents?limit=100&${qs}`);
};

const docs = [];
let cursor = null;
for (let page = 0; page < 400; page++) {
  const queries = [{ method: 'orderAsc', attribute: '$id' }];
  if (cursor) queries.push({ method: 'cursorAfter', values: [cursor] });
  const j = await q(queries);
  if (j.documents.length === 0) break;
  docs.push(...j.documents);
  cursor = j.documents[j.documents.length - 1].$id;
  if (docs.length >= j.total) break;
  await new Promise((r) => setTimeout(r, 150));
}
if (docs.length < 1000) throw new Error(`only ${docs.length} docs - suspicious`);
console.log(`fetched ${docs.length} docs`);

// Group by company. Row: [title, lcSlug, 0/1/2 difficulty, topicsCsv, freq%]
const byCompany = new Map();
for (const d of docs) {
  if (!d.companyName || !d.titleSlug) continue;
  if (!byCompany.has(d.companyName)) byCompany.set(d.companyName, []);
  const freq = Math.round(d.cumulativeFrequency ?? 0);
  byCompany.get(d.companyName).push([
    d.title,
    d.titleSlug,
    d.difficulty === 0 ? 0 : d.difficulty === 1 ? 1 : 2,
    (d.topics || []).join(','),
    freq,
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

// Load registry to merge.
let registry = [];
if (existsSync(REGISTRY)) {
  const src = readFileSync(REGISTRY, 'utf8');
  const m = src.match(/COMPANY_REGISTRY = ([\s\S]*?);\n/);
  if (m) registry = JSON.parse(m[1]);
}
const bySlug = new Map(registry.map((c) => [c.slug, c]));

let added = 0, replaced = 0, skipped = 0;
for (const [name, rows] of byCompany) {
  if (rows.length < 3) { skipped++; continue; } // noise: 1-2 question groups
  const slug = `nl-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/-+$/, '');
  const counts = [0, 0, 0];
  rows.forEach((r) => counts[r[2]]++);
  writeFileSync(new URL(`${slug}.js`, OUT_DIR),
    `// Auto-generated from nextleet.com (${new Date().toISOString().slice(0, 10)}).\n` +
    `// Row: [title, leetCodeSlug, 0=easy 1=medium 2=hard, topicsCsv, frequencyPct]. Regenerate: node backend/scripts/scrapeNextleet.mjs\n` +
    `export const QUESTIONS = ${JSON.stringify(rows)};\n`);
  const entry = { id: `nl:${slug}`, slug, name, total: rows.length, easy: counts[0], medium: counts[1], hard: counts[2], source: 'nextleet' };
  if (bySlug.has(slug)) { bySlug.set(slug, entry); replaced++; }
  else { bySlug.set(slug, entry); added++; }
  console.log(`${name}: ${rows.length} (${counts[0]}E ${counts[1]}M ${counts[2]}H)`);
}

if (added + replaced < 5) throw new Error(`only ${added + replaced} companies - suspicious`);

const merged = [...bySlug.values()];
writeFileSync(REGISTRY,
  `// Auto-generated (${new Date().toISOString().slice(0, 10)}). Sources: codejeet.com + hynts.in + nextleet.com\n` +
  `export const COMPANY_REGISTRY = ${JSON.stringify(merged, null, 2)};\n`);
console.log(`\nRegistry: ${merged.length} companies (${added} added, ${replaced} replaced, ${skipped} tiny groups skipped).`);
