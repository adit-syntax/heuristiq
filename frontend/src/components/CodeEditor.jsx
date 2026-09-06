import { useState, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Loader2, Terminal } from 'lucide-react';
import { LANGUAGES, getLanguage, runCode } from '../lib/runner';
import useSyncedDoc from '../hooks/useSyncedDoc';
import { SyncBadge } from './Notes';
import useToast from '../hooks/useToast';

const EMPTY = { drafts: {} };

/**
 * Monaco editor + Wandbox runner. Drafts are keyed by `storageKey` so a
 * per-question editor and the playground share one synced document.
 *
 * Mount only one of these at a time - each instance owns a copy of the
 * `code` document and the last writer wins.
 */
const CodeEditor = ({ storageKey = 'playground', theme = 'dark', heading = null, compact = false, fill = false }) => {
    const [doc, setDoc, { loading, status }] = useSyncedDoc('code', EMPTY);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [stdin, setStdin] = useState('');
    const { toast, confirm } = useToast();

    const draft = doc.drafts?.[storageKey];
    const langId = draft?.lang || 'cpp';
    const lang = useMemo(() => getLanguage(langId), [langId]);
    const source = draft?.source ?? lang.template;

    const setDraft = useCallback((patch) => {
        setDoc((prev) => ({
            ...prev,
            drafts: {
                ...prev.drafts,
                [storageKey]: { lang: langId, source, ...prev.drafts?.[storageKey], ...patch },
            },
        }));
    }, [setDoc, storageKey, langId, source]);

    const changeLanguage = (id) => {
        const next = getLanguage(id);
        // Only clobber the buffer if it is still the untouched template.
        const untouched = source.trim() === lang.template.trim();
        setDraft({ lang: id, source: untouched ? next.template : source });
    };

    const reset = async () => {
        if (!await confirm('Replace your code with the starter template?', {
            body: 'Your current buffer will be lost.',
            confirmLabel: 'Reset code',
            danger: true,
        })) return;
        setDraft({ source: lang.template });
        toast('Code reset to template');
    };

    const handleRun = async () => {
        setRunning(true);
        setResult(null);
        setResult(await runCode(langId, source, stdin));
        setRunning(false);
    };

    return (
        <div className={`flex flex-col gap-3 ${fill ? 'h-full min-h-0' : ''}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                {heading}
                <select
                    value={langId}
                    onChange={(e) => changeLanguage(e.target.value)}
                    className="cursor-pointer rounded-xl border border-line bg-raised/60 px-3 py-2 text-sm text-fg transition-colors focus:border-accent focus:outline-none"
                >
                    {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>

                <button
                    onClick={handleRun}
                    disabled={running || loading}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    {running ? 'Running' : 'Run'}
                </button>

                <button
                    onClick={reset}
                    title="Reset to template"
                    className="flex size-9 items-center justify-center rounded-xl border border-line bg-raised/60 text-muted transition-colors hover:text-fg"
                >
                    <RotateCcw className="size-4" />
                </button>

                <div className="ml-auto"><SyncBadge status={status} loading={loading} /></div>
            </div>

            {/* Editor - fixed height inline, flexible when filling a panel */}
            <div className={`overflow-hidden rounded-xl border border-line bg-panel
                ${fill ? 'min-h-[220px] flex-1' : compact ? 'h-[38vh] sm:h-[45vh] min-h-[240px]' : 'h-[42vh] sm:h-[55vh] min-h-[260px]'}`}>
                <Editor
                    language={lang.monaco}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    value={source}
                    onChange={(v) => setDraft({ source: v ?? '' })}
                    loading={<div className="p-4 text-sm text-subtle">Loading editor...</div>}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontLigatures: true,
                        fontFamily: '"JetBrains Mono", monospace',
                        tabSize: 4,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        padding: { top: 12 },
                    }}
                />
            </div>

            {/* Stdin + output */}
            <div className={`grid gap-3 ${fill ? 'shrink-0' : ''} grid-cols-1 md:grid-cols-2`}>
                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-subtle">Input (stdin)</label>
                    <textarea
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        placeholder="Test input passed to your program..."
                        spellCheck="false"
                        className="h-24 w-full resize-none rounded-xl border border-line bg-app/60 p-3 font-mono text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none sm:h-28"
                    />
                </div>
                <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-subtle">
                        <Terminal className="size-3.5" /> Output
                    </label>
                    <pre
                        className={`h-24 w-full overflow-auto whitespace-pre-wrap rounded-xl border p-3 font-mono text-sm sm:h-28
                            ${result?.error ? 'border-rose-500/30 bg-app/60 text-rose-400' : 'border-line bg-app/60 text-fg'}`}
                    >
                        {running ? 'Running...' : result ? (result.error ? `${result.error}\n${result.output}` : result.output) : 'Run your code to see output.'}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default CodeEditor;
