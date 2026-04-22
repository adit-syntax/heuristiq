// Scrape four question sheets into frontend/src/data/sheets/:
//   sde.js        - Striver SDE Sheet (takeuforward.org, Next.js flight JSON)
//   neetcode150.js + blind75.js - NeetCode 150 & Blind 75 (envico801's README,
//                     which mirrors neetcode.io lists with LC + video links)
//   tip150.js     - LeetCode Top Interview 150 (ChunhThanhDe's README table;
//                     gitbook link slugs are the LeetCode slugs)
// One-shot: node backend/scripts/scrapeSheets.mjs. No dependencies.
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
};

// Authoritative LeetCode title -> slug map, built from the CodeJeet company
// files already scraped locally (~4600 problems). Falls back to kebab-case.
const slugMap = new Map();
for (const f of readdirSync(new URL('../../frontend/src/data/companies/', import.meta.url))) {
  if (!f.endsWith('.js') || f === 'registry.js') continue;
  const mod = await import(`../../frontend/src/data/companies/${f}`);
  for (const [title, slug] of mod.QUESTIONS || []) slugMap.set(title, slug);
}
const kebab = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const lcUrl = (title) => `https://leetcode.com/problems/${slugMap.get(title) || kebab(title)}/`;

const write = (file, topics) => {
  const js = `// Auto-generated ${new Date().toISOString().slice(0, 10)} by backend/scripts/scrapeSheets.mjs.\n` +
    `// Row: { title, video, problem, companies, learn, difficulty? }.\n` +
    `export const TOPICS = ${JSON.stringify(topics, null, 2)};\n`;
  writeFileSync(new URL(`../../frontend/src/data/sheets/${file}`, import.meta.url), js);
};

const flightOf = (html) => {
  let flight = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
    try { flight += JSON.parse('"' + m[1] + '"'); } catch { /* skip bad chunk */ }
  }
  return flight;
};

// String-aware bracket scan: extract the [...] starting at/after fromIdx.
const bracketArray = (s, fromIdx) => {
  let k = s.indexOf('[', fromIdx), depth = 0;
  for (; k < s.length; k++) {
    const ch = s[k];
    if (ch === '"') { k++; while (k < s.length && (s[k] !== '"' || s[k - 1] === '\\')) k++; }
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return s.slice(s.indexOf('[', fromIdx), k + 1); }
  }
  throw new Error('unbalanced array');
};

// ---------------------------------------------------------------- 1. SDE sheet
// The page embeds its data as RSC flight chunks; unescape each, concatenate,
// then bracket-scan (string-aware) the "sections" array out of it.
const scrapeSde = async () => {
  const html = await get('https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/');
  const flight = flightOf(html);
  const start = flight.indexOf('"sections":');
  if (start < 0) throw new Error('no sections in flight data');
  const sections = JSON.parse(bracketArray(flight, start));

  const topics = sections
    .filter((s) => s.category_name && Array.isArray(s.problems) && s.problems.length > 0)
    .map((s) => ({
      id: s.category_name,
      title: s.category_name,
      rows: s.problems.map((p) => ({
        title: p.problem_name,
        video: p.youtube && !/^\$undefined$/.test(p.youtube) ? p.youtube : '',
        problem: (p.leetcode && !/^\$undefined$/.test(p.leetcode) && p.leetcode) ||
                 (p.link && !/^\$undefined$/.test(p.link) && p.link) || '',
        companies: '',
        learn: '',
        difficulty: p.difficulty && !/^\$undefined$/.test(p.difficulty) ? p.difficulty : '',
      })),
    }));
  const total = topics.reduce((n, t) => n + t.rows.length, 0);
  if (topics.length < 5 || total < 150) throw new Error(`sde: ${topics.length} topics / ${total} rows - suspicious`);
  write('sde.js', topics);
  console.log(`sde: ${total} problems in ${topics.length} sections`);
};

