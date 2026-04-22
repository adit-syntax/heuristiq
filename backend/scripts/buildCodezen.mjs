// Convert the CodeZen Bootcamp .docx handouts into blog-ready markdown in
// frontend/src/data/codezen/ (one .md per doc, plus an index).
// One-shot: node backend/scripts/buildCodezen.mjs
//
// A .docx is a zip; the text lives in word/document.xml as <w:t> runs with
// <w:p> paragraphs. The handouts use numbered/bulleted lists and links, so
// keep it to: paragraphs, list items (bullets), and hyperlinks.
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const SRC = new URL('../../CodeZen Bootcamp/', import.meta.url);
const OUT = new URL('../../frontend/src/data/codezen/', import.meta.url);

// ---- minimal zip reader (same approach as scrapeMikSheet) ----
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
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
    const lhNameLen = buf.readUInt16LE(localOff + 26);
    const lhExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lhNameLen + lhExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    files.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const txt = (xml) => xml
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');

// Relationship map (rId -> url) for hyperlinks.
function relsOf(zip) {
  const rels = zip.get('word/_rels/document.xml.rels')?.toString('utf8') || '';
  const map = new Map();
  for (const m of rels.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"[^>]*TargetMode="External"/g)) {
    map.set(m[1], txt(m[2]));
  }
  return map;
}

/** document.xml -> markdown. Paragraph-per-<w:p>, runs joined; hyperlinks
 *  become [text](url); numPr paragraphs become bullets. */
function docxToMarkdown(zip) {
  const xml = zip.get('word/document.xml')?.toString('utf8') || '';
  const rels = relsOf(zip);
  const lines = [];

  for (const p of xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
    const para = p[0];
    const isBullet = /<w:numPr>/.test(para) || /w:val="Bullet"/.test(para);
    const isNumbered = /<w:numPr>/.test(para);

    // Walk the paragraph: plain runs and hyperlink runs in document order.
    let text = '';
    const tokenRe = /(<w:hyperlink[^>]*r:id="(rId\d+)"[^>]*>[\s\S]*?<\/w:hyperlink>)|(<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>)/g;
    for (const m of para.matchAll(tokenRe)) {
      if (m[1]) {
        const inner = [...m[2] ? '' : ''].join('');
        // Extract text inside this hyperlink element.
        const innerText = [...m[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((t) => txt(t[1])).join('');
        const url = rels.get(m[2]) || '';
        text += url ? `[${innerText}](${url})` : innerText;
      } else {
        text += txt(m[4] || '');
      }
    }
    text = text.trim();
    if (!text) { lines.push(''); continue; }
    if (isNumbered || isBullet) lines.push(`- ${text}`);
    else lines.push(text);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---- walk topics ----
mkdirSync(OUT, { recursive: true });
const topics = [];

for (const dir of readdirSync(SRC, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const topicName = dir.name.trim();
  const files = readdirSync(new URL(`${dir.name}/`, SRC)).filter((f) => /\.docx$/i.test(f));
  const docs = [];
  for (const f of files) {
    const buf = (await import('node:fs')).readFileSync(new URL(`${dir.name}/${f}`, SRC));
    const md = docxToMarkdown(unzip(buf));
    const slug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const docSlug = f.replace(/\.docx$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    writeFileSync(new URL(`${slug}--${docSlug}.md`, OUT),
      `<!-- topic: ${topicName} | doc: ${f.replace(/\.docx$/i, '')} -->\n\n${md}\n`);
    docs.push({ slug: `${slug}--${docSlug}`, title: f.replace(/\.docx$/i, '').replace(/_/g, ' ').trim() });
  }
  topics.push({ topic: topicName, docs });
  console.log(`${topicName}: ${docs.length} doc(s)`);
}

if (topics.length === 0) throw new Error('no topics found - wrong folder?');
writeFileSync(new URL('index.json', OUT), JSON.stringify(topics, null, 2));
console.log(`\nWrote ${topics.length} topics to frontend/src/data/codezen/.`);
