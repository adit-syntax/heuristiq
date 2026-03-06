// Canonical question identity: the same problem appears in many sheets and
// company lists under different titles/ids - but its platform link is unique.
// Derive one stable key per question so progress reflects everywhere.

const LC = /leetcode\.com\/problems\/([a-z0-9-]+)/i;
const CF = /codeforces\.com\/(?:problemset|contest)\/problem\/(\d+)\/([A-Za-z0-9]+)/i;
const GFG = /geeksforgeeks\.org\/problems\/([a-z0-9-]+)/i;
const CSES = /cses\.fi\/problemset\/task\/(\d+)/i;

/** Canonical key from a question's links, or null when none match. */
export const canonicalKey = (links = {}) => {
    const all = `${links.leetCodeLink || ''} ${links.questionLink || ''} ${links.gfgLink || ''}`;
    const lc = all.match(LC);
    if (lc) return `lc:${lc[1]}`;
    const cf = all.match(CF);
    if (cf) return `cf:${cf[1]}${cf[2]}`;
    const gfg = all.match(GFG);
    if (gfg) return `gfg:${gfg[1]}`;
    const cses = all.match(CSES);
    if (cses) return `cses:${cses[1]}`;
    return null;
};

/** Canonical key from a bare LeetCode slug. */
export const lcKey = (slug) => (slug ? `lc:${slug}` : null);
