import { useEffect, useState } from 'react';
import { X, StickyNote, Tags } from 'lucide-react';

/** Per-question note: company tags + the sheet author's remark (MIK) shown
 *  read-only, the note itself prefilled from that remark and editable. */
const QuestionNoteModal = ({ question, note, tags, onSave, onTagsChange, onClose }) => {
    // Copy-on-write: start from the personal note, else the sheet's remark.
    // Nothing is saved until the user actually edits.
    const [value, setValue] = useState(note || question.learn || '');
    const [tagValue, setTagValue] = useState(tags || '');
    const prefilled = !note && !!question.learn;

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const companies = (question.companies || '')
        .split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);

    const onChange = (v) => {
        setValue(v);
        onSave(question.id, v);
    };

    const onTags = (v) => {
        setTagValue(v);
        onTagsChange(question.id, v);
    };

    const userTags = tagValue.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-4 border-b border-line p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold sm:text-xl">{question.problem}</h2>
                        <p className="mt-0.5 font-mono text-xs text-subtle">{question.topic} · {question.subtopic}</p>
                        {companies.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {companies.map((c) => (
                                    <span key={c} className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-400">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-5">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
                        <Tags className="size-4 text-violet-400" /> Your tags
                    </label>
                    <input
                        type="text"
                        value={tagValue}
                        onChange={(e) => onTags(e.target.value)}
                        placeholder="important, revise-later, heap..."
                        className="w-full rounded-xl border border-line bg-raised/40 px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                    />
                    {userTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {userTags.map((t) => (
                                <span key={t} className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-400">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}

                    <label className="mb-2 mt-4 flex items-center gap-2 text-sm font-medium text-muted">
                        <StickyNote className="size-4 text-amber-500" /> Your note
                    </label>
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Your approach, mistakes, intuitions, complexity..."
                        rows={8}
                        autoFocus
                        className="w-full resize-y rounded-xl border border-line bg-raised/40 p-3 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-subtle">
                        {prefilled
                            ? 'Prefilled from MIK\'s sheet - edit to make it yours. Emptying it restores his version.'
                            : 'Autosaves to your account.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QuestionNoteModal;
