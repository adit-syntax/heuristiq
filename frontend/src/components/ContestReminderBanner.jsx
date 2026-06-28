import { useState, useEffect } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { subscribeLiveContests, getTodayContests } from '../lib/liveContests';
import PlatformLogo from './PlatformLogo';

// Dismissal memory: one key per contest per local day - dismissing today's
// reminder never hides tomorrow's contest.
const DISMISS_KEY = 'preptracker-contest-reminders';

const loadDismissed = () => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')); } catch { return new Set(); }
};
const saveDismissed = (set) => {
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...set].slice(-50))); } catch { /* full */ }
};

const dayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Dismissible reminder for contests happening later today. Distinct from
 *  LiveContestBanner (which is non-dismissible for running contests). */
const ContestReminderBanner = () => {
    const [upcoming, setUpcoming] = useState([]);
    const [dismissed, setDismissed] = useState(loadDismissed);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const today = dayKey();
            setUpcoming(getTodayContests().map((c) => ({
                ...c,
                startsInMs: c.start - now,
                // Full start → end window for clarity.
                windowLabel: (() => {
                    const s = new Date(c.start), e = new Date(c.start + c.duration);
                    const day = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
                    const time = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return day(s) === day(e)
                        ? `${day(s)} · ${time(s)} → ${time(e)}`
                        : `${day(s)} ${time(s)} → ${day(e)} ${time(e)}`;
                })(),
                dismissalKey: `${today}:${c.url}`,
            })));
        };
        update();
        const unsubscribe = subscribeLiveContests(update);
        const id = setInterval(update, 60_000);
        return () => { unsubscribe(); clearInterval(id); };
    }, []);

    const visible = upcoming.filter((c) => !dismissed.has(c.dismissalKey));
    if (visible.length === 0) return null;

    const dismiss = (c) => {
        setDismissed((prev) => {
            const next = new Set(prev);
            next.add(c.dismissalKey);
            saveDismissed(next);
            return next;
        });
    };

    const fmtDur = (ms) => {
        const totalMin = Math.round(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    };
    const fmtIn = (ms) => {
        const mins = Math.max(1, Math.round(ms / 60000));
        return mins >= 60 ? `in ${Math.floor(mins / 60)}h ${mins % 60}m` : `in ${mins} min`;
    };

    return (
        <div className="space-y-2">
            {visible.map((c) => (
                <div
                    key={c.url}
                    className="group flex items-center gap-3 rounded-2xl border border-info/25 bg-gradient-to-r from-accent/8 via-panel to-panel px-4 py-3 shadow sm:px-5"
                >
                    <PlatformLogo platform={c.platform} className="size-6 shrink-0" />
                    <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1"
                    >
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent-hi">
                            <Bell className="size-3.5" /> Today · {fmtIn(c.startsInMs)}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-fg hover:text-accent-hi sm:text-base">
                            {c.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-subtle">
                            {c.windowLabel} · {fmtDur(c.duration)}
                        </p>
                    </a>
                    <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open contest page"
                        className="flex size-8 shrink-0 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-raised hover:text-fg"
                    >
                        <ExternalLink className="size-4" />
                    </a>
                    <button
                        onClick={() => dismiss(c)}
                        title="Dismiss for today"
                        className="flex size-8 shrink-0 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-raised hover:text-fg"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ContestReminderBanner;
