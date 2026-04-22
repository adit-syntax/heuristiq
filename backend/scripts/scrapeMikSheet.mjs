// Scrape every tab of the CodeStoryWithMIK sheet into frontend/src/data/mikSheet.js.
// One-shot: node backend/scripts/scrapeMikSheet.mjs
//
// The sheet stores most links as cell hyperlinks, which the CSV/gviz exports
// flatten to the word "LINK". The xlsx export keeps them as relationship
// targets, so we parse the workbook directly: a minimal zip reader (zlib
// inflateRaw) + regex XML extraction. No dependencies.
import { writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const DOC_ID = '1LO1BLTebhrcRfEpPjIOutKvOFSFaFM3Ph1EjA12x_zE';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ---------------------------------------------------------------- mini zip
function unzip(buf) {
  // Find End Of Central Directory (scan backwards; comment can be up to 64k).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip');

  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16); // central directory offset

  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

    // Local header: fixed 30 bytes + name + extra (lengths can differ from CD).
    const lhNameLen = buf.readUInt16LE(localOff + 26);
    const lhExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lhNameLen + lhExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    files.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));

    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

// ---------------------------------------------------------------- mini xml
const txt = (xml) => xml
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');

const colIndex = (letters) => [...letters].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;

function parseSheet(xml, shared) {
  // Cell ref -> { value, link? } per row.
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cm of rowMatch[1].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*?t="(\w+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
      const col = colIndex(cm[1]);
      const type = cm[2];
      const inner = cm[3];
      let value = '';
      const v = inner.match(/<v>([\s\S]*?)<\/v>/);
      if (v) {
        if (type === 's') value = shared[Number(v[1])] ?? '';
        else value = txt(v[1]);
      } else if (type === 'inlineStr') {
        value = txt([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
      }
      cells[col] = value;
    }
    rows.push(cells);
  }

  // Hyperlink map for this sheet: cell ref -> rId. Attribute order in the
  // export is r:id then ref, but capture each independently to be safe.
  const links = new Map();
  for (const tag of xml.matchAll(/<hyperlink\b[^>]*\/?>/g)) {
    const ref = tag[0].match(/ref="([A-Z]+\d+)"/)?.[1];
    const rId = tag[0].match(/r:id="(rId\d+)"/)?.[1];
    if (ref && rId) links.set(ref, rId);
  }
  return { rows, links };
}

// ---------------------------------------------------------------- scrape
// Column layouts differ per tab (Dijkstra tab: Question|YouTube|Link, most
// others: Question|Problem Link|YouTube|GitHub|Company Tags|Learn). Map
// columns by header text, not fixed position.

const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');

// Header fragment -> field, matched by substring on normalized header text.
const HEADER_MATCH = [
  ['question', 'question'],
  ['problem', 'problem'],
  ['youtube', 'video'],
  ['github', 'github'],
  ['company', 'companies'],
  ['learn', 'learn'],
];

const res = await fetch(`https://docs.google.com/spreadsheets/d/${DOC_ID}/export?format=xlsx`, {
  headers: { 'User-Agent': UA },
});
if (!res.ok) throw new Error(`xlsx export HTTP ${res.status}`);
const zip = unzip(Buffer.from(await res.arrayBuffer()));

