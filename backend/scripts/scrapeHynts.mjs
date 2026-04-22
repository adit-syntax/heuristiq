// Scrape hynts.in company-wise DSA sheets into frontend/src/data/companies/.
// Merges with the existing registry (CodeJeet data stays; hynts companies are
// added/replaced by slug). Run AFTER scrapeCompanies.mjs.
//
// Each company page (Astro SSG) embeds its full question list as serialized
// props in a <astro-island> tag: question_name, tags, platform_name,
// platform_link, difficulty, question_popularity. Parse with regex.
// One-shot: node backend/scripts/scrapeHynts.mjs
import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BASE = 'https://hynts.in/preparation/company-wise-dsa-sheet';
const OUT_DIR = new URL('../../frontend/src/data/companies/', import.meta.url);

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

const unescapeHtml = (s) => s
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Company slugs from the index page.
const indexHtml = await get(`${BASE}/`);
const slugs = [...new Set([...indexHtml.matchAll(/\/([a-z0-9-]+)-dsa-interview-questions/g)].map((m) => m[1]))]
  .filter((s) => s !== 'company-wise'); // the index links to itself
if (slugs.length < 20) throw new Error(`only ${slugs.length} companies found - suspicious`);

// Pretty company name from the slug ("de-shaw" -> "DE Shaw").
const prettyName = (slug) => {
  const acronyms = new Set(['tcs', 'hcl', 'hsbc']);
  return slug.split('-')
    .map((w) => acronyms.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

mkdirSync(OUT_DIR, { recursive: true });

// Load the existing registry (CodeJeet data) to merge into.
const registryPath = new URL('../../frontend/src/data/companies/registry.js', import.meta.url);
let registry = [];
if (existsSync(registryPath)) {
  // The registry is generated JS with a single export; eval-free parse via
  // dynamic import is not possible for a file that imports nothing else.
  const src = (await import('node:fs')).readFileSync(registryPath, 'utf8');
  const m = src.match(/COMPANY_REGISTRY = ([\s\S]*?);\n/);
  if (m) registry = JSON.parse(m[1]);
}
const bySlug = new Map(registry.map((c) => [c.slug, c]));
const existingFiles = new Set(readdirSync(OUT_DIR).filter((f) => f.endsWith('.js')));

let added = 0, replaced = 0, failed = 0;

for (const slug of slugs) {
  try {
    const html = await get(`${BASE}/${slug}-dsa-interview-questions`);
    // Pull the questions array out of the astro-island props. The props are
    // HTML-escaped JSON-ish; the questions live in one big run.
    const dec = unescapeHtml(html);
    const qi = dec.indexOf('"questions"');
    if (qi < 0) throw new Error('no questions prop');

    // Grab question objects by walking "index".."question_name".."platform_link".."difficulty".."question_popularity" runs.
    const rows = [];
    const objRe = /"question_name":\[0,"([^"]+)"\][\s\S]*?"tags":\[1,\[([\s\S]*?)\]\][\s\S]*?"platform_name":\[0,"([^"]+)"\][\s\S]*?"platform_link":\[0,"([^"]+)"\][\s\S]*?"difficulty":\[0,"([^"]+)"\][\s\S]*?"question_popularity":\[0,"([^"]+)"\]/g;
    for (const m of dec.matchAll(objRe)) {
      const name = m[1];
      const tags = [...m[2].matchAll(/\[0,"([^"]*)"\]/g)].map((t) => t[1]).join(',');
      const link = m[4];
      const diff = m[5];
      const pop = m[6];
      const lcSlug = link.match(/leetcode\.com\/problems\/([a-z0-9-]+)/)?.[1] || '';
      rows.push([name, lcSlug, diff === 'Easy' ? 0 : diff === 'Medium' ? 1 : 2, tags, pop]);
    }
    if (rows.length < 5) throw new Error(`only ${rows.length} questions parsed`);

    // Dedupe by name (pages sometimes repeat).
    const seen = new Set();
    const uniq = rows.filter((r) => (seen.has(r[0]) ? false : (seen.add(r[0]), true)));

    const name = prettyName(slug);
    const counts = [0, 0, 0];
    uniq.forEach((r) => counts[r[2]]++);

    writeFileSync(new URL(`hynts-${slug}.js`, OUT_DIR),
      `// Auto-generated from hynts.in (${new Date().toISOString().slice(0, 10)}).\n` +
      `// Row: [title, leetCodeSlug, 0=easy 1=medium 2=hard, topicsCsv, popularity]. Regenerate: node backend/scripts/scrapeHynts.mjs\n` +
      `export const QUESTIONS = ${JSON.stringify(uniq)};\n`);

    const entry = { id: `hynts:${slug}`, slug: `hynts-${slug}`, name, total: uniq.length, easy: counts[0], medium: counts[1], hard: counts[2], source: 'hynts' };
    if (bySlug.has(entry.slug)) { bySlug.set(entry.slug, entry); replaced++; }
    else { bySlug.set(entry.slug, entry); added++; }
    console.log(`${name}: ${uniq.length} questions (${counts[0]}E ${counts[1]}M ${counts[2]}H)`);
  } catch (e) {
    failed++;
    console.error(`${slug}: SKIPPED - ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 350));
}

if (added + replaced < 15) throw new Error(`only ${added + replaced} companies written - suspicious`);

const merged = [...bySlug.values()];
writeFileSync(registryPath,
  `// Auto-generated (${new Date().toISOString().slice(0, 10)}). Sources: codejeet.com (node backend/scripts/scrapeCompanies.mjs) + hynts.in (node backend/scripts/scrapeHynts.mjs)\n` +
  `export const COMPANY_REGISTRY = ${JSON.stringify(merged, null, 2)};\n`);
console.log(`\nRegistry: ${merged.length} companies (${added} added, ${replaced} replaced, ${failed} failed).`);
