import { useState, useEffect, useMemo } from 'react';
import {
    Trophy, ChevronLeft, ChevronRight, CalendarDays, List, ExternalLink, Loader2,
    RefreshCw, Radio,
} from 'lucide-react';
import PlatformLogo from './PlatformLogo';
import { loadContestCache, grabContests } from '../lib/contests';

const HORIZON_DAYS = 60;
// Past depth: CF/LC/CodeChef sources carry full history, so show everything
// they return. AtCoder (upcoming page only) simply has no past entries.
const PAST_DAYS = 3650;

const PLATFORMS = [
    { id: 'all', name: 'All' },
    { id: 'codeforces', name: 'Codeforces', tint: 'bg-sky-500' },
    { id: 'leetcode', name: 'LeetCode', tint: 'bg-emerald-500' },
    { id: 'codechef', name: 'CodeChef', tint: 'bg-amber-500' },
    { id: 'atcoder', name: 'AtCoder', tint: 'bg-slate-400' },
];

const dayKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDur = (ms) => {
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

/** Fixed-window contest (sit during the exact hours) vs an anytime window
 *  (long practice span - attempt whenever before it closes). */
const ContestRow = ({ contest, nowMs }) => {
    const live = nowMs >= contest.start && nowMs < contest.start + contest.duration;
    const p = PLATFORMS.find((x) => x.id === contest.platform);
    const label = p?.name || contest.platform;

    // Start → end window on one line; include the day when it spans days.
    const s = new Date(contest.start);
    const e = new Date(contest.start + contest.duration);
    const day = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
    const time = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const windowLine = day(s) === day(e)
        ? `${day(s)} · ${time(s)} → ${time(e)}`
        : `${day(s)} ${time(s)} → ${day(e)} ${time(e)}`;

    // Remaining: time-to-go (upcoming) or time-to-end (live).
    const remaining = live ? `ends in ${fmtDur(contest.start + contest.duration - nowMs)}`
        : `starts in ${fmtDur(contest.start - nowMs)}`;

    return (
        <a
            href={contest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border-b border-line/40 px-4 py-3 transition-all last:border-b-0 hover:bg-raised/30 sm:px-5"
        >
            <span className="flex size-5 shrink-0 items-center justify-center" title={label}>
                <PlatformLogo platform={contest.platform} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium sm:text-base">{contest.name}</span>
                <span className="block font-mono text-[11px] text-subtle">{windowLine}</span>
                <span className={`block text-[11px] font-medium ${live ? 'text-rose-500' : 'text-subtle'}`}>
                    {live ? `● LIVE · ${remaining}` : remaining}
                </span>
            </span>
            <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-subtle md:inline" title="Total length">
                {fmtDur(contest.duration)}
            </span>
            <ExternalLink className="size-4 shrink-0 text-subtle" />
        </a>
    );
};

const ContestTracker = () => {
    const [contests, setContests] = useState(loadContestCache);
    const [loading, setLoading] = useState(true); // always refetch on mount; cache is just a placeholder
    const [error, setError] = useState(null);
    const [failedSources, setFailedSources] = useState([]);
    const [view, setView] = useState('calendar'); // 'calendar' | 'list'
    const [platform, setPlatform] = useState('all');
    const [when, setWhen] = useState('upcoming'); // 'upcoming' | 'past'
    const [shownDays, setShownDays] = useState(30); // list-view render cap
    const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date().getTime()));
    // Purity rules ban Date.now() in render; tick a clock state instead.
    // 30s keeps the LIVE badge and start times honest without re-render churn.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);
    const nowMs = now.getTime();

    // Always fetch on mount - the cache is only an instant placeholder while
    // fresh data loads, never a reason to skip fetching. Sources live in
    // lib/contests.js (shared with the background notifier).
    useEffect(() => {
        let live = true;
        grabContests()
            .then(({ contests: m, failed }) => {
                if (!live) return;
                setContests(m);
                setFailedSources(failed);
                if (failed.length > 0) {
                    console.warn('[Contests] sources failed:', failed, '- showing', m.length, 'contests from the rest');
                }
            })
            .catch((e) => {
                if (live) {
                    setError(String(e.message || e));
                    console.error('[Contests] ALL sources failed - inspect preptracker-contests-v7 in localStorage:', localStorage.getItem('preptracker-contests-v7')?.slice(0, 200));
                }
            })
            .finally(() => { if (live) setLoading(false); });
        return () => { live = false; };
    }, []);

    const refresh = () => {
        setLoading(true);
        setError(null);
        grabContests()
            .then(({ contests: m, failed }) => {
                setContests(m);
                setFailedSources(failed);
            })
            .catch((e) => setError(String(e.message || e)))
            .finally(() => setLoading(false));
    };

    const visible = useMemo(() => {
        const pastEdge = nowMs - PAST_DAYS * 24 * 3600 * 1000;
        const futureEdge = nowMs + HORIZON_DAYS * 24 * 3600 * 1000;
        return (contests || []).filter((c) => {
            if (platform !== 'all' && c.platform !== platform) return false;
            if (when === 'upcoming') {
                // Keep live (in-progress) contests too.
                return c.start + c.duration > nowMs && c.start < futureEdge;
            }
            return c.start < nowMs && c.start + c.duration > pastEdge;
        });
    }, [contests, platform, when, nowMs]);

    // Calendar grid: 6 weeks starting Sunday.
    const grid = useMemo(() => {
        const first = new Date(month);
        const start = new Date(first);
        start.setDate(1 - first.getDay());
        return Array.from({ length: 42 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [month]);

    const byDay = useMemo(() => {
        const m = new Map();
        visible.forEach((c) => {
            // Multi-day contests (weekend-long practice windows etc.) appear
            // on every LOCAL day they are live. Walk day by day from the
            // start until the end (capped), skipping days where the contest
            // isn't actually running at any point.
            const end = c.start + c.duration;
            const spanDays = Math.min(Math.ceil(c.duration / 86400000) + 1, 4);
            const seen = new Set();
            for (let off = 0; off <= spanDays; off++) {
                const t = c.start + off * 86400000;
                const k = dayKey(t);
                if (seen.has(k)) continue;
                seen.add(k);
                // The contest is live on this local day if some moment of
                // that local day falls inside [start, end].
                const dayStart = new Date(t);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = dayStart.getTime() + 86400000 - 1;
                const isLiveOnDay = end >= dayStart.getTime() && c.start <= dayEnd;
                if (!isLiveOnDay) continue;
                if (!m.has(k)) m.set(k, []);
                if (!m.get(k).includes(c)) m.get(k).push(c);
            }
        });
        return m;
    }, [visible]);

    // Past reads newest-first, upcoming oldest-first (next up top).
    const listDays = useMemo(() => {
        const days = [...byDay.keys()].sort();
        return when === 'past' ? days.reverse() : days;
    }, [byDay, when]);
    const selectedContests = byDay.get(selectedDay) || [];

    const monthLabel = month.toLocaleDateString([], { month: 'long', year: 'numeric' });
    const todayKey = dayKey(nowMs);

    return (
        <div className="space-y-6 px-1 sm:px-0">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <Trophy className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contest Tracker</h1>
                        <p className="flex items-center gap-2 text-sm text-subtle sm:text-base">
                            {loading ? <><Loader2 className="size-4 animate-spin" /> loading contests...</>
                                : error ? <span className="text-rose-400">Failed: {error}</span>
                                : <>
                                    <span className="font-mono">{visible.length}</span> {when === 'upcoming' ? `in the next ${HORIZON_DAYS} days` : 'past contests'}
                                    {failedSources.length > 0 && (
                                        <span className="text-amber-500" title="These platforms' APIs were unreachable - their contests may be missing. Click refresh to retry.">
                                            ({failedSources.join(', ')} unreachable)
                                        </span>
                                    )}
                                </>}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Upcoming / Past toggle */}
                    <div className="flex shrink-0 rounded-xl border border-line bg-panel p-1">
                        {['upcoming', 'past'].map((w) => (
                            <button
                                key={w}
                                onClick={() => setWhen(w)}
                                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition-all
                                    ${when === w ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}
                            >
                                {w}
                            </button>
                        ))}
                    </div>

                    {/* Platform filter */}
                    {PLATFORMS.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPlatform(p.id)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all sm:px-3.5 sm:py-2
                                ${platform === p.id ? 'bg-accent text-white' : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                        >
                            {p.id !== 'all' && <PlatformLogo platform={p.id} className="size-4" />}
                            {p.name}
                        </button>
                    ))}
                    <button
                        onClick={refresh}
                        title="Refresh"
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-raised/60 text-muted transition-all hover:bg-raised hover:text-fg"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* View toggle */}
            <div className="flex w-fit rounded-xl border border-line bg-panel p-1">
                {[
                    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
                    { id: 'list', label: 'List', icon: List },
                ].map((v) => (
                    <button
                        key={v.id}
                        onClick={() => setView(v.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all
                            ${view === v.id ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}
                    >
                        <v.icon className="size-4" />
                        {v.label}
                    </button>
                ))}
            </div>

            {/* Calendar view */}
            {view === 'calendar' ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                            className="flex size-9 items-center justify-center rounded-xl border border-line bg-panel text-muted transition-colors hover:bg-raised hover:text-fg"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <p className="text-lg font-semibold">{monthLabel}</p>
                        <button
                            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                            className="flex size-9 items-center justify-center rounded-xl border border-line bg-panel text-muted transition-colors hover:bg-raised hover:text-fg"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
                        <div className="grid grid-cols-7 border-b border-line bg-raised/40 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle sm:text-xs">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                                <div key={d} className="px-0.5 py-2 sm:px-1 sm:py-2.5">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {grid.map((d) => {
                                const k = dayKey(d.getTime());
                                const inMonth = d.getMonth() === month.getMonth();
                                const dayContests = byDay.get(k) || [];
                                const isToday = k === todayKey;
                                const isSel = k === selectedDay;
                                return (
                                    <button
                                        key={k}
                                        onClick={() => setSelectedDay(k)}
                                        className={`relative flex min-h-[52px] flex-col items-center border-b border-r border-line/40 p-1 transition-colors last:border-r-0 sm:min-h-[76px] sm:p-1.5
                                            ${inMonth ? 'text-fg' : 'text-faint'}
                                            ${isSel ? 'bg-accent/10' : 'hover:bg-raised/30'}`}
                                    >
                                        <span className={`mt-0.5 flex size-5 items-center justify-center rounded-full text-[11px] font-medium sm:size-7 sm:text-sm
                                            ${isToday ? 'bg-accent font-bold text-white' : ''}`}>
                                            {d.getDate()}
                                        </span>
                                        <span className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
                                            {dayContests.slice(0, 3).map((c, i) => (
                                                <span key={i} className="flex size-3 items-center justify-center" title={c.name}>
                                                    <PlatformLogo platform={c.platform} className="size-3" />
                                                </span>
                                            ))}
                                            {dayContests.length > 3 && (
                                                <span className="text-[9px] font-semibold text-subtle">+{dayContests.length - 3}</span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected day's contests */}
                    <div>
                        <p className="mb-2 text-sm font-semibold text-muted">
                            {new Date(selectedDay + 'T00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                            {selectedDay === todayKey && ' (today)'}
                        </p>
                        <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
                            {selectedContests.length === 0 ? (
                                <p className="p-6 text-center text-sm text-subtle">No contests this day.</p>
                            ) : selectedContests.map((c) => (
                                <ContestRow key={c.url} contest={c} nowMs={nowMs} />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* List view - capped render (full history is 2000+ rows) */
                <div className="space-y-4">
                    {listDays.length === 0 && (
                        <p className="py-16 text-center text-subtle">
                            {loading ? 'Loading contests...' : 'No contests for this filter.'}
                        </p>
                    )}
                    {listDays.slice(0, shownDays).map((k) => (
                        <div key={k}>
                            <p className="mb-2 pl-1 text-sm font-semibold text-muted">
                                {new Date(k + 'T00:00').toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                {k === todayKey && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent-hi">Today</span>}
                            </p>
                            <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
                                {(byDay.get(k) || []).map((c) => (
                                    <ContestRow key={c.url} contest={c} nowMs={nowMs} />
                                ))}
                            </div>
                        </div>
                    ))}
                    {listDays.length > shownDays && (
                        <button
                            onClick={() => setShownDays((n) => n + 50)}
                            className="w-full rounded-xl border border-line bg-panel py-3 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                        >
                            Show more ({listDays.length - shownDays} days left)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContestTracker;
