import { useState, useEffect, useMemo } from 'react';
import { GraduationCap, ChevronLeft, FileText, Clock3, Milestone } from 'lucide-react';
import { CODEZEN_ORDER } from '../data/codezen/order';

// CodeZen Bootcamp handouts, converted to markdown at build time
// (backend/scripts/buildCodezen.mjs). The index is tiny; each doc is a
// lazy-imported .md chunk.
const DOC_MODULES = import.meta.glob('../data/codezen/*.md', { query: '?raw', import: 'default' });

/** Tiny markdown render: paragraphs, bullets, [links](url), bold. The
 *  handouts are simple enough that a full md parser is overkill. */
const Markdown = ({ text }) => {
    const blocks = useMemo(() => text.split('\n'), [text]);
    return (
        <div className="space-y-3">
            {blocks.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('<!--')) return null;

                // Inline: [text](url) links and **bold**.
                const renderInline = (s) => {
                    const parts = [];
                    const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
                    let last = 0, m;
                    while ((m = re.exec(s))) {
                        if (m.index > last) parts.push(s.slice(last, m.index));
                        if (m[1]) {
                            parts.push(
                                <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer"
                                    className="text-accent-hi underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
                                    {m[1]}
                                </a>
                            );
                        } else {
                            parts.push(<strong key={m.index}>{m[3]}</strong>);
                        }
                        last = re.lastIndex;
                    }
                    if (last < s.length) parts.push(s.slice(last));
                    return parts;
                };

                if (trimmed.startsWith('- ')) {
                    return (
                        <p key={i} className="flex gap-2.5 pl-1 text-sm leading-relaxed text-muted sm:text-base">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                            <span className="min-w-0 flex-1">{renderInline(trimmed.slice(2))}</span>
                        </p>
                    );
                }
                return (
                    <p key={i} className="text-sm leading-relaxed text-muted sm:text-base">
                        {renderInline(trimmed)}
                    </p>
                );
            })}
        </div>
    );
};

const CodeZen = () => {
    const [index, setIndex] = useState(null);
    const [openTopic, setOpenTopic] = useState(null);   // topic name
    const [openDoc, setOpenDoc] = useState(null);       // { slug, title }
    const [content, setContent] = useState(null);

    useEffect(() => {
        let live = true;
        import('../data/codezen/index.json').then((m) => {
            if (live) setIndex(m.default);
        });
        return () => { live = false; };
    }, []);

    // Load the doc body when one is opened.
    useEffect(() => {
        if (!openDoc) { setContent(null); return; }
        let live = true;
        DOC_MODULES[`../data/codezen/${openDoc.slug}.md`]?.().then((md) => {
            if (live) setContent(String(md));
        });
        return () => { live = false; };
    }, [openDoc]);

    // Ordered doc sequence across the whole suggested path (safe before the
    // index loads - it just yields an empty list).
    const rank = (t) => {
        const i = CODEZEN_ORDER.indexOf(t.topic);
        return i === -1 ? CODEZEN_ORDER.length : i;
    };
    const pathDocs = useMemo(() => {
        if (!index) return [];
        return [...index]
            .sort((a, b) => rank(a) - rank(b))
            .flatMap((t) => t.docs.map((d) => ({ ...d, topic: t.topic })));
    }, [index]);
    const ordered = useMemo(() => {
        if (!index) return [];
        return [...index].sort((a, b) => rank(a) - rank(b));
    }, [index]);

    if (!index) {
        return <p className="py-16 text-center text-subtle">Loading bootcamp material...</p>;
    }

    // ---- Doc reader (blog view) ----
    if (openDoc) {
        const topic = index.find((t) => t.docs.some((d) => d.slug === openDoc.slug));
        const seqIdx = pathDocs.findIndex((d) => d.slug === openDoc.slug);
        const next = seqIdx >= 0 ? pathDocs[seqIdx + 1] : null;
        return (
            <div className="mx-auto max-w-3xl animate-fade-in">
                <button
                    onClick={() => setOpenDoc(null)}
                    className="mb-5 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                >
                    <ChevronLeft className="size-4" /> {topic ? topic.topic : 'Back'}
                </button>

                <div className="rounded-2xl border border-line bg-panel p-6 sm:p-10">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-hi">
                        <GraduationCap className="size-4" /> CodeZen Bootcamp{topic ? ` · ${topic.topic}` : ''}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{openDoc.title}</h1>

                    <div className="mt-8">
                        {content === null
                            ? <p className="py-8 text-center text-sm text-subtle">Loading...</p>
                            : <Markdown text={content} />}
                    </div>
                </div>

                {/* Next doc along the suggested path */}
                {next && (
                    <button
                        onClick={() => setOpenDoc(next)}
                        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-line bg-panel px-5 py-4 text-left transition-colors hover:border-accent/30 hover:bg-raised/40"
                    >
                        <span>
                            <span className="block text-xs text-subtle">Up next · {next.topic}</span>
                            <span className="mt-0.5 block text-sm font-semibold">{next.title}</span>
                        </span>
                        <span className="text-accent-hi">→</span>
                    </button>
                )}
            </div>
        );
    }

    // ---- Topic doc list ----
    if (openTopic) {
        const topic = index.find((t) => t.topic === openTopic);
        return (
            <div className="animate-fade-in">
                <button
                    onClick={() => setOpenTopic(null)}
                    className="mb-5 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                >
                    <ChevronLeft className="size-4" /> All topics
                </button>

                <div className="mb-5 flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20">
                        <GraduationCap className="size-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{topic.topic}</h2>
                        <p className="text-sm text-subtle">{topic.docs.length} handout{topic.docs.length === 1 ? '' : 's'}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {topic.docs.map((d) => (
                        <button
                            key={d.slug}
                            onClick={() => setOpenDoc(d)}
                            className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-panel p-4 text-left transition-all hover:border-accent/30 hover:bg-raised/40"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent-hi">
                                <FileText className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold sm:text-base">{d.title}</span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
                                    <Clock3 className="size-3.5" /> study handout
                                </span>
                            </span>
                            <span className="shrink-0 text-accent-hi">→</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ---- Topic grid (suggested study order) ----
    return (
        <div className="animate-fade-in">
            <div className="mb-5 flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20">
                    <GraduationCap className="size-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">CodeZen Bootcamp</h2>
                    <p className="text-sm text-subtle">Curated handouts - topics, problem sets and editorials</p>
                </div>
            </div>

            {/* Suggested path */}
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3">
                <Milestone className="size-4 shrink-0 text-accent-hi" />
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-hi">Suggested path</span>
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
                    {ordered.map((t, i) => (
                        <span key={t.topic} className="flex items-center gap-1.5">
                            <span>{t.topic.replace(/ and .*/, ' &...')}</span>
                            {i < ordered.length - 1 && <span className="text-faint">→</span>}
                        </span>
                    ))}
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ordered.map((t, i) => (
                    <button
                        key={t.topic}
                        onClick={() => setOpenTopic(t.topic)}
                        className="group rounded-2xl border border-line bg-panel p-5 text-left transition-all hover:border-accent/30 hover:bg-raised/40"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-accent/12 text-accent-hi transition-colors group-hover:bg-accent/20">
                                <GraduationCap className="size-5" />
                            </div>
                            <span className="font-mono text-xs font-semibold text-faint">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <h3 className="mt-3.5 text-base font-semibold">{t.topic}</h3>
                        <p className="mt-1 text-sm text-subtle">
                            {t.docs.length} handout{t.docs.length === 1 ? '' : 's'}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CodeZen;
