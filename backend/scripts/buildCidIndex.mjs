// Build frontend/src/data/companies/cidIndex.js: canonical key -> company ids.
// Lets the Companies grid count solved questions per company without loading
// every company file at runtime (marks made anywhere - sheets or other
// companies - reflect on every company card).
// Canonical keys mirror src/lib/canonical.js: lc:<slug>, cf:<contestId><idx>,
// gfg:<slug>. Company rows currently carry LeetCode slugs or raw platform
// URLs in the slug column; both are normalised here.
// One-shot: node backend/scripts/buildCidIndex.mjs (run after any company scraper)
import { writeFileSync, readdirSync, readFileSync } from 'node:fs';

const DIR = new URL('../../frontend/src/data/companies/', import.meta.url);

// Registry: slug -> id
const src = readFileSync(new URL('registry.js', DIR), 'utf8');
const registry = JSON.parse(src.match(/COMPANY_REGISTRY = ([\s\S]*?);\n/)[1]);
const slugToId = new Map(registry.map((c) => [c.slug, c.id]));

/** Row slug column may be a LeetCode slug, a full platform URL, or empty. */
const rowKey = (slug) => {
  if (!slug) return null;
  const s = String(slug);
  if (/^https?:\/\//.test(s)) {
    const lc = s.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
    if (lc) return `lc:${lc[1]}`;
    const cf = s.match(/codeforces\.com\/(?:problemset|contest)\/problem\/(\d+)\/([A-Za-z0-9]+)/i);
    if (cf) return `cf:${cf[1]}${cf[2]}`;
    const gfg = s.match(/geeksforgeeks\.org\/problems\/([a-z0-9-]+)/i);
    if (gfg) return `gfg:${gfg[1]}`;
    return null;
  }
  return `lc:${s}`;
};

const index = {}; // canonical key -> [companyId, ...]
let entries = 0;

for (const f of readdirSync(DIR)) {
  if (!f.endsWith('.js') || f === 'registry.js' || f === 'cidIndex.js') continue;
  const companyId = slugToId.get(f.replace(/\.js$/, ''));
  if (!companyId) continue;
  const mod = await import(`../../frontend/src/data/companies/${f}`);
  for (const [title, slug] of mod.QUESTIONS || []) {
    const key = rowKey(slug);
    if (!key) continue;
    (index[key] ||= []);
    if (!index[key].includes(companyId)) index[key].push(companyId);
    entries++;
  }
}

if (entries < 5000) throw new Error(`only ${entries} entries - suspicious`);
writeFileSync(new URL('cidIndex.js', DIR),
  `// Auto-generated (${new Date().toISOString().slice(0, 10)}) by backend/scripts/buildCidIndex.mjs.\n` +
  `// Canonical question key (lc:/cf:/gfg:) -> company ids carrying that question.\n` +
  `export const CID_INDEX = ${JSON.stringify(index)};\n`);
console.log(`Index: ${Object.keys(index).length} canonical keys -> ${entries} company links across ${registry.length} companies.`);
