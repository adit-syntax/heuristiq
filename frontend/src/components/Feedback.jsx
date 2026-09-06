import { useRef, useState } from 'react';
import { MessageSquare, Send, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useToast from '../hooks/useToast';

// Feedback/suggestion form -> EmailJS -> the team inbox. The destination
// address lives ONLY in the EmailJS template (never in this bundle); the
// public IDs below are safe client-side identifiers by design.
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const CONFIGURED = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

const MAX_FILE_KB = 50;
const MAX_TOTAL_KB = 50;

const Feedback = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileRef = useRef(null);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState([]); // { name, size, base64 }
    const [sending, setSending] = useState(false);

    const onPickFiles = (e) => {
        const picked = [...(e.target.files || [])];
        e.target.value = '';
        const next = [...files];
        let total = next.reduce((n, f) => n + f.size, 0);
        for (const f of picked) {
            if (!f.type && !/\.\w+$/.test(f.name)) continue;
            if (f.size > MAX_FILE_KB * 1024) {
                toast(`${f.name} is over ${MAX_FILE_KB} KB. For larger files, paste a Google Drive or PDF link in the description!`, { kind: 'danger', duration: 6000 });
                continue;
            }
            if (total + f.size > MAX_TOTAL_KB * 1024) {
                toast(`Total attachments capped at ${MAX_TOTAL_KB} KB. For larger files, paste a link in the description.`, { kind: 'danger', duration: 6000 });
                break;
            }
            total += f.size;
            next.push({ name: f.name, size: f.size, file: f });
        }
        setFiles(next);
    };

    const toBase64 = (f) => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(f);
    });

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !title.trim() || !description.trim()) {
            toast('Please fill in all fields', { kind: 'danger' });
            return;
        }
        if (!CONFIGURED) {
            toast('Feedback delivery is not configured on this build', { kind: 'danger' });
            return;
        }
        setSending(true);
        try {
            const attachments = await Promise.all(files.map(async (f) => ({
                name: f.name,
                data: await toBase64(f.file),
            })));

            // EmailJS REST API - no SDK needed for one endpoint.
            const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: SERVICE_ID,
                    template_id: TEMPLATE_ID,
                    user_id: PUBLIC_KEY,
                    template_params: {
                        from_name: name.trim(),
                        reply_to: email.trim(),
                        title: title.trim(),
                        message: description.trim(),
                        // Optional attachments; depends on the EmailJS plan.
                        attachments,
                    },
                }),
            });
            if (!r.ok && r.status !== 200) {
                const t = await r.text().catch(() => '');
                throw new Error(t || `EmailJS HTTP ${r.status}`);
            }
            toast('Feedback sent - thank you!');
            setTitle('');
            setDescription('');
            setFiles([]);
        } catch (err) {
            toast('Could not send feedback', { detail: String(err.message || err).slice(0, 120), kind: 'danger' });
        }
        setSending(false);
    };

    const inputClass = 'w-full rounded-xl border border-line bg-raised/40 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none';

    return (
        <div className="mx-auto w-full max-w-2xl animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                    <MessageSquare className="size-6 text-white sm:size-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Feedback & Suggestions</h1>
                    <p className="text-sm text-subtle sm:text-base">Bugs, ideas, missing sheets - it all lands straight with the team.</p>
                </div>
            </div>

            {!CONFIGURED && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                    Feedback delivery is not configured on this build. The form works locally; sending
                    needs the EmailJS environment variables (see .env.example).
                </div>
            )}

            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Your name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className={inputClass} />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Your email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
                    </div>
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary - e.g. Add Striver 79 sheet" className={inputClass} />
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What happened, what you expected, or what you'd love to see... (For larger screenshots, recordings, or PDFs, feel free to paste a Google Drive, Dropbox, or public link here)"
                        rows={6}
                        className={`${inputClass} resize-y`}
                    />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-muted">Attachments (optional)</label>
                        <span className="text-[11px] text-subtle">Max {MAX_FILE_KB} KB direct attachment</span>
                    </div>
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-fg"
                    >
                        <Paperclip className="size-4" /> Add file (max {MAX_FILE_KB} KB)
                    </button>

                    <div className="rounded-xl border border-line/60 bg-raised/30 p-3 text-xs leading-relaxed text-subtle">
                        <p className="font-semibold text-fg">💡 Have a larger screenshot, PDF, or video?</p>
                        <p className="mt-0.5">
                            Direct email attachments are limited to 50 KB. For larger files, please upload to <span className="font-medium text-fg">Google Drive</span>, <span className="font-medium text-fg">Dropbox</span>, or an image host, and paste the shareable link in the <span className="font-medium text-accent-hi">Description</span> box above.
                        </p>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                            {files.map((f, i) => (
                                <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-line bg-raised/40 px-3 py-2">
                                    <FileText className="size-4 shrink-0 text-subtle" />
                                    <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                                    <span className="shrink-0 font-mono text-xs text-subtle">{(f.size / 1024).toFixed(0)} KB</span>
                                    <button
                                        type="button"
                                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                                        className="flex size-6 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-rose-400"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-50 sm:w-auto sm:px-6"
                >
                    {sending ? <><Loader2 className="size-4 animate-spin" /> Sending...</> : <><Send className="size-4" /> Send feedback</>}
                </button>
            </form>

            <div className="rounded-2xl border border-line bg-panel p-5 text-sm leading-relaxed text-muted">
                <h2 className="mb-2 font-semibold text-fg">How your data is handled</h2>
                <ul className="list-disc space-y-1 pl-5">
                    <li>Everything else in Heuristiq is saved to your device first (works offline), then synced to your Firebase account when you sign in.</li>
                    <li>Code runs on the free Wandbox sandbox; your source is sent to it only when you press Run.</li>
                    <li>This form is delivered by email via EmailJS - your name, address, message and files go only into that email.</li>
                    <li>No analytics, no tracking, no third parties beyond the services listed above.</li>
                </ul>
            </div>
        </div>
    );
};

export default Feedback;
