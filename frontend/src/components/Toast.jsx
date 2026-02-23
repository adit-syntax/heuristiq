import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, Trash2, Info, X, Undo2 } from 'lucide-react';
import { ToastCtx } from './ToastCtx';

// App-wide toast + in-app confirm. Replaces every window.confirm/alert so
// nothing OS-native ever pops up. Toasts support an optional action button
// (e.g. Undo) that keeps the toast around until clicked or expired.

const ToastUI = ({ toasts, dismiss, runAction }) => (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[120] flex w-80 flex-col gap-2 md:bottom-6">
        {toasts.map((t) => (
            <div
                key={t.id}
                className="pointer-events-auto flex items-start gap-2.5 rounded-2xl border border-line bg-panel p-3.5 shadow-2xl animate-fade-in"
            >
                {t.kind === 'success' && <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-emerald-500" />}
                {t.kind === 'danger' && <Trash2 className="mt-0.5 size-4.5 shrink-0 text-rose-400" />}
                {t.kind === 'info' && <Info className="mt-0.5 size-4.5 shrink-0 text-accent-hi" />}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{t.message}</p>
                    {t.detail && <p className="mt-0.5 truncate text-xs text-subtle">{t.detail}</p>}
                    {t.action && (
                        <button
                            onClick={() => runAction(t)}
                            className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-raised px-2.5 py-1 text-xs font-semibold text-accent-hi transition-colors hover:bg-accent/15"
                        >
                            <Undo2 className="size-3" /> {t.action.label}
                        </button>
                    )}
                </div>
                <button
                    onClick={() => dismiss(t.id)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                >
                    <X className="size-3.5" />
                </button>
            </div>
        ))}
    </div>
);

const ConfirmUI = ({ state, onAnswer }) => {
    if (!state) return null;
    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => onAnswer(false)}>
            <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold">{state.title}</h3>
                {state.body && <p className="mt-1.5 text-sm text-subtle">{state.body}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={() => onAnswer(false)}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onAnswer(true)}
                        autoFocus
                        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors
                            ${state.danger ? 'bg-rose-500 hover:bg-rose-400' : 'bg-accent hover:bg-accent-hi'}`}
                    >
                        {state.confirmLabel || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/** In-app replacement for window.prompt. Resolves with the string, or null
 *  on cancel. Enter submits, Esc cancels, backdrop cancels. Always rendered
 *  with a state object (parent keys it per prompt). */
const PromptUI = ({ state, onResolve }) => {
    const [value, setValue] = useState(state.initialValue || '');
    const submit = () => {
        const v = value.trim();
        onResolve(v === '' && !state.allowEmpty ? null : v);
    };
    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => onResolve(null)}
        >
            <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold">{state.title}</h3>
                {state.body && <p className="mt-1.5 text-sm text-subtle">{state.body}</p>}
                <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submit(); }
                        if (e.key === 'Escape') { e.preventDefault(); onResolve(null); }
                    }}
                    placeholder={state.placeholder || ''}
                    className="mt-4 w-full rounded-xl border border-line bg-raised/40 px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                />
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={() => onResolve(null)}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hi"
                    >
                        {state.confirmLabel || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmState, setConfirmState] = useState(null);
    const [promptState, setPromptState] = useState(null);
    const seqRef = useRef(0);

    const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

    const toast = useCallback((message, { detail = '', kind = 'success', action = null, duration = 3200 } = {}) => {
        const id = ++seqRef.current;
        setToasts((t) => [...t, { id, message, detail, kind, action }].slice(-4));
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
    }, []);

    // Run a toast's action (e.g. Undo) and dismiss it.
    const runAction = useCallback((t) => {
        t.action?.onClick?.();
        dismiss(t.id);
    }, [dismiss]);

    // In-app replacement for window.confirm. Returns a promise<boolean>.
    const confirm = useCallback((title, { body = '', confirmLabel = 'Confirm', danger = false } = {}) =>
        new Promise((resolve) => {
            setConfirmState({ title, body, confirmLabel, danger, resolve });
        }), []);

    // In-app replacement for window.prompt. Returns a promise<string|null>.
    const prompt = useCallback((title, { body = '', initialValue = '', placeholder = '', confirmLabel = 'OK', allowEmpty = false } = {}) =>
        new Promise((resolve) => {
            setPromptState({ title, body, initialValue, placeholder, confirmLabel, allowEmpty, resolve, key: ++seqRef.current });
        }), []);

    const onAnswer = (answer) => {
        confirmState?.resolve(answer);
        setConfirmState(null);
    };

    const onPromptResolve = (value) => {
        promptState?.resolve(value);
        setPromptState(null);
    };

    return (
        <ToastCtx.Provider value={{ toast, confirm, prompt }}>
            {children}
            <ToastUI toasts={toasts} dismiss={dismiss} runAction={runAction} />
            <ConfirmUI state={confirmState} onAnswer={onAnswer} />
            {/* Keyed remount so each prompt starts fresh (value state resets). */}
            {promptState && (
                <PromptUI key={promptState.key} state={promptState} onResolve={onPromptResolve} />
            )}
        </ToastCtx.Provider>
    );
};

