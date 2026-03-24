import { useEffect, useState } from 'react';
import { X, ExternalLink, Youtube, FileText, BookOpen, CheckCircle2 } from 'lucide-react';
import CodeEditor from './CodeEditor';
import VideoModal from './VideoModal';

const LINKS = [
    { key: 'questionLink', label: 'Article', icon: FileText, colour: 'text-cyan-500' },
    { key: 'youTubeLink', label: 'Video', icon: Youtube, colour: 'text-rose-400' },
    { key: 'leetCodeLink', label: 'LeetCode', icon: ExternalLink, colour: 'text-amber-500' },
    { key: 'gfgLink', label: 'GFG', icon: BookOpen, colour: 'text-emerald-500' },
];

/** Full-screen editor for one question. Drafts persist per question id. */
const SolveModal = ({ question, status, onStatusChange, onClose, theme }) => {
    const [videoOpen, setVideoOpen] = useState(false);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    if (!question) return null;

    return (
        <>
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
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-5">
                    <CodeEditor storageKey={`q_${question.id}`} theme={theme} compact />
                </div>
            </div>
        </div>

        {/* Sibling, not child: clicks on the player must not close the editor overlay. */}
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
