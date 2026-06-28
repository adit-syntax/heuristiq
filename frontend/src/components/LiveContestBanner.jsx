import { useState, useEffect } from 'react';
import { Radio, ExternalLink } from 'lucide-react';
import { subscribeLiveContests, getLiveContests } from '../lib/liveContests';
import PlatformLogo from './PlatformLogo';

/** Attention banner: contest(s) live right now, or starting in <=30 min.
 *  Rendered at the top of the Dashboard. */
const LiveContestBanner = () => {
    // Time-derived view state computed in the tick callback (Date.now is
    // banned in render); refreshed every 30s and on data refresh.
    const [live, setLive] = useState([]);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            setLive(getLiveContests(30).map((c) => ({
                ...c,
                running: now >= c.start,
                endsInMs: c.start + c.duration - now,
                startsInMs: c.start - now,
                // Full start → end window (both in local time) so the
                // candidate sees exactly when it opens and closes.
                windowLabel: (() => {
                    const s = new Date(c.start), e = new Date(c.start + c.duration);
                    const day = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
                    const time = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return day(s) === day(e)
                        ? `${day(s)} · ${time(s)} → ${time(e)}`
                        : `${day(s)} ${time(s)} → ${day(e)} ${time(e)}`;
                })(),
            })));
        };
        update();
        const unsubscribe = subscribeLiveContests(update);
        const id = setInterval(update, 30_000);
        return () => { unsubscribe(); clearInterval(id); };
    }, []);

    if (live.length === 0) return null;

    const fmtEnds = (ms) => {
        const mins = Math.max(0, Math.round(ms / 60000));
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`;
    };
    const fmtStarts = (ms) => `starts in ${Math.max(1, Math.round(ms / 60000))} min`;
    const fmtDur = (ms) => {
        const totalMin = Math.round(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    };

    return (
        <div className="space-y-2">
            {live.map((c) => (
                <a
                    key={c.url}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 shadow-lg transition-transform hover:scale-[1.005] sm:px-5
                        ${c.running
                            ? 'border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-panel to-panel'
                            : 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-panel to-panel'}`}
                >
                    <PlatformLogo platform={c.platform} className="size-6 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                            {c.running ? (
                                <span className="flex items-center gap-1.5 text-rose-500">
                                    <Radio className="size-3.5 animate-pulse" /> Live now · {fmtEnds(c.endsInMs)}
                                </span>
                            ) : (
                                <span className="text-amber-500">{fmtStarts(c.startsInMs)}</span>
                            )}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-fg sm:text-base">
                            {c.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-subtle">
                            {c.windowLabel} · {fmtDur(c.duration)}
                        </p>
                    </div>
                    <span
                        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-colors
                            ${c.running ? 'bg-rose-500 group-hover:bg-rose-400' : 'bg-amber-500 group-hover:bg-amber-400'}`}
                    >
                        {c.running ? 'Join' : 'Open'} <ExternalLink className="size-3.5" />
                    </span>
                </a>
            ))}
        </div>
    );
};

export default LiveContestBanner;
