import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Code2, Building2, StickyNote, X, CornerDownLeft } from 'lucide-react';
import { buildSearchIndex } from '../lib/searchIndex';
import { useAuth } from '../context/AuthContext';

const EMPTY = { items: {} };

const TYPE_META = {
    problem: { icon: Code2, label: 'Problems', tint: 'text-accent-hi' },
    company: { icon: Building2, label: 'Companies', tint: 'text-violet-400' },
    note: { icon: StickyNote, label: 'Notes', tint: 'text-amber-500' },
};

/** Global Ctrl+K search across all sheets' problems, companies and notes.
 *  onSelect(result) does the navigating; the caller owns routing. */
const GlobalSearch = ({ open, onClose, onSelect }) => {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [index, setIndex] = useState(null);
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Notes are read straight from localStorage (same key shape as
    // useSyncedDoc) - read-only, so no second syncing doc instance.
    const notes = useMemo(() => {
        if (!open) return [];
        try {
            const raw = localStorage.getItem(`preptracker-notes-${user?.id || 'guest'}`);
            return Object.values(JSON.parse(raw || '{}').items || {});
        } catch { return []; }
    }, [open, user?.id]);

    useEffect(() => {
        if (!open) return;
        let live = true;
        buildSearchIndex().then((idx) => live && setIndex(idx));
        return () => { live = false; };
    }, [open]);

    // The parent mounts this component fresh each time (searchOpen && ...),
    // so local state starts clean - only focus needs an effect.
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 30);
        return () => clearTimeout(t);
    }, []);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || !index) return [];
        const out = [];
        index.problems.forEach((p) => {
            if (p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q)) out.push(p);
        });
        index.companies.forEach((c) => {
            if (c.title.toLowerCase().includes(q)) out.push(c);
        });
        notes.forEach((n) => {
            if ((n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)) {
                out.push({ type: 'note', title: n.title || 'Untitled note', body: n.body || '', id: n.id });
            }
        });
        // Flat list, best matches first (shorter titles rank higher).
        return out.sort((a, b) => a.title.length - b.title.length).slice(0, 24);
    }, [query, index, notes]);

    // Keep selection within bounds as the result list changes; derive instead
    // of effecting.
    const activeIdx = Math.min(active, Math.max(0, results.length - 1));

    useEffect(() => {
        listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    if (!open) return null;

    const pick = (item) => { onSelect(item); onClose(); };

    const onKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter' && results[activeIdx]) { e.preventDefault(); pick(results[activeIdx]); }
        else if (e.key === 'Escape') onClose();
    };

    let lastType = null;

    return (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 border-b border-line px-4">
                    <Search className="size-5 shrink-0 text-subtle" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Search problems, companies, notes..."
                        className="w-full bg-transparent py-4 text-base text-fg placeholder:text-subtle focus:outline-none"
                    />
                    <button onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-raised hover:text-fg">
                        <X className="size-4" />
                    </button>
                </div>

                <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
                    {!query.trim() ? (
                        <div className="px-3 py-8 text-center text-sm text-subtle">
                            Search across {index ? `${index.problems.length}+ problems, ${index.companies.length} companies` : '...'}, and your notes.
                            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-faint">
                                <kbd className="rounded border border-line bg-raised px-1.5 py-0.5">↑</kbd>
                                <kbd className="rounded border border-line bg-raised px-1.5 py-0.5">↓</kbd> to navigate,
                                <kbd className="rounded border border-line bg-raised px-1.5 py-0.5">enter</kbd> to jump
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-subtle">No matches.</p>
                    ) : results.map((item, i) => {
                        const meta = TYPE_META[item.type];
                        const header = item.type !== lastType ? (
                            <p key={`h_${item.type}`} className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-faint">{meta.label}</p>
                        ) : null;
                        lastType = item.type;
                        return (
                            <div key={item.id || i}>
                                {header}
                                <button
                                    data-idx={i}
                                    onClick={() => pick(item)}
                                    onMouseEnter={() => setActive(i)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
                                        ${i === activeIdx ? 'bg-raised' : 'hover:bg-raised/60'}`}
                                >
                                    <meta.icon className={`size-4 shrink-0 ${meta.tint}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-fg">{item.title}</span>
                                        <span className="block truncate text-xs text-subtle">
                                            {item.type === 'problem' ? `${item.sheetName} · ${item.topic}`
                                                : item.type === 'company' ? `${item.total} problems`
                                                : (item.body || '').slice(0, 80) || 'Empty note'}
                                        </span>
                                    </span>
                                    {i === activeIdx && <CornerDownLeft className="size-4 shrink-0 text-subtle" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
