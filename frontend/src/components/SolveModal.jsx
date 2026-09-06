import { useEffect, useState } from 'react';
import { X, ExternalLink, Youtube, FileText, BookOpen, CheckCircle2, PictureInPicture2, Pin, SquareCode } from 'lucide-react';
import CodeEditor from './CodeEditor';
import VideoModal from './VideoModal';
import FloatingPanel from './FloatingPanel';

const LINKS = [
    { key: 'questionLink', label: 'Article', icon: FileText, colour: 'text-cyan-500' },
    { key: 'youTubeLink', label: 'Video', icon: Youtube, colour: 'text-rose-400' },
    { key: 'leetCodeLink', label: 'LeetCode', icon: ExternalLink, colour: 'text-amber-500' },
    { key: 'gfgLink', label: 'GFG', icon: BookOpen, colour: 'text-emerald-500' },
];

/**
 * Question code editor modal. Supports both full-screen modal docking
 * and floating PiP mode so users can drag/resize and code beside the sheets.
 */
const SolveModal = ({ question, status, onStatusChange, onClose, theme }) => {
    const [videoOpen, setVideoOpen] = useState(false);
    const [floating, setFloating] = useState(() => {
        try {
            return localStorage.getItem('heuristiq_solve_floating') === 'true';
        } catch {
            return false;
        }
    });

    const handleSetFloating = (val) => {
        setFloating(val);
        try {
            localStorage.setItem('heuristiq_solve_floating', val ? 'true' : 'false');
        } catch {}
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (videoOpen) {
                    setVideoOpen(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', onKey);

        // Only lock background body scrolling when docked in center modal mode.
        // When floating, user needs full ability to browse/scroll the sheet behind.
        if (!floating) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose, floating, videoOpen]);

    if (!question) return null;

    return (
        <>
            {floating ? (
                /* Floating PiP Panel: draggable, 8-way resizable, works beside any sheet */
                <FloatingPanel
                    title={question.problem}
                    icon={<SquareCode className="size-4 shrink-0 text-accent-hi" />}
                    initialWidth={Math.min(920, window.innerWidth - 32)}
                    initialHeight={Math.min(680, window.innerHeight - 60)}
                    minW={460}
                    minH={360}
                    keepAspect={false}
                    allowOffscreen
                    onClose={onClose}
                    bodyClassName="overflow-hidden flex flex-col h-full"
                >
                    <div className="flex h-full flex-col overflow-hidden">
                        {/* Compact action bar: topic/subtopic, links, solved toggle, and dock button */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 bg-raised/40 px-3 py-2 text-xs shrink-0">
                            <div className="flex items-center gap-2 font-mono text-[11px] text-subtle min-w-0">
                                <span className="font-semibold text-fg truncate max-w-[180px]">{question.topic || 'DSA'}</span>
                                {question.subtopic && (
                                    <>
                                        <span>·</span>
                                        <span className="truncate max-w-[140px]">{question.subtopic}</span>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {LINKS.filter((l) => question[l.key]).map((l) =>
                                    l.key === 'youTubeLink' ? (
                                        <button
                                            key={l.key}
                                            onClick={() => setVideoOpen(true)}
                                            className="flex items-center gap-1 rounded-lg border border-line bg-panel px-2 py-1 text-[11px] text-muted hover:bg-raised hover:text-fg transition-colors"
                                        >
                                            <l.icon className={`size-3 ${l.colour}`} /> {l.label}
                                        </button>
                                    ) : (
                                        <a
                                            key={l.key}
                                            href={question[l.key]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 rounded-lg border border-line bg-panel px-2 py-1 text-[11px] text-muted hover:bg-raised hover:text-fg transition-colors"
                                        >
                                            <l.icon className={`size-3 ${l.colour}`} /> {l.label}
                                        </a>
                                    )
                                )}
                                <button
                                    onClick={() => onStatusChange(question.id, status === 'solved' ? 'unsolved' : 'solved')}
                                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                                        status === 'solved'
                                            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500'
                                            : 'border-line bg-panel text-muted hover:bg-raised hover:text-fg'
                                    }`}
                                >
                                    <CheckCircle2 className="size-3" />
                                    {status === 'solved' ? 'Solved' : 'Mark solved'}
                                </button>
                                <button
                                    onClick={() => handleSetFloating(false)}
                                    className="flex items-center gap-1 rounded-lg border border-line bg-panel px-2 py-1 text-[11px] text-muted hover:bg-raised hover:text-fg transition-colors"
                                    title="Dock editor back into center modal"
                                >
                                    <Pin className="size-3 text-accent-hi" />
                                    <span>Dock</span>
                                </button>
                            </div>
                        </div>

                        {/* Editor body taking full remaining height */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                            <CodeEditor storageKey={`q_${question.id}`} theme={theme} fill />
                        </div>
                    </div>
                </FloatingPanel>
            ) : (
                /* Docked Center Modal Overlay */
                <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-2 backdrop-blur-sm sm:p-6" onClick={onClose}>
                    <div
                        className="my-auto w-full max-w-6xl rounded-2xl border border-line bg-panel shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 border-b border-line p-4 sm:p-5">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-semibold sm:text-xl">{question.problem}</h2>
                                <p className="mt-0.5 font-mono text-xs text-subtle">{question.topic} · {question.subtopic}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {LINKS.filter((l) => question[l.key]).map((l) =>
                                        l.key === 'youTubeLink' ? (
                                            <button
                                                key={l.key}
                                                onClick={() => setVideoOpen(true)}
                                                className="flex items-center gap-1.5 rounded-xl border border-line bg-raised/50 px-3 py-1.5 text-xs text-muted transition-colors hover:bg-raised hover:text-fg"
                                            >
                                                <l.icon className={`size-3.5 ${l.colour}`} /> {l.label}
                                            </button>
                                        ) : (
                                            <a
                                                key={l.key} href={question[l.key]} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 rounded-xl border border-line bg-raised/50 px-3 py-1.5 text-xs text-muted transition-colors hover:bg-raised hover:text-fg"
                                            >
                                                <l.icon className={`size-3.5 ${l.colour}`} /> {l.label}
                                            </a>
                                        )
                                    )}
                                    <button
                                        onClick={() => onStatusChange(question.id, status === 'solved' ? 'unsolved' : 'solved')}
                                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors
                                            ${status === 'solved'
                                                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500'
                                                : 'border-line bg-raised/50 text-muted hover:bg-raised hover:text-fg'}`}
                                    >
                                        <CheckCircle2 className="size-3.5" />
                                        {status === 'solved' ? 'Solved' : 'Mark solved'}
                                    </button>
                                    <button
                                        onClick={() => handleSetFloating(true)}
                                        className="flex items-center gap-1.5 rounded-xl border border-line bg-raised/50 px-3 py-1.5 text-xs text-muted transition-colors hover:bg-raised hover:text-fg"
                                        title="Pop the editor out - drag and resize while browsing the sheet"
                                    >
                                        <PictureInPicture2 className="size-3.5 text-accent-hi" />
                                        <span>Float editor</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => handleSetFloating(true)}
                                    className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                                    title="Float editor"
                                >
                                    <PictureInPicture2 className="size-4" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                                    title="Close"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5">
                            <CodeEditor storageKey={`q_${question.id}`} theme={theme} compact />
                        </div>
                    </div>
                </div>
            )}

            {/* Sibling video modal */}
            {videoOpen && (
                <VideoModal
                    url={question.youTubeLink}
                    title={question.problem}
                    onClose={() => setVideoOpen(false)}
                />
            )}
        </>
    );
};

export default SolveModal;
