import { useState, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Loader2, Terminal, Info, Cpu, ShieldCheck, X } from 'lucide-react';
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
    const [showEngineInfo, setShowEngineInfo] = useState(false);
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
        <div className={`w-full max-w-full min-w-0 flex flex-col gap-2.5 sm:gap-3 ${fill ? 'h-full min-h-0' : ''}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {heading}
                    <select
                        value={langId}
                        onChange={(e) => changeLanguage(e.target.value)}
                        className="cursor-pointer rounded-xl border border-line bg-raised/60 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-fg transition-colors focus:border-accent focus:outline-none"
                    >
                        {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                    </select>

                    <button
                        onClick={handleRun}
                        disabled={running || loading}
                        className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-500 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {running ? <Loader2 className="size-3.5 sm:size-4 animate-spin" /> : <Play className="size-3.5 sm:size-4" />}
                        {running ? 'Running' : 'Run'}
                    </button>

                    <button
                        onClick={reset}
                        title="Reset to template"
                        className="flex size-8 sm:size-9 items-center justify-center rounded-xl border border-line bg-raised/60 text-muted transition-colors hover:text-fg"
                    >
                        <RotateCcw className="size-3.5 sm:size-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                    <button
                        onClick={() => setShowEngineInfo(true)}
                        title="Execution Engine & Automatic Fallback Details"
                        className="group flex items-center gap-1.5 rounded-xl border border-line bg-raised/60 px-2 sm:px-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium text-subtle transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent-hi"
                    >
                        <Cpu className="size-3 sm:size-3.5 text-accent-hi" />
                        <span className="hidden sm:inline">Engine:</span>
                        <span className="font-semibold text-fg group-hover:text-accent-hi">Judge0</span>
                        <span className="hidden md:inline text-faint">·</span>
                        <span className="hidden md:inline text-emerald-400">Fallback Ready</span>
                        <Info className="size-3 text-subtle group-hover:text-accent-hi" />
                    </button>
                    <SyncBadge status={status} loading={loading} />
                </div>
            </div>

            {/* Editor - fixed height inline, flexible when filling a panel */}
            <div className={`w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-line bg-panel
                ${fill ? 'min-h-[220px] flex-1' : compact ? 'h-[36vh] sm:h-[45vh] min-h-[220px]' : 'h-[42vh] sm:h-[55vh] min-h-[260px]'}`}>
                <Editor
                    language={lang.monaco}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    value={source}
                    onChange={(v) => setDraft({ source: v ?? '' })}
                    loading={<div className="p-4 text-sm text-subtle">Loading editor...</div>}
                    options={{
                        minimap: { enabled: false },
                        fontSize: typeof window !== 'undefined' && window.innerWidth < 640 ? 13 : 14,
                        fontLigatures: true,
                        fontFamily: '"JetBrains Mono", monospace',
                        tabSize: 4,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        wrappingStrategy: 'advanced',
                        padding: { top: 12 },
                        lineNumbersMinChars: 3,
                        glyphMargin: false,
                        overviewRulerLanes: 0,
                        scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                        },
                    }}
                />
            </div>

            {/* Stdin + output */}
            <div className={`grid w-full max-w-full min-w-0 gap-3 ${fill ? 'shrink-0' : ''} grid-cols-1 md:grid-cols-2`}>
                <div className="w-full min-w-0">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-subtle">Input (stdin)</label>
                    <textarea
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        placeholder="Test input passed to your program..."
                        spellCheck="false"
                        className="h-24 w-full resize-none rounded-xl border border-line bg-app/60 p-3 font-mono text-xs sm:text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none sm:h-28"
                    />
                </div>
                <div className="w-full min-w-0">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-subtle">
                        <Terminal className="size-3.5" /> Output
                    </label>
                    <pre
                        className={`h-24 w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border p-3 font-mono text-xs sm:text-sm sm:h-28
                            ${result?.error ? 'border-rose-500/30 bg-app/60 text-rose-400' : 'border-line bg-app/60 text-fg'}`}
                    >
                        {running ? 'Running...' : result ? (result.error ? `${result.error}\n${result.output}` : result.output) : 'Run your code to see output.'}
                    </pre>
                </div>
            </div>

            {/* Runner Engine Info Modal */}
            {showEngineInfo && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowEngineInfo(false)}
                >
                    <div
                        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-panel p-5 sm:p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                                    <Cpu className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-fg">Code Execution Engine</h3>
                                    <p className="text-xs text-subtle">High-availability dual-runner architecture</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEngineInfo(false)}
                                className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted">
                            <div className="rounded-xl border border-line/60 bg-raised/40 p-3.5">
                                <div className="flex items-center gap-2 font-semibold text-fg">
                                    <span className="size-2 rounded-full bg-blue-400 animate-pulse" />
                                    Primary Runner: Judge0 CE
                                </div>
                                <p className="mt-1 text-subtle">
                                    Executes your code on high-performance sandbox compilers (GCC 14.1 for C/C++, Python 3.12, OpenJDK 17, Node.js 20) with fast response times and stdin streaming.
                                </p>
                            </div>

                            <div className="rounded-xl border border-line/60 bg-raised/40 p-3.5">
                                <div className="flex items-center gap-2 font-semibold text-fg">
                                    <span className="size-2 rounded-full bg-emerald-400" />
                                    Automatic Failover: Wandbox Sandbox
                                </div>
                                <p className="mt-1 text-subtle">
                                    If Judge0 ever experiences high traffic, maintenance, or rate limits, Heuristiq automatically re-routes your code to Wandbox as an instant backup runner with zero interruptions.
                                </p>
                            </div>

                            <div className="rounded-xl border border-line/60 bg-raised/40 p-3.5">
                                <div className="flex items-center gap-2 font-semibold text-fg">
                                    <ShieldCheck className="size-4 text-accent-hi" />
                                    100% Free & No Setup Required
                                </div>
                                <p className="mt-1 text-subtle">
                                    Runs completely in the cloud without requiring an account, API key, or credit card.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setShowEngineInfo(false)}
                                className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeEditor;
