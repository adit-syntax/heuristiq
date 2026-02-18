import { useState } from 'react';
import {
    Code2, Building2, Trophy, StickyNote, PenLine, Activity, Search,
    ArrowRight, Send, Loader2, CalendarCheck, Flame, Target, Check,
    AlertTriangle,
} from 'lucide-react';
import AuthPage from './AuthPage';
import logoHorizontal from '../assets/logo-horizontal.png';
import { useAuth } from '../context/AuthContext';
import useToast from '../hooks/useToast';

const FEATURES = [
    { icon: Code2, title: 'Curated question sheets', text: 'A2Z, SDE, MIK, Blind 75, NeetCode 150, Top Interview 150, CP-31, CSES and more - every list you prep from, natively.' },
    { icon: Building2, title: 'Company trackers', text: 'Follow the companies you are targeting and work their real interview question banks.' },
    { icon: CalendarCheck, title: 'Contest calendar', text: 'Codeforces, LeetCode, CodeChef and AtCoder schedules in one place, with reminders before they start.' },
    { icon: Flame, title: 'Streaks & consistency', text: 'A pacing calendar that shows exactly where you stand against your target date.' },
    { icon: StickyNote, title: 'Notes on problems', text: 'Your approach, mistakes and tags attached to each question - searchable, synced, yours.' },
    { icon: PenLine, title: 'Run & visualise', text: 'A five-language code runner, algorithm animations and a sketchable whiteboard built in.' },
];

const PLATFORMS = ['Striver A2Z', 'Striver SDE', 'NeetCode 150', 'Blind 75', 'CSES', 'TLE CP-31', 'CodeStoryWithMIK', 'LeetCode Top 150'];

const FOOTER_COLS = [
    {
        heading: 'Product',
        links: [
            { label: 'Features', href: '#features' },
            { label: 'Question sheets', href: '#platforms' },
            { label: 'Contest calendar', href: '#features' },
            { label: 'Global search', href: '#features' },
        ],
    },
    {
        heading: 'Resources',
        links: [
            { label: 'Sheets we track', href: '#platforms' },
            { label: 'Code playground', href: '#features' },
            { label: 'Algorithm visualiser', href: '#features' },
            { label: 'Sign in', href: '#auth' },
        ],
    },
    {
        heading: 'Company',
        links: [
            { label: 'About', href: '#platforms' },
            { label: 'Feedback', href: '#feedback' },
            { label: 'Privacy', href: '#feedback' },
            { label: 'Streaks & consistency', href: '#features' },
        ],
    },
];

/** Public landing page. Authenticated users never see it - AppContent swaps
 *  straight to the workspace. */
