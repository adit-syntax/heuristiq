/**
 * Date and streak utilities for Heuristiq.
 * Ensures consistent, timezone-accurate local dates across all components.
 */

/**
 * Returns 'YYYY-MM-DD' formatted date string in user's local timezone.
 * @param {Date|number|string} d
 * @returns {string}
 */
export const getLocalDateKey = (d = new Date()) => {
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

/**
 * Returns true if dateStr2 is exactly 1 day after dateStr1 (calendar consecutive days).
 * Uses UTC date parsing to prevent Daylight Saving Time (DST) arithmetic skew.
 * @param {string} dateStr1 'YYYY-MM-DD'
 * @param {string} dateStr2 'YYYY-MM-DD'
 * @returns {boolean}
 */
export const areConsecutiveDays = (dateStr1, dateStr2) => {
    if (!dateStr1 || !dateStr2) return false;
    const [y1, m1, d1] = dateStr1.split('-').map(Number);
    const [y2, m2, d2] = dateStr2.split('-').map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((utc2 - utc1) / 86400000) === 1;
};

/**
 * Calculates current streak, longest streak, and whether today is solved.
 * Follows the streak rules:
 *  - Active day: At least 1 question solved or synced in that local calendar day.
 *  - Current streak: Consecutive active days ending today, or ending yesterday
 *    (in which case today is "at risk" with a grace period until midnight).
 *  - Longest streak: All-time record for consecutive active days.
 * 
 * @param {string[]} activityDates Array of 'YYYY-MM-DD' strings
 * @param {Date} [nowDate] Optional reference date for testing (defaults to now)
 */
export const calculateStreak = (activityDates = [], nowDate = new Date()) => {
    const active = new Set(activityDates || []);
    const today = new Date(nowDate);
    today.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateKey(today);
    const solvedToday = active.has(todayKey);

    // Current streak: Walk backward day by day starting from today or yesterday.
    let cursor = new Date(today);
    if (!active.has(getLocalDateKey(cursor))) {
        // Today not solved yet: check yesterday to see if streak is at risk
        cursor.setDate(cursor.getDate() - 1);
    }
    let current = 0;
    while (active.has(getLocalDateKey(cursor))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
    }

    // Longest streak: Walk every sorted active date and find maximum consecutive run.
    const sorted = [...active].sort();
    let longestRun = 0;
    let run = 0;
    let prev = null;
    for (const key of sorted) {
        if (prev && areConsecutiveDays(prev, key)) {
            run++;
        } else {
            run = 1;
        }
        longestRun = Math.max(longestRun, run);
        prev = key;
    }

    return {
        current,
        longest: Math.max(longestRun, current),
        solvedToday,
        todayKey,
    };
};
