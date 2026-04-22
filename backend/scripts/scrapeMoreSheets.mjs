// Scrape four more sheets into frontend/src/data/sheets/:
//   cp.js     - Striver CP Sheet (takeuforward.org flight JSON, 297 problems)
//   sql.js    - Striver SQL problems (takeuforward.org /plus/sql/all-problems,
//               server-rendered problem bank; the classic 50-list is plus-gated)
//   cp31.js   - TLE Eliminators CP-31, rating-wise (GitHub solutions repo tree
//               for names+ratings, Codeforces API for links)
//   cses.js   - CSES Problem Set (cses.fi/problemset HTML, 300 problems)
// One-shot: node backend/scripts/scrapeMoreSheets.mjs. No dependencies.
import { writeFileSync, mkdirSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
};

const write = (file, topics) => {
  const js = `// Auto-generated ${new Date().toISOString().slice(0, 10)} by backend/scripts/scrapeMoreSheets.mjs.\n` +
    `// Row: { title, video, problem, code?, companies, learn, difficulty? }.\n` +
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

// ------------------------------------------------- 1. Striver CP sheet
// Same flight format as the SDE sheet: sections -> problems. The `leetcode`
// field carries the real link (mostly codeforces.com) and `link` often too.
const scrapeCp = async () => {
  const html = await get('https://takeuforward.org/competitive-programming/strivers-cp-sheet/');
  const flight = flightOf(html);
  const start = flight.indexOf('"sections":');
  if (start < 0) throw new Error('cp: no sections in flight data');
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
  if (topics.length < 10 || total < 200) throw new Error(`cp: ${topics.length} topics / ${total} rows - suspicious`);
  const withLinks = topics.reduce((n, t) => n + t.rows.filter((r) => r.problem).length, 0);
  write('cp.js', topics);
  console.log(`cp: ${total} problems in ${topics.length} sections (${withLinks} with links)`);
};

// ---------------------------------------------- 2. Striver SQL problems
// The classic 50-question list is client-rendered behind TUF plus; the
// server-rendered problem bank on /plus/sql/all-problems is what's public.
const scrapeSql = async () => {
  const html = await get('https://takeuforward.org/plus/sql/all-problems');
  const flight = flightOf(html);
  const i = flight.indexOf('"problems":');
  if (i < 0) throw new Error('sql: no problems in flight data');
  const problems = JSON.parse(bracketArray(flight, i));
  if (problems.length < 15) throw new Error(`sql: only ${problems.length} - suspicious`);

  const topics = [{ id: 'SQL Problems', title: 'SQL Problems', rows: problems.map((p) => ({
    title: p.problem_name,
    video: '',
    problem: `https://takeuforward.org/plus/sql/problems/${p.problem_slug}`,
    companies: (p.companies || []).join(', '),
    learn: (p.topics || []).join(', '),
    difficulty: p.difficulty || '',
  })) }];
  write('sql.js', topics);
  console.log(`sql: ${problems.length} problems`);
};

// ------------------------------------------------ 3. TLE CP-31 (rating-wise)
// virajchandra51/TLE_CP_31 organises solutions as "<rating>/<nn> - <name>.cpp";
// Codeforces' public API resolves names to URLs (and verifies the rating).
const scrapeCp31 = async () => {
  const tree = JSON.parse(await get('https://api.github.com/repos/virajchandra51/TLE_CP_31/git/trees/main?recursive=1'));
  const buckets = new Map(); // rating -> [{ name, path }]
  for (const t of tree.tree) {
    const m = String(t.path).match(/^(\d{3,4})\/\d+ - (.+)\.cpp$/);
    if (m) {
      const rating = Number(m[1]);
      if (!buckets.has(rating)) buckets.set(rating, []);
      buckets.get(rating).push({ name: m[2].trim(), path: t.path });
    }
  }
  if (buckets.size < 8) throw new Error(`cp31: ${buckets.size} rating buckets - suspicious`);

  const cf = JSON.parse(await get('https://codeforces.com/api/problemset.problems')).result.problems;
  // Aggressive fold: lowercase, Cyrillic lookalikes -> Latin, strip all
  // non-alphanumerics. Handles repo-name quirks ("Chewbaсha" with a Cyrillic
  // с, missing punctuation like "A Perfectly Balanced String?").
  const CYR = { а: 'a', в: 'b', с: 'c', е: 'e', н: 'h', к: 'k', м: 'm', о: 'o', р: 'p', т: 't', у: 'y', х: 'x' };
  const norm = (s) => String(s).toLowerCase()
    .replace(/[а-яё]/g, (c) => CYR[c] || '')
    .replace(/[^a-z0-9]/g, '');
  const byName = new Map();
  for (const p of cf) {
    const k = norm(p.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(p);
  }
  const cfUrl = (p) => `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
  const blobUrl = (path) => `https://github.com/virajchandra51/TLE_CP_31/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;

  const topics = [...buckets.keys()].sort((a, b) => a - b).map((rating) => ({
    id: String(rating),
    title: `Rating ${rating}`,
    rows: buckets.get(rating).map(({ name, path }) => {
      const cands = byName.get(norm(name)) || [];
      // Prefer the candidate whose rating matches the bucket; else first.
      const hit = cands.find((p) => p.rating === rating) || cands[0];
      return {
        title: name.replace(/_/g, ' '),
        video: '',
        problem: hit ? cfUrl(hit) : '',
        // Code link to the solution file (TLE's own hints/videos are login-gated).
        code: blobUrl(path),
        companies: '',
        learn: '',
        difficulty: '',
      };
    }),
  }));
  const total = topics.reduce((n, t) => n + t.rows.length, 0);
  const linked = topics.reduce((n, t) => n + t.rows.filter((r) => r.problem).length, 0);
  if (total < 200 || linked < total * 0.9) throw new Error(`cp31: ${total} rows, only ${linked} linked - suspicious`);
  write('cp31.js', topics);
  console.log(`cp31: ${total} problems in ${topics.length} rating buckets (${linked} linked to Codeforces)`);
};

// ----------------------------------------------------------- 4. CSES
const scrapeCses = async () => {
  const html = await get('https://cses.fi/problemset/');
  const topics = [];
  let cur = null, total = 0;
  for (const m of html.matchAll(/<h2>([^<]+)<\/h2>|href="\/problemset\/task\/(\d+)">([^<]+)<\/a>/g)) {
    if (m[1]) { cur = m[1].trim(); topics.push({ id: cur, title: cur, rows: [] }); continue; }
    if (!cur || !topics.length) continue;
    topics[topics.length - 1].rows.push({
      title: m[3].trim(),
      video: '',
      problem: `https://cses.fi/problemset/task/${m[2]}/`,
      companies: '',
      learn: '',
      difficulty: '',
    });
    total++;
  }
  if (total < 250 || topics.length < 15) throw new Error(`cses: ${total} rows / ${topics.length} sections - suspicious`);
  const nonEmpty = topics.filter((t) => t.rows.length > 0);
  write('cses.js', nonEmpty);
  console.log(`cses: ${total} problems in ${nonEmpty.length} sections`);
};

mkdirSync(new URL('../../frontend/src/data/sheets/', import.meta.url), { recursive: true });
await scrapeCp();
await scrapeSql();
await scrapeCp31();
await scrapeCses();
console.log('\nDone.');
