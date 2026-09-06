import { useState, useMemo, useEffect } from 'react';
import {
    Building2, ChevronLeft, Search, CheckCircle2, Circle, RotateCcw,
    Star, StickyNote, ExternalLink, Eye, EyeOff, SquareCode
} from 'lucide-react';
import QuestionNoteModal from './QuestionNoteModal';
import SolveModal from './SolveModal';

// Per-company question files are ~50-200 kB; load only the opened one.
const COMPANY_MODULES = import.meta.glob('../data/companies/*.js');

const DIFFS = ['all', 'easy', 'medium', 'hard'];

/** One company's question list: search, difficulty filter, status toggles. */
const CompanyQuestions = ({ company, getDSAStatus, updateDSAStatus, getQuestionNote, updateQuestionNote, getQuestionTags, updateQuestionTags, onBack, theme }) => {
    const [rows, setRows] = useState(null);
    const [query, setQuery] = useState('');
    const [diff, setDiff] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // all | unsolved | solved | revision
    const [noting, setNoting] = useState(null);
    const [solving, setSolving] = useState(null);

    useEffect(() => {
        let live = true;
        COMPANY_MODULES[`../data/companies/${company.slug}.js`]().then((mod) => {
            if (live) setRows(mod.QUESTIONS);
        });
        return () => { live = false; };
    }, [company.slug]);

    // Map to the shape QuestionNoteModal expects. Topic tags ride along in
    // `companies` so they render as chips there. Frequency is a number
    // (codejeet) or a popularity label (hynts: "Very Hot"). `cid` is the
    // canonical LeetCode identity - statuses shared across all lists.
    const questions = useMemo(() => (rows || []).map(([title, slug, d, topics, freq]) => ({
        id: `${company.id}:${title}`,
        cid: slug ? `lc:${slug}` : undefined,
        topic: company.name,
        subtopic: ['Easy', 'Medium', 'Hard'][d],
        problem: title,
        questionLink: '',
        gfgLink: '',
        // Non-LeetCode platforms have no slug; fall back to a search link.
        leetCodeLink: slug
            ? `https://leetcode.com/problems/${slug}/`
            : `https://www.google.com/search?q=${encodeURIComponent(title + ' dsa problem')}`,
        youTubeLink: '',
        companies: topics,
        learn: '',
        freq,
    })), [rows, company]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return questions.filter((x) => {
            if (diff !== 'all' && x.subtopic.toLowerCase() !== diff) return false;
            if (statusFilter !== 'all') {
                const s = getDSAStatus(x.id, x.cid);
                if (s !== statusFilter) return false;
            }
            if (!q) return true;
            return x.problem.toLowerCase().includes(q) || String(x.companies || '').toLowerCase().includes(q);
        });
    }, [questions, query, diff, statusFilter, getDSAStatus]);

    const solved = questions.filter((q) => getDSAStatus(q.id, q.cid) === 'solved').length;

    const statusIcon = (status) =>
        status === 'solved' ? <CheckCircle2 className="size-5 text-emerald-500" />
        : status === 'revision' ? <RotateCcw className="size-5 text-amber-500" />
        : <Circle className="size-5 text-faint" />;

    const cycle = (q) => {
        const s = getDSAStatus(q.id, q.cid);
        updateDSAStatus(q.id, s === 'unsolved' ? 'solved' : s === 'solved' ? 'revision' : 'unsolved', {
            cid: q.cid,
            title: q.problem,
            company: company.id,
        });
    };

    return (
        <div className="space-y-5 px-1 sm:px-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3.5">
                    <button onClick={onBack}
                        className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-panel transition-colors hover:bg-raised"
                        title="All companies">
                        <ChevronLeft className="size-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{company.name}</h1>
                        <p className="font-mono text-sm text-subtle">
                            {rows ? <>{solved} / {questions.length} solved</> : 'loading...'}
                        </p>
                    </div>
                </div>
                <div className="flex w-full items-center gap-3 lg:w-80">
                    <div className="relative w-full">
                        <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-subtle" />
                        <input
                            type="text"
                            placeholder="Search problems, topics..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full rounded-xl border border-line bg-panel py-3.5 pl-4 pr-12 text-base text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {DIFFS.map((d) => (
                    <button
                        key={d}
                        onClick={() => setDiff(d)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all
                            ${diff === d ? 'bg-accent font-semibold text-white' : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                    >
                        {d}
                    </button>
                ))}
                <span className="mx-1 h-5 w-px bg-line" />
                {['all', 'unsolved', 'solved', 'revision'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all
                            ${statusFilter === s
                                ? s === 'solved' ? 'bg-emerald-500 font-semibold text-white'
                                    : s === 'revision' ? 'bg-amber-500 font-semibold text-white'
                                    : 'bg-accent font-semibold text-white'
                                : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                    >
                        {s}
                    </button>
                ))}
                <span className="ml-auto font-mono text-sm text-subtle">
                    Showing {visible.length} / {questions.length}
                </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
                {!rows ? (
                    <p className="p-10 text-center text-subtle">Loading questions...</p>
                ) : visible.length === 0 ? (
                    <p className="p-10 text-center text-subtle">No matches.</p>
                ) : visible.map((q) => {
                    const status = getDSAStatus(q.id, q.cid);
                    return (
                        <div key={q.id}
                            className={`flex items-center gap-3 border-b border-line/40 px-4 py-3 transition-all hover:bg-raised/30 last:border-b-0 sm:px-5
                                ${status === 'solved' ? 'bg-emerald-500/5' : ''}`}>
                            <button onClick={() => cycle(q)} className="shrink-0 transition-transform hover:scale-110" title="unsolved → solved → revision">
                                {statusIcon(status)}
                            </button>
                            <span className={`min-w-0 flex-1 truncate text-sm font-medium sm:text-base ${status === 'solved' ? 'text-subtle line-through' : 'text-fg'}`}>
                                {q.problem}
                            </span>
                            <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline
                                ${q.subtopic === 'Easy' ? 'bg-emerald-500/15 text-emerald-500'
                                    : q.subtopic === 'Medium' ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-rose-500/15 text-rose-500'}`}>
                                {q.subtopic}
                            </span>
                            <span
                                className={`hidden w-16 shrink-0 text-right text-xs md:inline ${typeof q.freq === 'number' ? 'font-mono text-subtle' : 'text-subtle'}`}
                                title="Interview popularity"
                            >
                                {typeof q.freq === 'number' ? `${q.freq.toFixed(0)}%` : q.freq}
                            </span>
                            <button onClick={() => setNoting(q)}
                                title="Notes & tags"
                                className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all
                                    ${getQuestionNote(q.id) || getQuestionTags(q.id) || q.companies
                                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                                        : 'border-line text-faint hover:border-amber-500/30 hover:text-amber-500/80'}`}>
                                <StickyNote className="size-4" />
                            </button>
                            <button
                                onClick={() => setSolving(q)}
                                title="Write and run code in playground"
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-accent/5 text-accent-hi/80 transition-all hover:border-accent/40 hover:bg-accent/10 hover:text-accent-hi"
                            >
                                <SquareCode className="size-4" />
                            </button>
                            <a href={q.leetCodeLink} target="_blank" rel="noopener noreferrer"
                                title="Open on LeetCode"
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/15 bg-amber-500/5 text-amber-500/80 transition-colors hover:border-amber-500/40">
                                <ExternalLink className="size-4" />
                            </a>
                        </div>
                    );
                })}
            </div>

            {noting && (
                <QuestionNoteModal
                    key={noting.id}
                    question={noting}
                    note={getQuestionNote(noting.id)}
                    tags={getQuestionTags(noting.id)}
                    onSave={updateQuestionNote}
                    onTagsChange={updateQuestionTags}
                    onClose={() => setNoting(null)}
                />
            )}

            {solving && (
                <SolveModal
                    question={solving}
                    status={getDSAStatus(solving.id, solving.cid)}
                    onStatusChange={(qid, s) => updateDSAStatus(qid, s, { cid: solving.cid, title: solving.problem })}
                    onClose={() => setSolving(null)}
                    theme={theme}
                />
            )}
        </div>
    );
};

/** Companies browse: grid of cards with follow toggle + solved progress. */
const Companies = ({
    getDSAStatus, updateDSAStatus, getQuestionNote, updateQuestionNote,
    getQuestionTags, updateQuestionTags, getCompanySolvedCount,
    followedCompanies, toggleFollowCompany, jumpSlug, dsaProgress, theme,
}) => {
    const [registry, setRegistry] = useState(null);
    const [cidIndex, setCidIndex] = useState(null);
    const [openSlug, setOpenSlug] = useState(null);
    const [followedOnly, setFollowedOnly] = useState(false);

    // Global-search jump: open a company sheet directly.
    useEffect(() => {
        if (jumpSlug) setOpenSlug(jumpSlug);
    }, [jumpSlug]);

    useEffect(() => {
        let live = true;
        import('../data/companies/registry').then((mod) => {
            if (live) setRegistry(mod.COMPANY_REGISTRY);
        });
        // Canonical key -> companies carrying that question; lets cards count
        // solves made anywhere (sheets or other companies).
        import('../data/companies/cidIndex').then((mod) => {
            if (live) setCidIndex(mod.CID_INDEX);
        });
        return () => { live = false; };
    }, []);

    const [searchQuery, setSearchQuery] = useState('');

    // True solved count per company: canonical marks (from ANY sheet/company)
    // resolved via the cid index, plus legacy per-list keys. Empty until the
    // index loads; the cards fall back to getCompanySolvedCount meanwhile.
    const solvedByCompany = useMemo(() => {
        const counts = new Map();
        if (!cidIndex || !dsaProgress) return counts;
        for (const [key, status] of Object.entries(dsaProgress)) {
            if (status !== 'solved') continue;
            if (key.startsWith('lc:')) {
                const companies = cidIndex[key];
                if (companies) for (const cid of companies) counts.set(cid, (counts.get(cid) || 0) + 1);
            } else {
                // Legacy `companyId:title` keys.
                const idx = key.indexOf(':');
                const cid = idx > 0 ? key.slice(0, idx) : null;
                if (cid && cid !== 'lc' && cid !== 'cf' && cid !== 'gfg' && cid !== 'cses') {
                    counts.set(cid, (counts.get(cid) || 0) + 1);
                }
            }
        }
        return counts;
    }, [cidIndex, dsaProgress]);

    const followedSet = useMemo(() => new Set(followedCompanies), [followedCompanies]);

    const list = useMemo(() => {
        if (!registry) return [];
        let base = followedOnly ? registry.filter((c) => followedSet.has(`cj:${c.slug}`)) : registry;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            base = base.filter((c) => c.name.toLowerCase().includes(q));
        }
        return base;
    }, [registry, followedOnly, followedSet, searchQuery]);

    if (!registry) {
        return <p className="py-24 text-center text-subtle">Loading companies...</p>;
    }

    const open = openSlug ? registry.find((c) => c.slug === openSlug) : null;
    if (open) {
        return (
            <CompanyQuestions
                company={open}
                getDSAStatus={getDSAStatus} updateDSAStatus={updateDSAStatus}
                getQuestionNote={getQuestionNote} updateQuestionNote={updateQuestionNote}
                getQuestionTags={getQuestionTags} updateQuestionTags={updateQuestionTags}
                onBack={() => setOpenSlug(null)}
                theme={theme}
            />
        );
    }

    const solvedCountFor = (c) => (cidIndex && dsaProgress
        ? (solvedByCompany.get(c.id) || 0)
        : getCompanySolvedCount(c.id));

    const card = (c) => {
        const solved = solvedCountFor(c);
        const pct = c.total ? Math.round((solved / c.total) * 100) : 0;
        const isFollowed = followedSet.has(`cj:${c.slug}`);
        return (
            <div key={c.slug}
                className={`group rounded-2xl border p-4 transition-all
                    ${isFollowed ? 'border-accent/50 bg-raised' : 'border-line bg-panel hover:border-accent/25 hover:bg-raised/60'}`}>
                <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setOpenSlug(c.slug)} className="min-w-0 flex-1 text-left">
                        <h3 className="truncate text-base font-semibold transition-colors group-hover:text-accent-hi">{c.name}</h3>
                        <p className="mt-0.5 font-mono text-xs text-subtle">
                            {solved} / {c.total} solved · {c.easy}E {c.medium}M {c.hard}H
                        </p>
                    </button>
                    <button
                        onClick={() => toggleFollowCompany(`cj:${c.slug}`)}
                        title={isFollowed ? 'Unfollow' : 'Follow'}
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95
                            ${isFollowed
                                ? 'border-accent/40 bg-accent/15 text-accent-hi'
                                : 'border-line text-subtle hover:border-accent/30 hover:text-accent-hi'}`}
                    >
                        <Star className={`size-4 ${isFollowed ? 'fill-accent-hi' : ''}`} />
                    </button>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
                    <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 px-1 sm:px-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <Building2 className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Company Sheets</h1>
                        <p className="text-sm text-subtle sm:text-base">
                            {registry.length} companies · real interview question banks
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                        <input
                            type="text"
                            placeholder="Filter company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setFollowedOnly((v) => !v)}
                        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all
                            ${followedOnly ? 'bg-accent text-white' : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                    >
                        {followedOnly ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        {followedOnly ? 'Following' : 'All companies'}
                    </button>
                </div>
            </div>

            {followedOnly && list.length === 0 ? (
                <p className="py-16 text-center text-subtle">
                    Not following any company yet - tap the star on a card.
                </p>
            ) : list.length === 0 ? (
                <p className="py-16 text-center text-subtle">
                    No companies match "{searchQuery}".
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.map(card)}
                </div>
            )}
        </div>
    );
};

export default Companies;