const Landing = () => {
    const { continueAsGuest, isFirebaseConfigured, loginWithGoogle } = useAuth();
    const { toast } = useToast();
    const [signInOpen, setSignInOpen] = useState(false);
    const [authCardOpen, setAuthCardOpen] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const onGuest = () => {
        continueAsGuest();
        toast('Guest mode - remember: storage here is temporary', { kind: 'info', duration: 5000 });
    };

    // Google OAuth straight from the nav dropdown.
    const onGoogle = async () => {
        setGoogleBusy(true);
        const result = await loginWithGoogle();
        setGoogleBusy(false);
        if (!result.success) toast(result.error, { kind: 'danger' });
    };

    // Mini feedback form (footer). Hands off to the full Feedback flow.
    const [fb, setFb] = useState({ email: '', message: '' });

    const sendFeedback = async (e) => {
        e.preventDefault();
        if (!fb.message.trim() || !fb.email.trim()) {
            toast('Add your email and a short message', { kind: 'danger' });
            return;
        }
        // No backend on the landing page - route users to the sign-in
        // dropdown; the in-app Feedback tab (EmailJS) completes the send.
        setSignInOpen(true);
        toast('Sign in first - then use the Feedback tab to send it', { kind: 'info', duration: 6000 });
    };

    return (
        <div className="min-h-screen bg-app text-fg">
            {/* ============ Nav ============ */}
            <header className="sticky top-0 z-40 border-b border-line bg-app/85 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
                    <a href="#" className="shrink-0">
                        <img src={logoHorizontal} alt="Heuristiq - Elevate Insight" className="h-14 w-auto sm:h-16" />
                    </a>
                    <nav className="hidden items-center gap-1 md:flex">
                        <a href="#features" className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised/60 hover:text-fg">Features</a>
                        <a href="#platforms" className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised/60 hover:text-fg">Sheets</a>
                        <a href="#feedback" className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised/60 hover:text-fg">Feedback</a>
                    </nav>
                    {/* Sign in - both entry methods live here */}
                    <div className="relative">
                        <button
                            onClick={() => setSignInOpen((v) => !v)}
                            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi"
                        >
                            Sign in
                        </button>
                        {signInOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setSignInOpen(false)} />
                                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
                                    {/* Method 1: Google OAuth */}
                                    <div className="border-b border-line p-4">
                                        <p className="mb-1 text-sm font-semibold text-fg">Continue with Google</p>
                                        <p className="mb-3 text-xs text-subtle">Synced to your account - nothing is lost.</p>
                                        {isFirebaseConfigured ? (
                                            <button
                                                onClick={onGoogle}
                                                disabled={googleBusy}
                                                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-50"
                                            >
                                                <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true">
                                                    <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z"/>
                                                    <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.91-2.258c-.805.54-1.835.859-3.046.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"/>
                                                    <path fill="#FBBC05" d="M3.963 10.706A5.414 5.414 0 0 1 3.681 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z"/>
                                                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.345l2.581-2.581C13.464.892 11.427 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"/>
                                                </svg>
                                                {googleBusy ? 'Signing in...' : 'Google'}
                                            </button>
                                        ) : (
                                            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                                                Cloud sync isn't configured on this build.
                                            </p>
                                        )}
                                    </div>
                                    {/* Method 2: Guest with storage disclaimer */}
                                    <div className="p-4">
                                        <p className="mb-1 text-sm font-semibold text-fg">Continue as guest</p>
                                        <p className="mb-3 text-xs text-subtle">No signup needed - full access.</p>
                                        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-500">
                                            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                            <span>Guest storage is temporary and can be wiped anytime by clearing browser data.</span>
                                        </div>
                                        <button
                                            onClick={onGuest}
                                            className="w-full rounded-xl border border-line bg-raised/50 px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-raised"
                                        >
                                            Continue as guest
                                        </button>
                                    </div>
                                    {/* Email option */}
                                    <div className="border-t border-line p-4 text-center">
                                        <a href="#auth-card" onClick={() => { setSignInOpen(false); setAuthCardOpen(true); }} className="text-xs font-medium text-accent-hi hover:underline">
                                            Prefer email & password? Sign in here
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ============ Hero ============ */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-accent/12 blur-3xl" />
                    <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-deep/10 blur-3xl" />
                </div>

                <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-28">
                    <p className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border border-line bg-panel px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-accent-hi">
                        Elevate Insight
                    </p>
                    <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Every sheet, contest and note.
                        <br />
                        <span className="bg-gradient-to-r from-accent-hi via-accent to-accent-deep bg-clip-text text-transparent">
                            One quiet workspace.
                        </span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                        The question lists you already prep from, the contests you already compete in -
                        tracked, annotated and paced in one place.
                    </p>

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={() => setSignInOpen(true)}
                            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hi"
                        >
                            Start prepping <ArrowRight className="size-4" />
                        </button>
                        <a
                            href="#features"
                            className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-6 py-3.5 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                        >
                            See what's inside
                        </a>
                    </div>
                </div>
            </section>

            {/* ============ Platforms trust bar ============ */}
            <section id="platforms" className="border-y border-line bg-panel/50">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                    <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-subtle">
                        Tracks every list you already trust
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                        {PLATFORMS.map((p) => (
                            <span key={p} className="text-sm font-semibold text-subtle transition-colors hover:text-fg">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ Features ============ */}
            <section id="features" className="py-16 lg:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="mb-12 max-w-2xl">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
                            Built like a prep tool, not a checklist.
                        </h2>
                        <p className="mt-3 text-muted">
                            Everything here solves one problem: keeping your prep in one place while the
                            algorithms do the talking.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="group rounded-2xl border border-line bg-panel p-6 transition-all hover:border-accent/30 hover:bg-raised/40"
                            >
                                <div className="flex size-11 items-center justify-center rounded-xl bg-accent/12 text-accent-hi transition-colors group-hover:bg-accent/20">
                                    <f.icon className="size-5" />
                                </div>
                                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-subtle">{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ Talk to us (pre-footer band) ============ */}
            <section id="feedback" className="border-t border-line bg-panel/40 py-14 lg:py-16">
                <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Talk to us</h2>
                        <p className="mt-3 max-w-md text-muted">
                            A bug, an idea, a sheet we're missing - it lands straight with the team.
                            We read everything.
                        </p>
                        <ul className="mt-6 space-y-2.5 text-sm text-subtle">
                            <li className="flex items-center gap-2"><Check className="size-4 text-accent-hi" /> Replies within a couple of days</li>
                            <li className="flex items-center gap-2"><Check className="size-4 text-accent-hi" /> Feature requests shape the roadmap</li>
                            <li className="flex items-center gap-2"><Check className="size-4 text-accent-hi" /> Bug reports get priority fixes</li>
                        </ul>
                    </div>
                    <form onSubmit={sendFeedback} className="space-y-3 rounded-2xl border border-line bg-panel p-5 sm:p-6">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">Your email</label>
                            <input
                                type="email"
                                value={fb.email}
                                onChange={(e) => setFb((f) => ({ ...f, email: e.target.value }))}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-line bg-raised/40 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">Message</label>
                            <textarea
                                value={fb.message}
                                onChange={(e) => setFb((f) => ({ ...f, message: e.target.value }))}
                                placeholder="Tell us what's on your mind..."
                                rows={4}
                                className="w-full resize-none rounded-xl border border-line bg-raised/40 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi"
                        >
                            <Send className="size-4" /> Send message
                        </button>
                    </form>
                </div>
            </section>

            {/* ============ Footer ============ */}
            <footer className="border-t border-line">
                <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    {/* Brand + blurb */}
                    <div className="space-y-4">
                        <img src={logoHorizontal} alt="Heuristiq - Elevate Insight" className="h-14 w-auto" />
                        <p className="max-w-xs text-sm leading-relaxed text-subtle">
                            The DSA prep workspace that tracks the sheets, contests and companies
                            you already care about.
                        </p>
                    </div>

                    {/* Link columns */}
                    {FOOTER_COLS.map((col) => (
                        <div key={col.heading}>
                            <h3 className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-fg">{col.heading}</h3>
                            <ul className="space-y-2.5">
                                {col.links.map((l) => (
                                    <li key={l.label}>
                                        <a href={l.href} className="text-sm text-subtle transition-colors hover:text-accent-hi">{l.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Legal bar */}
                <div className="border-t border-line">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-faint sm:flex-row sm:px-6">
                        <p>&copy; {new Date().getFullYear()} Heuristiq. All rights reserved.</p>
                        <p>Not affiliated with the platforms it tracks.</p>
                    </div>
                </div>
            </footer>

            {/* Email/password sign-in modal (opened from the nav dropdown) */}
            {authCardOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={() => setAuthCardOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <AuthPage />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Landing;
