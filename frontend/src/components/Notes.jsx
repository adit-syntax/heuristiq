import { useState, useMemo } from 'react';
import { StickyNote, Plus, Trash2, Search, Cloud, CloudOff, Loader2 } from 'lucide-react';
import useSyncedDoc from '../hooks/useSyncedDoc';
import useToast from '../hooks/useToast';

const EMPTY = { items: {} };

export const SyncBadge = ({ status, loading }) => {
    if (loading) return <span className="flex items-center gap-1.5 text-xs text-subtle"><Loader2 className="size-3.5 animate-spin" /> Loading</span>;
    if (status === 'syncing') return <span className="flex items-center gap-1.5 text-xs text-subtle"><Loader2 className="size-3.5 animate-spin" /> Saving</span>;
    if (status === 'error') return <span className="flex items-center gap-1.5 text-xs text-rose-400"><CloudOff className="size-3.5" /> Saved locally only</span>;
    if (status === 'too-large') return <span className="flex items-center gap-1.5 text-xs text-amber-500"><CloudOff className="size-3.5" /> Too large to sync</span>;
    return <span className="flex items-center gap-1.5 text-xs text-subtle"><Cloud className="size-3.5" /> Saved</span>;
};

const Notes = ({ jumpQuery }) => {
    const [doc, setDoc, { loading, status }] = useSyncedDoc('notes', EMPTY);
    const [activeId, setActiveId] = useState(null);
    const [query, setQuery] = useState('');

    // Global-search jump: land pre-filtered. Adjust-during-render instead of
    // an effect (React-endorsed derive pattern).
    const [lastJump, setLastJump] = useState(null);
    if (jumpQuery && jumpQuery !== lastJump) {
        setLastJump(jumpQuery);
        setQuery(jumpQuery);
    }
    const { toast, confirm } = useToast();

    const notes = useMemo(
        () => Object.values(doc.items || {}).sort((a, b) => b.updatedAt - a.updatedAt),
        [doc.items]
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return notes;
        return notes.filter((n) =>
            n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q) ||
            (n.tag || '').toLowerCase().includes(q)
        );
    }, [notes, query]);

    const active = activeId ? doc.items?.[activeId] : null;

    const createNote = () => {
        const id = `n_${Date.now()}`;
        setDoc((prev) => ({
            ...prev,
            items: { ...prev.items, [id]: { id, title: 'Untitled note', body: '', tag: '', updatedAt: Date.now() } },
        }));
        setActiveId(id);
        toast('Note created');
    };

    const patchNote = (id, patch) => {
        setDoc((prev) => ({
            ...prev,
            items: { ...prev.items, [id]: { ...prev.items[id], ...patch, updatedAt: Date.now() } },
        }));
    };

    const deleteNote = async (id) => {
        const note = doc.items?.[id];
        if (!note) return;
        if (!await confirm('Delete this note?', {
            body: note?.title || '',
            confirmLabel: 'Delete',
            danger: true,
        })) return;
        setDoc((prev) => {
            const items = { ...prev.items };
            delete items[id];
            return { ...prev, items };
        });
        if (activeId === id) setActiveId(null);
        // Undo window: keep the note around in the toast closure; re-insert
        // verbatim (original updatedAt preserved) if the user hits Undo.
        toast('Note deleted', {
            detail: note.title,
            kind: 'danger',
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    setDoc((prev) => ({ ...prev, items: { ...prev.items, [note.id]: note } }));
                    toast('Note restored', { detail: note.title });
                },
            },
        });
    };

    return (
        <div className="space-y-6 px-1 sm:px-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <StickyNote className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notes</h1>
                        <p className="font-mono text-sm text-subtle">{notes.length} note{notes.length === 1 ? '' : 's'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <SyncBadge status={status} loading={loading} />
                    <button
                        onClick={createNote}
                        className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi"
                    >
                        <Plus className="size-4" /> New note
                    </button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                {/* List */}
                <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-panel">
                    <div className="relative border-b border-line p-3">
                        <Search className="absolute left-6 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search notes..."
                            className="w-full rounded-xl border border-line bg-raised/50 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {visible.length === 0 && (
                            <p className="px-4 py-10 text-center text-sm text-subtle">
                                {notes.length === 0 ? 'No notes yet. Create one.' : 'No matches.'}
                            </p>
                        )}
                        {visible.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => setActiveId(n.id)}
                                className={`w-full border-b border-line/60 px-4 py-3 text-left transition-colors
                                    ${activeId === n.id ? 'bg-accent/10' : 'hover:bg-raised/40'}`}
                            >
                                <div className="truncate text-sm font-medium">{n.title || 'Untitled'}</div>
                                <div className="mt-0.5 truncate text-xs text-subtle">{n.body.slice(0, 60) || 'Empty'}</div>
                                {n.tag && (
                                    <span className="mt-1.5 inline-block rounded bg-raised px-1.5 py-0.5 text-[10px] text-subtle">{n.tag}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-panel">
                    {!active ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                            <StickyNote className="mb-3 size-12 text-faint" />
                            <p className="text-subtle">Select a note, or create a new one.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 border-b border-line p-4">
                                <input
                                    value={active.title}
                                    onChange={(e) => patchNote(active.id, { title: e.target.value })}
                                    placeholder="Note title"
                                    className="flex-1 bg-transparent text-lg font-semibold text-fg placeholder:text-faint focus:outline-none"
                                />
                                <input
                                    value={active.tag || ''}
                                    onChange={(e) => patchNote(active.id, { tag: e.target.value })}
                                    placeholder="tag"
                                    className="w-24 rounded-lg border border-line bg-raised/50 px-2 py-1 text-xs text-muted focus:border-accent focus:outline-none"
                                />
                                <button
                                    onClick={() => deleteNote(active.id)}
                                    className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                                    title="Delete note"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                            <textarea
                                value={active.body}
                                onChange={(e) => patchNote(active.id, { body: e.target.value })}
                                onBlur={() => toast('Note saved', { kind: 'info' })}
                                placeholder="Approach, edge cases, complexity, mistakes to avoid..."
                                className="flex-1 w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-fg placeholder:text-faint focus:outline-none"
                                spellCheck="false"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notes;
