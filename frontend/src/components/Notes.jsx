import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    StickyNote, Plus, Trash2, Search, Cloud, CloudOff, Loader2, ChevronLeft,
    Undo2, Redo2, Eye, Edit3, Columns2, Copy, Check, CheckSquare, Square, MinusSquare
} from 'lucide-react';
import useSyncedDoc from '../hooks/useSyncedDoc';
import useToast from '../hooks/useToast';
import FloatingPanel from './FloatingPanel';

const EMPTY = { items: {} };

export const SyncBadge = ({ status, loading }) => {
    if (loading) return <span className="flex items-center gap-1.5 text-xs text-subtle"><Loader2 className="size-3.5 animate-spin" /> Loading</span>;
    if (status === 'syncing') return <span className="flex items-center gap-1.5 text-xs text-subtle"><Loader2 className="size-3.5 animate-spin" /> Saving</span>;
    if (status === 'error') return <span className="flex items-center gap-1.5 text-xs text-rose-400"><CloudOff className="size-3.5" /> Saved locally only</span>;
    if (status === 'too-large') return <span className="flex items-center gap-1.5 text-xs text-amber-500"><CloudOff className="size-3.5" /> Too large to sync</span>;
    return <span className="flex items-center gap-1.5 text-xs text-subtle"><Cloud className="size-3.5" /> Saved</span>;
};

/** Code block renderer with copy button */
const CodeBlock = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="relative my-3 overflow-hidden rounded-xl border border-line bg-zinc-950/80 font-mono text-xs shadow-md">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5 text-zinc-400">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{language || 'code'}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                    {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>
            <pre className="overflow-x-auto p-3.5 leading-relaxed text-zinc-100">
                <code>{code}</code>
            </pre>
        </div>
    );
};

