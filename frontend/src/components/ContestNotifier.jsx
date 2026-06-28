import { useState, useEffect, useRef } from 'react';
import { X, Radio } from 'lucide-react';
import PlatformLogo from './PlatformLogo';
import { loadContestCache, grabContests } from '../lib/contests';

// In-app contest alerts (never browser notifications). While the app is
// open: toast when a contest is <=15 min away, and once more when it starts.
const SOON_MS = 15 * 60 * 1000;
const NOTIFIED_KEY = 'preptracker-contest-notified';

const loadNotified = () => {
    try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')); } catch { return new Set(); }
};
const saveNotified = (set) => {
    try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set].slice(-100))); } catch { /* full */ }
};

const ContestNotifier = () => {
    const [toasts, setToasts] = useState([]);
    const contestsRef = useRef(null);
    const notifiedRef = useRef(loadNotified());

    // Fresh data on mount (cache as placeholder), then hourly refresh.
    useEffect(() => {
        let live = true;
        const cached = loadContestCache();
        if (cached) contestsRef.current = cached;
        grabContests()
            .then(({ contests }) => { if (live) contestsRef.current = contests; })
            .catch(() => { /* keep cache */ });
        const hourly = setInterval(() => {
            grabContests()
                .then(({ contests }) => { if (live) contestsRef.current = contests; })
                .catch(() => { /* keep cache */ });
        }, 60 * 60 * 1000);
        return () => { live = false; clearInterval(hourly); };
    }, []);

    // Tick every minute: fire toasts for soon/started contests not yet notified.
    useEffect(() => {
        const tick = () => {
            const list = contestsRef.current;
            if (!list) return;
            const now = Date.now();
            const fired = [];
            for (const c of list) {
                const until = c.start - now;
                const inProgress = now >= c.start && now < c.start + c.duration;
                const isSoon = until > 0 && until <= SOON_MS;
                // "Just started" window, OR already running when the app
                // opened (missed the start alert) - announce once either way.
                const isLive = inProgress && (until > -2 * 60 * 1000 || !notifiedRef.current.has(`${c.url}#soon`));
                const tag = isLive ? `${c.url}#live` : `${c.url}#soon`;
                if ((isSoon || isLive) && !notifiedRef.current.has(tag)) {
                    notifiedRef.current.add(tag);
                    fired.push({ ...c, live: true, id: tag });
                }
            }
            if (fired.length > 0) {
                saveNotified(notifiedRef.current);
                setToasts((t) => [...t, ...fired].slice(-4));
                // Auto-dismiss after 30s.
                fired.forEach((f) => {
                    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== f.id)), 30_000);
                });
            }
        };
        tick();
        const id = setInterval(tick, 60_000);
        return () => clearInterval(id);
    }, []);

    if (toasts.length === 0) return null;

    const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

    return (
        <div className="pointer-events-none fixed bottom-20 left-4 z-[90] flex w-80 flex-col gap-2 md:bottom-6">
            {toasts.map((c) => (
                <div
                    key={c.id}
                    className="pointer-events-auto animate-fade-in overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
                >
                    <div className={`h-1 w-full ${c.live ? 'bg-rose-500' : 'bg-accent'}`} />
                    <div className="flex items-start gap-3 p-3.5">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-raised">
                            <PlatformLogo platform={c.platform} className="size-4" />
                        </span>
                        <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1"
                        >
                            <p className="flex items-center gap-1.5 text-xs font-medium text-subtle">
                                {c.live
                                    ? <><Radio className="size-3 animate-pulse text-rose-500" /> <span className="text-rose-500 font-semibold">LIVE NOW</span></>
                                    : <span>Starting in {c.minutes} min</span>}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-fg hover:text-accent-hi">{c.name}</p>
                        </a>
                        <button
                            onClick={() => dismiss(c.id)}
                            className="flex size-6 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ContestNotifier;