const read = (name) => zip.get(name)?.toString('utf8') ?? '';
const relsXml = read('xl/_rels/workbook.xml.rels');
const relTarget = new Map(
  [...relsXml.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"[^>]*\/>/g)]
    .map((m) => [m[1], m[2].replace(/^\/+/, '')])
);

// Shared string table.
const shared = [];
for (const si of read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  shared.push(txt([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
}

// Sheet name -> worksheet file.
const sheets = [...read('xl/workbook.xml').matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"/g)]
  .map((m) => ({ name: txt(m[1]), file: relTarget.get(m[2]) }))
  .filter((s) => s.file);

const topics = [];
let total = 0, withVideo = 0, withProblem = 0, withCompanies = 0, withLearn = 0;

for (const sheet of sheets) {
  const path = sheet.file.startsWith('xl/') ? sheet.file : `xl/${sheet.file}`;
  const xml = read(path);
  if (!xml) { console.error(`missing worksheet ${sheet.file}`); continue; }
  const { rows, links } = parseSheet(xml, shared);

  // Hyperlink rIds live in this sheet's rels file.
  const sheetRels = read(`xl/worksheets/_rels/${path.split('/').pop()}.rels`);
  const relUrl = new Map(
    [...sheetRels.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"[^>]*TargetMode="External"/g)]
      .map((m) => [m[1], txt(decodeURIComponent(m[2]))])
  );

  // Resolve a cell's real URL: hyperlink target beats display text.
  // Cell refs are per-row: we need row numbers, so re-walk rows with refs.
  const cellUrl = new Map(); // "rowIdx:col" -> url
  for (const rm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    for (const cm of rm[2].matchAll(/<c r="([A-Z]+)(\d+)"/g)) {
      const rId = links.get(cm[1] + cm[2]);
      if (rId && relUrl.has(rId)) cellUrl.set(`${Number(cm[2]) - 1}:${colIndex(cm[1])}`, relUrl.get(rId));
    }
  }

  const parsed = rows.map((cells, rowIdx) =>
    cells.map((value, col) => cellUrl.get(`${rowIdx}:${col}`) || value)
  );

  // Header row: first row with a cell that reads exactly "Question".
  const headerIdx = parsed.findIndex((cells) => cells.some((c) => norm(c) === 'question'));
  const cols = {};
  if (headerIdx >= 0) {
    parsed[headerIdx].forEach((h, i) => {
      const n = norm(h);
      for (const [frag, field] of HEADER_MATCH) {
        if (n.includes(frag) && cols[field] === undefined) { cols[field] = i; break; }
      }
    });
  }

  const out = [];
  parsed.forEach((cells, idx) => {
    // Header and any intro rows above it are not questions.
    if (headerIdx >= 0 && idx <= headerIdx) return;
    const title = (cells[cols.question ?? 0] || '').trim();
    if (!title || /^question$/i.test(title)) return;
    if (/^note\b|^instructions?\b|^so guys/i.test(title)) return;
    const pick = (f) => (cols[f] !== undefined ? (cells[cols[f]] || '').trim() : '');
    let video = pick('video');
    let problem = pick('problem');
    // Missing column mapping (e.g. Dijkstra tab's bare "Link" header):
    // classify link cells by shape instead.
    if (cols.video === undefined || cols.problem === undefined) {
      const linksInRow = cells.map((c) => String(c || '').trim()).filter((c) => /^https?:\/\//.test(c));
      if (cols.video === undefined) video = linksInRow.find((c) => /youtube\.com|youtu\.be/.test(c)) || '';
      if (cols.problem === undefined) problem = linksInRow.find((c) => c !== video && !/youtube\.com|youtu\.be/.test(c)) || '';
    }
    // Some company cells hyperlink the GFG company filter; extract the names.
    let companies = pick('companies');
    if (/^https?:\/\//.test(companies)) {
      companies = [...companies.matchAll(/company\[\]=([^&]+)/g)].map((m) => decodeURIComponent(m[1])).join(', ');
    }
    out.push({
      title,
      video: /^https?:\/\//.test(video) ? video : '',
      problem: /^https?:\/\//.test(problem) ? problem : '',
      companies,
      learn: pick('learn'),
    });
  });

  if (out.length === 0) continue;
  total += out.length;
  withVideo += out.filter((r) => r.video).length;
  withProblem += out.filter((r) => r.problem).length;
  withCompanies += out.filter((r) => r.companies).length;
  withLearn += out.filter((r) => r.learn).length;
  topics.push({ id: sheet.name, title: sheet.name, rows: out });
  console.log(`${sheet.name}: ${out.length} (${out.filter((r) => r.companies).length} tagged, ${out.filter((r) => r.learn).length} remarks)`);
}

if (topics.length < 10 || total < 200) {
  console.error(`Got ${topics.length} topics / ${total} rows - suspicious, aborting.`);
  process.exit(1);
}

const js = `// Auto-generated from the CodeStoryWithMIK Google Sheet (${new Date().toISOString().slice(0, 10)}).\n` +
  `// Hyperlinks resolved from the xlsx export. Regenerate: node backend/scripts/scrapeMikSheet.mjs\n` +
  `export const MIK_TOPICS = ${JSON.stringify(topics, null, 2)};\n\nexport default MIK_TOPICS;\n`;
writeFileSync(new URL('../../frontend/src/data/mikSheet.js', import.meta.url), js);
console.log(`\nWrote ${topics.length} topics, ${total} questions (${withVideo} with video, ${withProblem} with problem link, ${withCompanies} with company tags, ${withLearn} with remarks).`);