/** Note Markdown Renderer */
const NoteMarkdown = ({ text, onToggleTask }) => {
    const rendered = useMemo(() => {
        if (!text || !text.trim()) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center text-subtle text-sm">
                    <StickyNote className="mb-2 size-8 text-faint" />
                    <p>No note content to preview yet.</p>
                    <p className="mt-1 text-xs text-faint">Switch to <strong>Write</strong> mode or click any toolbar button above to start typing.</p>
                </div>
            );
        }

        // Split by code blocks first
        const parts = [];
        const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'markdown', content: text.substring(lastIndex, match.index) });
            }
            parts.push({ type: 'code', language: match[1] || 'code', content: match[2].replace(/\n$/, '') });
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push({ type: 'markdown', content: text.substring(lastIndex) });
        }

        const renderInline = (str) => {
            const elements = [];
            const inlineRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
            let last = 0;
            let m;

            while ((m = inlineRegex.exec(str)) !== null) {
                if (m.index > last) elements.push(str.slice(last, m.index));
                if (m[2]) {
                    elements.push(<strong key={m.index} className="font-bold text-fg">{m[2]}</strong>);
                } else if (m[3]) {
                    elements.push(<em key={m.index} className="italic text-fg">{m[3]}</em>);
                } else if (m[4]) {
                    elements.push(<del key={m.index} className="line-through text-subtle">{m[4]}</del>);
                } else if (m[5]) {
                    elements.push(<code key={m.index} className="rounded bg-raised/80 border border-line/60 px-1.5 py-0.5 font-mono text-[11px] text-accent-hi">{m[5]}</code>);
                } else if (m[6] && m[7]) {
                    elements.push(
                        <a key={m.index} href={m[7]} target="_blank" rel="noopener noreferrer" className="text-accent-hi underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
                            {m[6]}
                        </a>
                    );
                }
                last = inlineRegex.lastIndex;
            }
            if (last < str.length) elements.push(str.slice(last));
            return elements;
        };

        return parts.map((part, pIdx) => {
            if (part.type === 'code') {
                return <CodeBlock key={pIdx} code={part.content} language={part.language} />;
            }

            const lines = part.content.split('\n');
            const nodes = [];
            let inList = false;
            let listType = null;
            let listItems = [];

            const flushList = () => {
                if (!inList) return;
                if (listType === 'ul') {
                    nodes.push(
                        <ul key={`ul-${nodes.length}`} className="my-2 space-y-1.5 pl-5 list-disc marker:text-accent">
                            {listItems.map((li, i) => <li key={i} className="text-sm leading-relaxed text-muted">{renderInline(li)}</li>)}
                        </ul>
                    );
                } else if (listType === 'ol') {
                    nodes.push(
                        <ol key={`ol-${nodes.length}`} className="my-2 space-y-1.5 pl-5 list-decimal marker:text-accent font-medium">
                            {listItems.map((li, i) => <li key={i} className="text-sm leading-relaxed text-muted font-normal">{renderInline(li)}</li>)}
                        </ol>
                    );
                }
                inList = false;
                listType = null;
                listItems = [];
            };

            lines.forEach((line, lIdx) => {
                const trimmed = line.trim();

                if (!trimmed) {
                    flushList();
                    nodes.push(<div key={`empty-${lIdx}`} className="h-2" />);
                    return;
                }

                // Headings
                const h1 = line.match(/^#\s+(.*)/);
                if (h1) {
                    flushList();
                    nodes.push(<h1 key={`h1-${lIdx}`} className="mt-4 mb-2 text-xl font-bold text-fg border-b border-line pb-1.5 first:mt-0">{renderInline(h1[1])}</h1>);
                    return;
                }
                const h2 = line.match(/^##\s+(.*)/);
                if (h2) {
                    flushList();
                    nodes.push(<h2 key={`h2-${lIdx}`} className="mt-3 mb-1.5 text-lg font-bold text-fg first:mt-0">{renderInline(h2[1])}</h2>);
                    return;
                }
                const h3 = line.match(/^###\s+(.*)/);
                if (h3) {
                    flushList();
                    nodes.push(<h3 key={`h3-${lIdx}`} className="mt-2.5 mb-1 text-base font-semibold text-fg first:mt-0">{renderInline(h3[1])}</h3>);
                    return;
                }

                // Blockquote
                const bq = line.match(/^>\s*(.*)/);
                if (bq) {
                    flushList();
                    nodes.push(
                        <blockquote key={`bq-${lIdx}`} className="my-2.5 border-l-2 border-accent bg-raised/30 px-3.5 py-2 text-sm italic text-muted rounded-r-lg">
                            {renderInline(bq[1])}
                        </blockquote>
                    );
                    return;
                }

                // Task list item: - [ ] or - [x]
                const task = line.match(/^[-*]\s+\[( |x|X)\]\s+(.*)/);
                if (task) {
                    flushList();
                    const isChecked = task[1].toLowerCase() === 'x';
                    nodes.push(
                        <div key={`task-${lIdx}`} className="flex items-start gap-2.5 my-1.5">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onToggleTask && onToggleTask(line)}
                                className="mt-1 size-3.5 rounded border-line accent-accent cursor-pointer"
                            />
                            <span className={`text-sm leading-relaxed ${isChecked ? 'line-through text-subtle' : 'text-muted'}`}>
                                {renderInline(task[2])}
                            </span>
                        </div>
                    );
                    return;
                }

                // Unordered list
                const ul = line.match(/^[-*]\s+(.*)/);
                if (ul) {
                    if (!inList || listType !== 'ul') {
                        flushList();
                        inList = true;
                        listType = 'ul';
                    }
                    listItems.push(ul[1]);
                    return;
                }

                // Ordered list
                const ol = line.match(/^\d+\.\s+(.*)/);
                if (ol) {
                    if (!inList || listType !== 'ol') {
                        flushList();
                        inList = true;
                        listType = 'ol';
                    }
                    listItems.push(ol[1]);
                    return;
                }

                // Regular paragraph
                flushList();
                nodes.push(
                    <p key={`p-${lIdx}`} className="text-sm leading-relaxed text-muted">
                        {renderInline(line)}
                    </p>
                );
            });

            flushList();
            return <div key={pIdx}>{nodes}</div>;
        });
    }, [text, onToggleTask]);

    return <div className="space-y-1">{rendered}</div>;
};

