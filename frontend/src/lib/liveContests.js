// Live contest watcher: exposes a tiny subscribe API so any component can
// show a "contest live now" banner. Shares the contest data layer with the
// Contests tab (cache + hourly refresh) without mounting the whole tracker.
import { loadContestCache, grabContests } from '../lib/contests';

let contests = loadContestCache();
const listeners = new Set();

const push = () => listeners.forEach((fn) => fn());

const refresh = async () => {
    try {
        const { contests: list } = await grabContests();
        contests = list;
        push();
    } catch { /* keep cache */ }
};

// Start polling (idempotent - first subscriber starts it).
let timer = null;
export const subscribeLiveContests = (fn) => {
    listeners.add(fn);
    if (!timer) {
        refresh();
        timer = setInterval(refresh, 5 * 60 * 1000); // live state changes fast
    }
    return () => {
        listeners.delete(fn);
        if (listeners.size === 0) {
            clearInterval(timer);
            timer = null;
        }
    };
};

/** Contests running right now (or starting within N minutes), soonest first. */
export const getLiveContests = (soonMinutes = 0) => {
    if (!contests) return [];
    const now = Date.now();
    const soonEdge = now + soonMinutes * 60 * 1000;
    return contests
        .filter((c) => (now >= c.start && now < c.start + c.duration) || (c.start > now && c.start <= soonEdge))
        .sort((a, b) => a.start - b.start);
};

/** All contests starting later today (local), soonest first - the "reminder"
 *  set for the dismissible banner. */
export const getTodayContests = () => {
    if (!contests) return [];
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return contests
        .filter((c) => c.start > now && c.start <= endOfDay.getTime())
        .sort((a, b) => a.start - b.start);
};