// ------------------------------------------- 2. NeetCode 150 + Blind 75
// Cell-based parse of envico801's README (mirrors the neetcode.io lists).
// [Ex]/[ComEx] rows are extras outside the 150; [Blind] rows are Blind 75.
const scrapeNeetcode = async () => {
  const md = await get('https://raw.githubusercontent.com/envico801/Neetcode-150-and-Blind-75/main/README.md');

  const nc = {};      // category -> rows
  const blind = {};   // category -> rows (subset marked [Blind])
  let cur = null, ncTotal = 0, blindTotal = 0;
  for (const line of md.split('\n')) {
    const h = line.match(/^### (.+)$/);
    if (h) { cur = h[1].trim(); continue; }
    if (!cur || !line.startsWith('|')) continue;
    if (/\[Ex\]|\[ComEx\]/.test(line)) continue; // extras beyond the 150

    const lcLink = line.match(/\[Link\]\((https:\/\/leetcode\.com\/problems\/[a-z0-9-]+)\/?\)/);
    const hasNeetCode = /neetcode\.io\/problems\//.test(line);
    const isBlind = /\[Blind\]/.test(line);
    if (!hasNeetCode && !isBlind) continue; // prereq/course rows

    // Title cell: prefer linked title, else raw text with markers stripped.
    const cells = line.split('|');
    const titleCell = (cells[2] || '').trim();
    const linked = titleCell.match(/\[([^\]]+)\]\(https:\/\/neetcode\.io\/problems\/[a-z0-9-]+\)/);
    const title = (linked ? linked[1] : titleCell)
      .replace(/\*\*/g, '').replace(/\[(Blind|Ex|ComEx)\]/g, '').replace(/-\s*$/, '').trim();
    const diff = (cells.find((c) => /^\s*(Easy|Medium|Hard)\s*$/.test(c)) || '').trim();
    const yt = line.match(/\[YouTube\]\((https:\/\/www\.youtube\.com\/watch\?v=[\w-]+)/);
    if (!diff) continue;

    const row = {
      title,
      video: yt ? yt[1] : '',
      problem: lcLink ? lcLink[1] : lcUrl(title),
      companies: '',
      learn: '',
      difficulty: diff,
    };
    (nc[cur] ||= []).push(row);
    ncTotal++;
    if (isBlind) { (blind[cur] ||= []).push(row); blindTotal++; }
  }

  // envico's README leaves at least one canonical Blind 75 problem
  // unmarked (Median of Two Sorted Arrays). Force-include by title.
  for (const t of ['Median of Two Sorted Arrays']) {
    if (Object.values(blind).some((rows) => rows.some((r) => r.title === t))) continue;
    for (const rows of Object.values(nc)) {
      const hit = rows.find((r) => r.title === t);
      if (hit) { const cat = Object.keys(nc).find((k) => nc[k].includes(hit)); (blind[cat] ||= []).push(hit); blindTotal++; break; }
    }
  }
  if (ncTotal < 145 || ncTotal > 155 || blindTotal < 70 || blindTotal > 80) {
    throw new Error(`neetcode: nc=${ncTotal} blind=${blindTotal} - suspicious`);
  }

  const toTopics = (map) => Object.entries(map).map(([title, rows]) => ({ id: title, title, rows }));
  write('neetcode150.js', toTopics(nc));
  write('blind75.js', toTopics(blind));
  console.log(`neetcode150: ${ncTotal} problems in ${Object.keys(nc).length} categories`);
  console.log(`blind75: ${blindTotal} problems in ${Object.keys(blind).length} categories`);
};

// -------------------------------------------------- 3. Top Interview 150
// One HTML table; section names sit in colspan rows. Only ~74 rows have
// gitbook links (author's solved subset) - slugs for the rest come from the
// title->slug map.
const scrapeTip150 = async () => {
  const md = await get('https://raw.githubusercontent.com/ChunhThanhDe/Leetcode-Top-Interview/main/README.md');
  const table = md.slice(md.indexOf('<table>'), md.lastIndexOf('</table>') + 8);
  const topics = [];
  let cur = null, total = 0, mapped = 0;
  for (const tr of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const sec = tr[1].match(/colspan[^>]*>\s*<strong>([^<]+)<\/strong>/);
    if (sec) { cur = sec[1].trim(); topics.push({ id: cur, title: cur, rows: [] }); continue; }
    if (!cur || !topics.length) continue;
    // Cells: id (numeric), title (maybe wrapped in <a>), difficulty, signal...
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].trim());
    const titleCell = cells.find((c) => c && !/^\d+$/.test(c) && !/^(Easy|Medium|Hard)$/.test(c));
    const diff = cells.find((c) => /^(Easy|Medium|Hard)$/.test(c));
    if (!titleCell || !diff) continue;
    const linked = titleCell.match(/<a[^>]*>\s*([^<]+?)\s*<\/a>/);
    const title = (linked ? linked[1] : titleCell).trim();
    const gitSlug = tr[1].match(/gitbook\.io\/[^"]*\/\d+-([a-z0-9-]+)"/);
    const slug = gitSlug ? gitSlug[1] : (slugMap.get(title) || kebab(title));
    if (!gitSlug && slugMap.has(title)) mapped++;
    topics[topics.length - 1].rows.push({
      title,
      video: '',
      problem: `https://leetcode.com/problems/${slug}/`,
      companies: '',
      learn: '',
      difficulty: diff,
    });
    total++;
  }
  if (total !== 150) throw new Error(`tip150: got ${total}, expected exactly 150`);
  write('tip150.js', topics);
  console.log(`tip150: 150 problems in ${topics.length} sections (${mapped} slugs via title map, rest from gitbook links/kebab)`);
};

mkdirSync(new URL('../../frontend/src/data/sheets/', import.meta.url), { recursive: true });
await scrapeSde();
await scrapeNeetcode();
await scrapeTip150();
console.log('\nDone.');