const Notes = ({ jumpQuery, floating = false, onClose }) => {
    const [doc, setDoc, { loading, status }] = useSyncedDoc('notes', EMPTY);
    const [activeId, setActiveId] = useState(null);
    const [query, setQuery] = useState('');
    const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'preview' | 'split'

    const textareaRef = useRef(null);

    // Undo / Redo history stacks
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const currentNoteIdRef = useRef(null);

    // Global-search jump: land pre-filtered.
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

    // Multi-select state
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const allSelected = visible.length > 0 && visible.every((n) => selectedIds.has(n.id));
    const someSelected = !allSelected && visible.some((n) => selectedIds.has(n.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            const next = new Set(selectedIds);
            visible.forEach((n) => next.add(n.id));
            setSelectedIds(next);
        }
    };

    const toggleSelectNote = (id, e) => {
        e?.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const deleteSelectedNotes = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        const confirmed = await confirm(
            `Delete ${count} note${count === 1 ? '' : 's'}?`,
            {
                body: count === 1
                    ? (doc.items?.[Array.from(selectedIds)[0]]?.title || 'Untitled note')
                    : `This will permanently remove ${count} selected notes.`,
                confirmLabel: `Delete ${count}`,
                danger: true,
            }
        );
        if (!confirmed) return;

        const backup = {};
        selectedIds.forEach((id) => {
            if (doc.items?.[id]) {
                backup[id] = doc.items[id];
            }
        });

        setDoc((prev) => {
            const nextItems = { ...prev.items };
            selectedIds.forEach((id) => {
                delete nextItems[id];
            });
            return { ...prev, items: nextItems };
        });

        if (selectedIds.has(activeId)) {
            setActiveId(null);
        }
        setSelectedIds(new Set());
        setIsSelecting(false);

        toast(`Deleted ${count} note${count === 1 ? '' : 's'}`, {
            kind: 'danger',
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    setDoc((prev) => ({
                        ...prev,
                        items: { ...prev.items, ...backup },
                    }));
                    toast(`Restored ${count} note${count === 1 ? '' : 's'}`);
                },
            },
        });
    };

    // Reset undo/redo when switching active note
    useEffect(() => {
        if (activeId !== currentNoteIdRef.current) {
            currentNoteIdRef.current = activeId;
            setUndoStack([]);
            setRedoStack([]);
        }
    }, [activeId]);

    const createNote = () => {
        const id = `n_${Date.now()}`;
        setDoc((prev) => ({
            ...prev,
            items: { ...prev.items, [id]: { id, title: 'Untitled note', body: '', tag: '', updatedAt: Date.now() } },
        }));
        setActiveId(id);
        toast('Note created');
    };

    const patchNote = useCallback((id, patch) => {
        setDoc((prev) => ({
            ...prev,
            items: { ...prev.items, [id]: { ...prev.items[id], ...patch, updatedAt: Date.now() } },
        }));
    }, [setDoc]);

    const updateBodyWithHistory = useCallback((newBody, newStart, newEnd) => {
        if (!active) return;
        setUndoStack((prev) => [...prev.slice(-40), active.body || '']);
        setRedoStack([]);
        patchNote(active.id, { body: newBody });

        if (newStart !== undefined && newEnd !== undefined) {
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newStart, newEnd);
                }
            });
        }
    }, [active, patchNote]);

    const handleUndo = useCallback(() => {
        if (!active || undoStack.length === 0) return;
        const prevText = undoStack[undoStack.length - 1];
        setUndoStack((prev) => prev.slice(0, -1));
        setRedoStack((prev) => [...prev.slice(-40), active.body || '']);
        patchNote(active.id, { body: prevText });
    }, [active, undoStack, patchNote]);

    const handleRedo = useCallback(() => {
        if (!active || redoStack.length === 0) return;
        const nextText = redoStack[redoStack.length - 1];
        setRedoStack((prev) => prev.slice(0, -1));
        setUndoStack((prev) => [...prev.slice(-40), active.body || '']);
        patchNote(active.id, { body: nextText });
    }, [active, redoStack, patchNote]);

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

    /** Toolbar formatting actions */
    const applyFormat = (type) => {
        const el = textareaRef.current;
        if (!el || !active) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = el.value || '';
        const selection = text.substring(start, end);

        const before = text.substring(0, start);
        const after = text.substring(end);
        let newText = text;
        let newStart = start;
        let newEnd = end;

        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = text.indexOf('\n', end);
        const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;

        switch (type) {
            case 'bold': {
                if (selection) {
                    newText = before + `**${selection}**` + after;
                    newStart = start + 2;
                    newEnd = end + 2;
                } else {
                    newText = before + `**bold text**` + after;
                    newStart = start + 2;
                    newEnd = start + 11;
                }
                break;
            }
            case 'italic': {
                if (selection) {
                    newText = before + `*${selection}*` + after;
                    newStart = start + 1;
                    newEnd = end + 1;
                } else {
                    newText = before + `*italic text*` + after;
                    newStart = start + 1;
                    newEnd = start + 12;
                }
                break;
            }
            case 'strikethrough': {
                if (selection) {
                    newText = before + `~~${selection}~~` + after;
                    newStart = start + 2;
                    newEnd = end + 2;
                } else {
                    newText = before + `~~strikethrough~~` + after;
                    newStart = start + 2;
                    newEnd = start + 15;
                }
                break;
            }
            case 'inline-code': {
                if (selection) {
                    newText = before + `\`${selection}\`` + after;
                    newStart = start + 1;
                    newEnd = end + 1;
                } else {
                    newText = before + `\`code\`` + after;
                    newStart = start + 1;
                    newEnd = start + 5;
                }
                break;
            }
            case 'h1':
            case 'h2':
            case 'h3': {
                const prefix = type === 'h1' ? '# ' : type === 'h2' ? '## ' : '### ';
                const currentLines = text.substring(lineStart, actualLineEnd).split('\n');
                const modifiedLines = currentLines.map(line => {
                    const clean = line.replace(/^#{1,6}\s*/, '');
                    return `${prefix}${clean}`;
                });
                const replacement = modifiedLines.join('\n');
                newText = text.substring(0, lineStart) + replacement + text.substring(actualLineEnd);
                newStart = lineStart + prefix.length;
                newEnd = lineStart + replacement.length;
                break;
            }
            case 'bullet-list': {
                const currentLines = text.substring(lineStart, actualLineEnd).split('\n');
                const modifiedLines = currentLines.map(line => {
                    if (line.startsWith('- ')) return line.slice(2);
                    if (line.match(/^\d+\.\s/)) return `- ${line.replace(/^\d+\.\s/, '')}`;
                    return `- ${line}`;
                });
                const replacement = modifiedLines.join('\n');
                newText = text.substring(0, lineStart) + replacement + text.substring(actualLineEnd);
                newStart = lineStart;
                newEnd = lineStart + replacement.length;
                break;
            }
            case 'numbered-list': {
                const currentLines = text.substring(lineStart, actualLineEnd).split('\n');
                const modifiedLines = currentLines.map((line, idx) => {
                    const clean = line.replace(/^(\d+\.\s*|-\s*)/, '');
                    return `${idx + 1}. ${clean}`;
                });
                const replacement = modifiedLines.join('\n');
                newText = text.substring(0, lineStart) + replacement + text.substring(actualLineEnd);
                newStart = lineStart;
                newEnd = lineStart + replacement.length;
                break;
            }
            case 'code-block': {
                if (selection) {
                    const replacement = `\`\`\`javascript\n${selection}\n\`\`\``;
                    newText = before + replacement + after;
                    newStart = start + 14;
                    newEnd = start + 14 + selection.length;
                } else {
                    const snippet = `\`\`\`javascript\n// write code here\n\`\`\``;
                    newText = before + snippet + after;
                    newStart = start + 14;
                    newEnd = start + 32;
                }
                break;
            }
            case 'quote': {
                const currentLines = text.substring(lineStart, actualLineEnd).split('\n');
                const modifiedLines = currentLines.map(line => {
                    if (line.startsWith('> ')) return line.slice(2);
                    return `> ${line}`;
                });
                const replacement = modifiedLines.join('\n');
                newText = text.substring(0, lineStart) + replacement + text.substring(actualLineEnd);
                newStart = lineStart;
                newEnd = lineStart + replacement.length;
                break;
            }
            default:
                return;
        }

        updateBodyWithHistory(newText, newStart, newEnd);
    };

    /** Keyboard enhancements: Tab indent, shortcuts, list auto-continue */
    const handleKeyDown = (e) => {
        if (!active) return;
        const el = textareaRef.current;
        if (!el) return;

        // Undo: Ctrl+Z / Cmd+Z (without shift)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
            return;
        }

        // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            handleRedo();
            return;
        }

        // Bold: Ctrl+B / Cmd+B
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            applyFormat('bold');
            return;
        }

        // Italic: Ctrl+I / Cmd+I
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            applyFormat('italic');
            return;
        }

        // Tab: Insert 2 spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const text = el.value || '';
            const newText = text.substring(0, start) + '  ' + text.substring(end);
            updateBodyWithHistory(newText, start + 2, start + 2);
            return;
        }

        // Enter: Auto-continue lists
        if (e.key === 'Enter' && !e.shiftKey) {
            const text = el.value || '';
            const pos = el.selectionStart;
            const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
            const currentLine = text.substring(lineStart, pos);

            // Empty bullet line -> terminate bullet
            if (/^[-*]\s*$/.test(currentLine)) {
                e.preventDefault();
                const newText = text.substring(0, lineStart) + text.substring(pos);
                updateBodyWithHistory(newText, lineStart, lineStart);
                return;
            }

            // Bullet list continuation
            const bulletMatch = currentLine.match(/^([-*]\s+)/);
            if (bulletMatch) {
                e.preventDefault();
                const prefix = '\n' + bulletMatch[1];
                const newText = text.substring(0, pos) + prefix + text.substring(pos);
                updateBodyWithHistory(newText, pos + prefix.length, pos + prefix.length);
                return;
            }

            // Empty numbered list line -> terminate numbered list
            if (/^\d+\.\s*$/.test(currentLine)) {
                e.preventDefault();
                const newText = text.substring(0, lineStart) + text.substring(pos);
                updateBodyWithHistory(newText, lineStart, lineStart);
                return;
            }

            // Numbered list continuation
            const numMatch = currentLine.match(/^(\d+)\.\s+/);
            if (numMatch) {
                e.preventDefault();
                const nextNum = parseInt(numMatch[1], 10) + 1;
                const prefix = `\n${nextNum}. `;
                const newText = text.substring(0, pos) + prefix + text.substring(pos);
                updateBodyWithHistory(newText, pos + prefix.length, pos + prefix.length);
                return;
            }
        }
    };

    /** Toggle a checkbox from inside the preview mode */
    const handleToggleTask = (targetLine) => {
        if (!active) return;
        const text = active.body || '';
        const isChecked = targetLine.includes('[x]') || targetLine.includes('[X]');
        const newLine = isChecked
            ? targetLine.replace(/\[(x|X)\]/, '[ ]')
            : targetLine.replace(/\[ \]/, '[x]');
        const newText = text.replace(targetLine, newLine);
        updateBodyWithHistory(newText);
    };

    // Note metrics
    const stats = useMemo(() => {
        const body = active?.body || '';
        const words = body.trim() ? body.trim().split(/\s+/).length : 0;
        const chars = body.length;
        const lines = body ? body.split('\n').length : 0;
        return { words, chars, lines };
    }, [active?.body]);

    const notesGrid = (
        <div className={`grid gap-3.5 ${floating ? 'h-full min-h-0 grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]' : 'gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]'}`}>
            {/* List - on narrow screens, hide if active note is being edited */}
            <div className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-panel ${floating ? 'h-full min-h-0' : 'max-h-[72vh]'} ${activeId ? (floating ? 'hidden md:flex' : 'hidden lg:flex') : 'flex'}`}>
                    <div className="border-b border-line p-3 space-y-2.5">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search notes..."
                                    className="w-full rounded-xl border border-line bg-raised/50 py-1.5 pl-9 pr-3 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSelecting((prev) => !prev);
                                    setSelectedIds(new Set());
                                }}
                                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 ${
                                    isSelecting
                                        ? 'border-accent bg-accent/15 text-accent-hi shadow-xs'
                                        : 'border-line bg-raised/40 text-muted hover:border-accent/40 hover:text-fg'
                                }`}
                                title={isSelecting ? 'Exit selection' : 'Select multiple notes'}
                            >
                                <CheckSquare className="size-3.5" />
                                <span>{isSelecting ? 'Done' : 'Select'}</span>
                            </button>
                        </div>

                        {/* Multi-select Action Bar */}
                        {isSelecting && (
                            <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2 text-xs">
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-1.5 font-medium text-subtle hover:text-fg transition-colors"
                                >
                                    {allSelected ? (
                                        <CheckSquare className="size-4 text-accent-hi" />
                                    ) : someSelected ? (
                                        <MinusSquare className="size-4 text-accent-hi" />
                                    ) : (
                                        <Square className="size-4 text-subtle" />
                                    )}
                                    <span>{allSelected ? 'Deselect all' : `Select all (${visible.length})`}</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] text-subtle">
                                        {selectedIds.size} selected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={deleteSelectedNotes}
                                        disabled={selectedIds.size === 0}
                                        className="flex items-center gap-1 rounded-lg bg-rose-500/90 px-2.5 py-1 font-semibold text-white transition-opacity hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                                    >
                                        <Trash2 className="size-3" />
                                        <span>Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-line/40">
                        {visible.length === 0 && (
                            <p className="px-4 py-12 text-center text-sm text-subtle">
                                {notes.length === 0 ? 'No notes yet. Create one.' : 'No matches found.'}
                            </p>
                        )}
                        {visible.map((n) => {
                            const isSelected = selectedIds.has(n.id);
                            return (
                                <button
                                    key={n.id}
                                    onClick={(e) => {
                                        if (isSelecting) {
                                            toggleSelectNote(n.id, e);
                                        } else {
                                            setActiveId(n.id);
                                        }
                                    }}
                                    className={`w-full px-4 py-3 text-left transition-colors flex items-start gap-3
                                        ${isSelecting && isSelected ? 'bg-accent/15 border-l-2 border-l-accent' : ''}
                                        ${!isSelecting && activeId === n.id ? 'bg-accent/10' : ''}
                                        ${!(isSelecting && isSelected) && (!(!isSelecting && activeId === n.id)) ? 'hover:bg-raised/40' : ''}`}
                                >
                                    {isSelecting && (
                                        <div className="mt-0.5 shrink-0">
                                            {isSelected ? (
                                                <CheckSquare className="size-4 text-accent-hi" />
                                            ) : (
                                                <Square className="size-4 text-subtle/70" />
                                            )}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-fg">{n.title || 'Untitled note'}</div>
                                        <div className="mt-0.5 truncate text-xs text-subtle">{n.body.slice(0, 70) || 'Empty note'}</div>
                                        {n.tag && (
                                            <span className="mt-1.5 inline-block rounded-md border border-line/60 bg-raised px-1.5 py-0.5 text-[10px] font-medium text-subtle">{n.tag}</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Editor - on narrow screens, hide if no note selected */}
                <div className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-panel ${floating ? 'h-full min-h-0' : 'min-h-[540px]'} ${!activeId ? (floating ? 'hidden md:flex' : 'hidden lg:flex') : 'flex'}`}>
                    {!active ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                            <StickyNote className="mb-3 size-12 text-faint" />
                            <p className="text-subtle">Select a note from the left, or create a new one.</p>
                        </div>
                    ) : (
                        <>
                            {/* Note Header: Title, Tag, Delete */}
                            <div className="flex items-center gap-2 border-b border-line p-3 sm:gap-3 sm:p-4">
                                <button
                                    onClick={() => setActiveId(null)}
                                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-raised/60 text-muted transition-colors hover:text-fg ${floating ? 'md:hidden' : 'lg:hidden'}`}
                                    title="Back to notes list"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-faint">Document Title</label>
                                    <input
                                        value={active.title}
                                        onChange={(e) => patchNote(active.id, { title: e.target.value })}
                                        placeholder="e.g. Getting Started with React 19 Server Components"
                                        className="w-full bg-transparent text-base font-semibold text-fg placeholder:text-faint focus:outline-none sm:text-lg"
                                    />
                                </div>
                                <div className="shrink-0">
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-faint">Tag</label>
                                    <input
                                        value={active.tag || ''}
                                        onChange={(e) => patchNote(active.id, { tag: e.target.value })}
                                        placeholder="tag"
                                        className="w-16 rounded-lg border border-line bg-raised/50 px-2 py-1 text-xs text-muted focus:border-accent focus:outline-none sm:w-24"
                                    />
                                </div>
                                <button
                                    onClick={() => deleteNote(active.id)}
                                    className="mt-3.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                                    title="Delete note"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>

                            {/* Section Header: Document Content & Toolbar */}
                            <div className="border-b border-line/70 bg-surface/30">
                                <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
                                    Document Content
                                </div>
                                <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
                                    {/* Inline formatting */}
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
                                        title="Bold (Ctrl+B)"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg font-bold text-xs"
                                    >
                                        B
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
                                        title="Italic (Ctrl+I)"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg italic font-serif text-sm"
                                    >
                                        /
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('strikethrough'); }}
                                        title="Strikethrough"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg font-semibold text-xs line-through"
                                    >
                                        S
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('inline-code'); }}
                                        title="Inline Code"
                                        className="flex h-7 px-1.5 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg font-mono text-xs font-semibold"
                                    >
                                        &lt;/&gt;
                                    </button>

                                    <div className="mx-1 h-4 w-px bg-line/60 shrink-0" />

                                    {/* Headings */}
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('h1'); }}
                                        title="Heading 1"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg font-mono text-xs font-bold"
                                    >
                                        H1
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('h2'); }}
                                        title="Heading 2"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg font-mono text-xs font-bold"
                                    >
                                        H2
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('h3'); }}
                                        title="Heading 3"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg font-mono text-xs font-bold"
                                    >
                                        H3
                                    </button>

                                    <div className="mx-1 h-4 w-px bg-line/60 shrink-0" />

                                    {/* Lists and Block formatting */}
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('bullet-list'); }}
                                        title="Bullet List"
                                        className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-subtle transition-colors hover:bg-raised hover:text-fg"
                                    >
                                        <span className="text-base leading-none">•</span> Bullet List
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('numbered-list'); }}
                                        title="Numbered List"
                                        className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-subtle transition-colors hover:bg-raised hover:text-fg"
                                    >
                                        <span className="font-mono text-[11px]">1.</span> Numbered List
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('code-block'); }}
                                        title="Code Block"
                                        className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-subtle transition-colors hover:bg-raised hover:text-fg"
                                    >
                                        Code Block
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); applyFormat('quote'); }}
                                        title="Quote"
                                        className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-subtle transition-colors hover:bg-raised hover:text-fg"
                                    >
                                        <span className="font-serif italic font-bold">"</span> Quote
                                    </button>

                                    <div className="mx-1 h-4 w-px bg-line/60 shrink-0" />

                                    {/* Undo / Redo */}
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); handleUndo(); }}
                                        disabled={undoStack.length === 0}
                                        title="Undo (Ctrl+Z)"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Undo2 className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); handleRedo(); }}
                                        disabled={redoStack.length === 0}
                                        title="Redo (Ctrl+Y)"
                                        className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Redo2 className="size-3.5" />
                                    </button>

                                    {/* Mode View Switcher: Write, Preview, Split */}
                                    <div className="ml-auto flex items-center gap-1 rounded-xl border border-line bg-raised/50 p-0.5 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('edit')}
                                            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${viewMode === 'edit' ? 'bg-accent text-white font-medium shadow-xs' : 'text-subtle hover:text-fg'}`}
                                            title="Write Mode"
                                        >
                                            <Edit3 className="size-3" />
                                            <span>Write</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('preview')}
                                            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${viewMode === 'preview' ? 'bg-accent text-white font-medium shadow-xs' : 'text-subtle hover:text-fg'}`}
                                            title="Preview Mode"
                                        >
                                            <Eye className="size-3" />
                                            <span>Preview</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode(viewMode === 'split' ? 'edit' : 'split')}
                                            className={`hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${viewMode === 'split' ? 'bg-accent text-white font-medium shadow-xs' : 'text-subtle hover:text-fg'}`}
                                            title="Side-by-side Split View"
                                        >
                                            <Columns2 className="size-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Editor & Preview Body */}
                            <div className={`flex-1 flex overflow-hidden ${floating ? 'min-h-0' : 'min-h-[360px]'}`}>
                                {/* Write / Textarea */}
                                {(viewMode === 'edit' || viewMode === 'split') && (
                                    <div className={`flex-1 flex flex-col ${viewMode === 'split' ? 'border-r border-line' : ''}`}>
                                        <textarea
                                            ref={textareaRef}
                                            value={active.body}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setUndoStack((prev) => [...prev.slice(-40), active.body || '']);
                                                setRedoStack([]);
                                                patchNote(active.id, { body: val });
                                            }}
                                            onKeyDown={handleKeyDown}
                                            onBlur={() => toast('Note saved', { kind: 'info' })}
                                            placeholder="Write your note in markdown...&#10;&#10;Use the toolbar above or shortcuts:&#10;• Ctrl+B for bold&#10;• Ctrl+I for italic&#10;• Enter to continue lists&#10;• Tab for 2 spaces"
                                            className="flex-1 w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-fg placeholder:text-faint focus:outline-none overflow-y-auto"
                                            spellCheck="false"
                                        />
                                    </div>
                                )}

                                {/* Rendered Preview */}
                                {(viewMode === 'preview' || viewMode === 'split') && (
                                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-surface/20">
                                        <NoteMarkdown text={active.body} onToggleTask={handleToggleTask} />
                                    </div>
                                )}
                            </div>

                            {/* Footer Metrics */}
                            <div className="flex items-center justify-between border-t border-line/60 bg-raised/20 px-4 py-2 text-[11px] text-subtle">
                                <div className="flex items-center gap-3 font-mono">
                                    <span>{stats.words} words</span>
                                    <span>•</span>
                                    <span>{stats.chars} characters</span>
                                    <span>•</span>
                                    <span>{stats.lines} lines</span>
                                </div>
                                <div className="hidden sm:block text-[11px] text-faint">
                                    Markdown supported • Tab indents • Auto-continue lists
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
    );

    if (floating) {
        return (
            <FloatingPanel
                title={active?.title ? `Notes - ${active.title}` : 'Notes'}
                icon={<StickyNote className="size-4 shrink-0 text-accent-hi" />}
                initialWidth={typeof window !== 'undefined' ? Math.min(920, window.innerWidth - 16) : 920}
                initialHeight={typeof window !== 'undefined' ? Math.min(620, window.innerHeight - 80) : 620}
                minW={220}
                minH={180}
                keepAspect={false}
                allowOffscreen
                onClose={onClose || (() => {})}
                bodyClassName="overflow-hidden"
            >
                <div className="flex h-full flex-col overflow-hidden p-2.5 gap-2">
                    <div className="flex items-center justify-between gap-2 px-1 border-b border-line/60 pb-2">
                        <SyncBadge status={status} loading={loading} />
                        <button
                            onClick={createNote}
                            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-accent-hi shadow-xs"
                        >
                            <Plus className="size-3.5" /> New note
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        {notesGrid}
                    </div>
                </div>
            </FloatingPanel>
        );
    }

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
                        className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi shadow-sm shadow-accent/20"
                    >
                        <Plus className="size-4" /> New note
                    </button>
                </div>
            </div>

            {notesGrid}
        </div>
    );
};

export default Notes;
