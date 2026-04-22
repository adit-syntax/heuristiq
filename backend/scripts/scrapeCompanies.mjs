// Scrape codejeet.com company question lists into frontend/src/data/companies/.
// One-shot: node scripts/scrapeCompanies.mjs [maxCompanies=30]
//
// codejeet.com has no public API (their /developers page sanctions scraping
// HTML pages; robots.txt only disallows /data/ and /api/). Each
// /company/{slug} page server-renders the full question table sorted by
// interview frequency; parse it with regex. One file per company so the
// browser only downloads the sheet being viewed.
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://codejeet.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX = Number(process.argv[2] || 30);

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

// Company list page: ordered by question count, so the first MAX are the
// ones worth tracking.
const listHtml = await get(`${BASE}/companies`);
const seen = new Set();
const slugs = [];
for (const m of listHtml.matchAll(/href="\/company\/([a-z0-9-]+)"/g)) {
  if (!seen.has(m[1])) { seen.add(m[1]); slugs.push(m[1]); }
}
if (slugs.length < 10) throw new Error(`only ${slugs.length} companies found on /companies`);
slugs.length = Math.min(slugs.length, MAX);

const parse = (html) => {
  const name = html.match(/<title>(.+?) Interview Questions/)?.[1];
  // Title count is the cross-check that the table rendered every row.
  const declared = Number(html.match(/(\d+) LeetCode Problems/)?.[1] || 0);
  const rows = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cell = tr[1];
    const q = cell.match(/href="\/problem\/([a-z0-9-]+)">([^<]+)<\/a>/);
    if (!q) continue;
    // Difficulty is the only span whose whole content is the word itself.
    const diff = cell.match(/<span[^>]*>\s*(Easy|Medium|Hard)\s*<\/span>/)?.[1];
    // Two percentage cells per row: acceptance, then frequency.
    const pcts = [...cell.matchAll(/>\s*(\d+(?:\.\d+)?)\s*%</g)].map((m) => Number(m[1]));
    const topics = [...cell.matchAll(/<span class="rounded bg-muted [^"]*">([^<]+)<\/span>/g)].map((m) => m[1].trim());
    if (!diff) continue;
    rows.push([q[2].trim(), q[1], diff === 'Easy' ? 0 : diff === 'Medium' ? 1 : 2, topics.join(','), pcts[1] ?? 0]);
  }
  return { name, declared, rows };
};

mkdirSync(new URL('../../frontend/src/data/companies/', import.meta.url), { recursive: true });
const registry = [];

for (const slug of slugs) {
  try {
    const { name, declared, rows } = parse(await get(`${BASE}/company/${slug}`));
    if (!name || rows.length === 0) throw new Error('no rows parsed');
    if (declared && rows.length !== declared) throw new Error(`parsed ${rows.length} != declared ${declared}`);
    const counts = [0, 0, 0];
    rows.forEach((r) => counts[r[2]]++);
    writeFileSync(new URL(`../../frontend/src/data/companies/${slug}.js`, import.meta.url),
      `// Auto-generated from codejeet.com/company/${slug} (${new Date().toISOString().slice(0, 10)}).\n` +
      `// Row: [title, leetCodeSlug, 0=easy 1=medium 2=hard, topicsCsv, frequencyPct]. Regenerate: node backend/scripts/scrapeCompanies.mjs\n` +
      `export const QUESTIONS = ${JSON.stringify(rows)};\n`);
    registry.push({ id: `cj:${slug}`, slug, name, total: rows.length, easy: counts[0], medium: counts[1], hard: counts[2] });
    console.log(`${name}: ${rows.length} (${counts[0]}E ${counts[1]}M ${counts[2]}H)`);
  } catch (e) {
    console.error(`${slug}: SKIPPED - ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

if (registry.length < 10) {
  console.error(`only ${registry.length} companies scraped - aborting`);
  process.exit(1);
}
writeFileSync(new URL('../../frontend/src/data/companies/registry.js', import.meta.url),
  `// Auto-generated from codejeet.com (${new Date().toISOString().slice(0, 10)}). Regenerate: node backend/scripts/scrapeCompanies.mjs\n` +
  `export const COMPANY_REGISTRY = ${JSON.stringify(registry, null, 2)};\n`);
console.log(`\nWrote ${registry.length} companies to frontend/src/data/companies/.`);
