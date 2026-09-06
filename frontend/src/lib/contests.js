// Contest data layer: sources, fetch + parse, cache. Shared by the Contests
// tab and the background notifier so they stay in sync.
//
// Sources - each platform's own public endpoint (no third parties, no
// signing, nothing to rotate on us):
//   Codeforces - official REST API, CORS-open
//   AtCoder    - atcoder.jp upcoming table via dev proxy (CORS-locked)
//   LeetCode   - public GraphQL via dev proxy (CORS-locked)
//   CodeChef   - public JSON list via dev proxy (CORS-locked)

export const SOURCES = [
    {
        id: 'codeforces',
        name: 'Codeforces',
        url: 'https://codeforces.com/api/contest.list',
        parse: (j) => j.result
            // BEFORE = upcoming, CODING = running right now, FINISHED = past.
            .filter((c) => c.phase === 'BEFORE' || c.phase === 'CODING' || c.phase === 'FINISHED')
            .map((c) => ({
                platform: 'codeforces',
                name: c.name,
                url: `https://codeforces.com/contests/${c.id}`,
                start: c.startTimeSeconds * 1000,
                duration: c.durationSeconds * 1000,
            })),
    },
    {
        id: 'atcoder',
        name: 'AtCoder',
        html: true,
        url: '/ac/contests',
        parse: (html) => {
            const s = html.indexOf('contest-table-upcoming');
            if (s < 0) return [];
            const table = html.slice(s, s + 20000);
            const rows = [...table.matchAll(
                /<time[^>]*>(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\+0900<\/time>[\s\S]*?href="\/contests\/([a-z0-9-]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<td class="text-center">(\d{2}:\d{2})<\/td>/g
            )];
            return rows.map((r) => {
                const start = Date.parse(r[1].replace(' ', 'T') + '+09:00');
                const [h, m] = r[4].split(':').map(Number);
                return {
                    platform: 'atcoder',
                    name: r[3].trim(),
                    url: `https://atcoder.jp/contests/${r[2]}`,
                    start,
                    duration: (h * 60 + m) * 60000,
                };
            });
        },
    },
    {
        id: 'leetcode',
        name: 'LeetCode',
        url: '/lc-graphql/graphql',
        query: '{ allContests { title titleSlug startTime duration } }',
        parse: (j) => (j.data?.allContests || []).map((c) => ({
            platform: 'leetcode',
            name: c.title,
            url: `https://leetcode.com/contest/${c.titleSlug}/`,
            start: c.startTime * 1000,
            duration: c.duration * 1000,
        })),
    },
    {
        id: 'codechef',
        name: 'CodeChef',
        url: '/cc-api/api/list/contests/all?sort_by=START&sorting_order=desc&offset=0&limit=100',
        parse: (j) => [...(j.past_contests || []), ...(j.present_contests || []), ...(j.future_contests || [])]
            .map((c) => {
                const start = Date.parse(c.contest_start_date_iso);
                const end = Date.parse(c.contest_end_date_iso);
                // The API's `duration` field lies for long weekend contests
                // (says 150 min for a 50h window) - always use start/end.
                return {
                    platform: 'codechef',
                    name: c.contest_name,
                    url: `https://www.codechef.com/${c.contest_code}`,
                    start,
                    duration: Math.max(0, end - start),
                };
            }),
    },
];

export const CACHE_KEY = 'preptracker-contests-v8';
const CACHE_TTL = 60 * 60 * 1000; // 1h

export const loadContestCache = () => {
    try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (c && Date.now() - c.ts < CACHE_TTL) return c.data;
    } catch { /* stale */ }
    return null;
};

/** Fetch all sources (allSettled - one failure never kills the rest).
 *  Returns { contests, failed } (failed = source names that errored). */
export const grabContests = async () => {
    const settled = await Promise.allSettled(SOURCES.map(async (s) => {
        const opts = s.query
            ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: s.query }) }
            : {};
        const r = await fetch(s.url, opts);
        if (!r.ok) throw new Error(`${s.name} HTTP ${r.status}`);
        return s.parse(s.html ? await r.text() : await r.json());
    }));
    const failed = SOURCES.filter((_, i) => settled[i].status === 'rejected').map((s) => s.name);
    let results = settled.filter((x) => x.status === 'fulfilled').flatMap((x) => x.value);

    // Fallback: If any platform was unreachable directly (e.g. CORS on production static host),
    // query open mirror feeds to recover LeetCode, CodeChef, and AtCoder contests.
    if (failed.length > 0) {
        // 1. Try CompeteAPI for LeetCode, CodeChef, Codeforces
        try {
            const fallbackRes = await fetch('https://competeapi.vercel.app/contests/upcoming');
            if (fallbackRes.ok) {
                const feed = await fallbackRes.json();
                const recovered = new Set();
                feed.forEach((item) => {
                    const plat = item.site?.toLowerCase();
                    const matchedSource = SOURCES.find((s) => s.id === plat || s.name.toLowerCase() === plat);
                    if (matchedSource && failed.includes(matchedSource.name)) {
                        results.push({
                            platform: matchedSource.id,
                            name: item.title,
                            url: item.url,
                            start: Number(item.startTime),
                            duration: Number(item.duration),
                        });
                        recovered.add(matchedSource.name);
                    }
                });
                for (let i = failed.length - 1; i >= 0; i--) {
                    if (recovered.has(failed[i])) failed.splice(i, 1);
                }
            }
        } catch { /* ignore fallback error */ }

        // 2. If AtCoder is still failed, recover from Kenkoooo's public CORS-open endpoint
        if (failed.includes('AtCoder')) {
            try {
                const acRes = await fetch('https://kenkoooo.com/atcoder/resources/contests.json');
                if (acRes.ok) {
                    const acList = await acRes.json();
                    const nowSec = (Date.now() - 24 * 3600 * 1000) / 1000;
                    const acUpcoming = acList.filter((c) => c.start_epoch_second >= nowSec);
                    if (acUpcoming.length > 0) {
                        acUpcoming.forEach((c) => {
                            results.push({
                                platform: 'atcoder',
                                name: c.title,
                                url: `https://atcoder.jp/contests/${c.id}`,
                                start: c.start_epoch_second * 1000,
                                duration: (c.duration_second || 6000) * 1000,
                            });
                        });
                        const idx = failed.indexOf('AtCoder');
                        if (idx >= 0) failed.splice(idx, 1);
                    }
                }
            } catch { /* ignore fallback error */ }
        }
    }

    if (results.length === 0) throw new Error('contest sources unreachable');
    const merged = [...new Map(results.map((c) => [c.url || `${c.platform}-${c.start}`, c])).values()]
        .sort((a, b) => a.start - b.start);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: merged })); } catch { /* full */ }
    return { contests: merged, failed };
};
