import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getLocalDateKey } from '../lib/dateUtils';

const getLocalStorageKey = (userId) => `placement-prep-tracker-${userId || 'guest'}`;

const getDefaultData = () => ({
    startDate: null,
    endDate: null,
    dailyTarget: null,
    activeSheet: 'striver',
    dsaProgress: {},
    companySolved: {},
    questionNotes: {},
    questionTags: {},
    followedCompanies: [],
    activityDates: [],
    dailyQuestions: {},
    dailyNotes: {},
    dailyTodos: {},
});

const getLocalData = (userId) => {
    const stored = localStorage.getItem(getLocalStorageKey(userId));
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Older saves (pre-rebrand) may carry fields this version no
            // longer uses - read them back but write the current shape only.
            if (!parsed.dailyQuestions) parsed.dailyQuestions = {};
            if (!parsed.questionNotes) parsed.questionNotes = {};
            if (!parsed.questionTags) parsed.questionTags = {};
            if (!parsed.followedCompanies) parsed.followedCompanies = [];
            if (!parsed.companySolved) parsed.companySolved = {};
            if (parsed.endDate === undefined) parsed.endDate = null;
            if (parsed.dailyTarget === undefined) parsed.dailyTarget = null;
            if (!parsed.dailyNotes) parsed.dailyNotes = {};
            if (!parsed.dailyTodos) parsed.dailyTodos = {};
            if (!parsed.activityDates) parsed.activityDates = [];
            // One-time repair: drop "active" days with zero solves (the old
            // bug stamped activity on any status toggle). Today is exempt -
            // the day isn't over yet.
            const today = getLocalDateKey();
            if (Array.isArray(parsed.activityDates) && parsed.dailyQuestions) {
                // If yesterday was recorded with a solve due to UTC split, but today has 0,
                // credit today so that current day's streak stays active.
                const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));
                if (
                    parsed.dailyQuestions[yesterday] > 0 &&
                    !parsed.dailyQuestions[today] &&
                    parsed.activityDates.includes(yesterday)
                ) {
                    parsed.dailyQuestions[today] = 1;
                    if (!parsed.activityDates.includes(today)) {
                        parsed.activityDates.push(today);
                    }
                }

                const cleaned = parsed.activityDates.filter(
                    (d) => d === today || (parsed.dailyQuestions[d] || 0) > 0
                );
                if (cleaned.length !== parsed.activityDates.length) {
                    // Only re-save when something actually changed.
                    parsed.activityDates = cleaned;
                    try {
                        localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(parsed));
                    } catch { /* quota - repair applies next write */ }
                }
            }
            return parsed;
        } catch (e) {
            console.error('Error parsing stored data:', e);
        }
    }
    return getDefaultData();
};

const saveLocalData = (userId, data) => {
    try {
        localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(data));
    } catch (e) {
        // Quota exceeded or storage disabled (private mode). Cloud sync still runs.
        console.error('Local save failed:', e);
    }
};

// ---- Canonical question identity helpers (pure, module scope) -----------
// The same question appears in many lists under different ids; every list
// carries a `cid` (lc:/cf:/gfg:/cses: slug from its platform link). Status
// is stored under the cid when present, so solving it anywhere reflects
// everywhere. Legacy per-list keys still resolve (own key first, then
// same-title keys from other lists) and fold into the cid on the next write.

// Title of a legacy `prefix:scope:title` key, or null for canonical keys.
const legacyTitle = (key) => {
    const parts = key.split(':');
    return parts.length >= 3 ? parts.slice(2).join(':') : null;
};

const resolveStatus = (progress, id, cid, title) => {
    const key = cid || id;
    if (progress[key] !== undefined) return progress[key];
    if (progress[id] !== undefined) return progress[id];
    if (title) {
        for (const k of Object.keys(progress)) {
            if (legacyTitle(k) === title) return progress[k];
        }
    }
    return 'unsolved';
};

// Every stored key that refers to this same question.
const aliasKeys = (progress, id, cid, title) => {
    const out = new Set();
    const key = cid || id;
    if (id !== key && progress[id] !== undefined) out.add(id);
    if (title) {
        for (const k of Object.keys(progress)) {
            if (legacyTitle(k) === title) out.add(k);
        }
    }
    return out;
};

export const useUserData = () => {
    const { user, isGuest } = useAuth();
    const [data, setData] = useState(getDefaultData());
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const syncTimeoutRef = useRef(null);
    const isInitializedRef = useRef(false);

    // Load data on mount or user change
    useEffect(() => {
        let unsubscribe = null;
        isInitializedRef.current = false;

        const loadData = async () => {
            setLoading(true);
            setData(getDefaultData());

            if (!user || isGuest) {
                // Not logged in or guest mode - isolated to local guest storage
                setData(getLocalData('guest'));
                setLoading(false);
                isInitializedRef.current = true;
                return;
            }

            // Authenticated user - isolated to user's own cloud & local storage
            try {
                const userDocRef = doc(db, 'users', user.id, 'data', 'progress');
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    // User has cloud data
                    const cloudData = docSnap.data();
                    setData(cloudData);
                    saveLocalData(user.id, cloudData);
                } else {
                    // First time user - start fresh with independent default data
                    const defaultData = getDefaultData();
                    await setDoc(userDocRef, defaultData);
                    setData(defaultData);
                    saveLocalData(user.id, defaultData);
                }

                // Set up real-time listener for cloud changes
                unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists() && isInitializedRef.current) {
                        const cloudData = docSnap.data();
                        setData(cloudData);
                        saveLocalData(user.id, cloudData);
                    }
                });

            } catch (error) {
                console.error('Error loading data from Firestore:', error);
                // Fallback to local data for this user
                setData(getLocalData(user.id));
            }

            setLoading(false);
            isInitializedRef.current = true;
        };

        loadData();

        return () => {
            if (unsubscribe) unsubscribe();
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [user, isGuest]);

    // Debounced sync to Firestore
    const syncToCloud = useCallback(async (newData) => {
        if (!user || isGuest) return;

        setSyncing(true);
        try {
            const userDocRef = doc(db, 'users', user.id, 'data', 'progress');
            await setDoc(userDocRef, newData);
        } catch (error) {
            console.error('Error syncing to Firestore:', error);
        }
        setSyncing(false);
    }, [user, isGuest]);

    const updateData = useCallback((updater) => {
        setData((prev) => {
            const newData = typeof updater === 'function' ? updater(prev) : updater;

            // Save to localStorage immediately under the current active user ID
            const userId = user?.id || 'guest';
            saveLocalData(userId, newData);

            // Debounced sync to cloud (only for authenticated users)
            if (user && !isGuest && isInitializedRef.current) {
                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = setTimeout(() => syncToCloud(newData), 1000);
            }

            return newData;
        });
    }, [user, isGuest, syncToCloud]);

    // Helper functions
    const setStartDate = useCallback((date) => {
        updateData((prev) => ({ ...prev, startDate: date }));
    }, [updateData]);

    // Flexible goal: start, optional end date and optional daily target.
    // Any subset can change; null clears a field.
    const setGoal = useCallback(({ startDate: s, endDate: e, dailyTarget: t }) => {
        updateData((prev) => ({
            ...prev,
            startDate: s !== undefined ? s : prev.startDate,
            endDate: e !== undefined ? e : prev.endDate,
            dailyTarget: t !== undefined ? t : prev.dailyTarget,
        }));
    }, [updateData]);

    // Which sheet the tracker views and dashboard pin to. Synced, so the
    // choice follows the user across devices.
    const setActiveSheet = useCallback((sheetId) => {
        updateData((prev) => ({ ...prev, activeSheet: sheetId }));
    }, [updateData]);

    const updateDSAStatus = useCallback((questionId, status, opts = {}) => {
        const { cid, title, company } = opts;
        const today = getLocalDateKey();
        updateData((prev) => {
            const prevStatus = resolveStatus(prev.dsaProgress, questionId, cid, title);
            const key = cid || questionId;

            // Fold every alias into one canonical key.
            const dsaProgress = { ...prev.dsaProgress };
            for (const k of aliasKeys(prev.dsaProgress, questionId, cid, title)) delete dsaProgress[k];
            dsaProgress[key] = status;

            // Daily solve counter - only real solves count.
            const dailyQuestions = { ...prev.dailyQuestions };
            const currentCount = dailyQuestions[today] || 0;
            if (status === 'solved' && prevStatus !== 'solved') {
                dailyQuestions[today] = currentCount + 1;
            } else if (status !== 'solved' && prevStatus === 'solved') {
                dailyQuestions[today] = Math.max(0, currentCount - 1);
            }

            // Activity date = a day with at least one SOLVED question. Stamps
            // on a new solve; unstamps when the day's last solve is removed,
            // so toggling revision/unsolved never fabricates activity.
            let activityDates = prev.activityDates;
            const nowActive = (dailyQuestions[today] || 0) > 0;
            const wasActive = prev.activityDates.includes(today);
            if (nowActive && !wasActive) {
                activityDates = [...prev.activityDates, today];
            } else if (!nowActive && wasActive) {
                activityDates = prev.activityDates.filter((d) => d !== today);
            }

            // Per-company solved association (drives the Companies grid cards
            // without loading each company's question list).
            let companySolved = prev.companySolved;
            if (company) {
                const cur = { ...(prev.companySolved?.[company] || {}) };
                if (status === 'solved') cur[key] = 1;
                else delete cur[key];
                companySolved = { ...(prev.companySolved || {}), [company]: cur };
            }

            return {
                ...prev,
                dsaProgress,
                companySolved,
                activityDates,
                dailyQuestions,
            };
        });
    }, [updateData]);

    const getDSAStatus = useCallback((questionId, cid) => {
        return resolveStatus(data.dsaProgress, questionId, cid, null);
    }, [data.dsaProgress]);

    /** Mark a batch of canonical keys solved (coding-profile sync).
     *  Newly imported solves or syncs with activity today also credit today's streak.
     *  Returns { added, already }. */
    const markSolvedBatch = useCallback((keys, opts = {}) => {
        const { creditToday = false } = opts;
        const uniq = [...new Set(keys)];
        const fresh = uniq.filter((k) => data.dsaProgress[k] !== 'solved');
        const today = getLocalDateKey();

        if (fresh.length > 0 || creditToday) {
            updateData((prev) => {
                const dsaProgress = { ...prev.dsaProgress };
                for (const k of fresh) dsaProgress[k] = 'solved';

                // Credit today's counter/streak once per sync, not once per
                // imported question (history stays truthful elsewhere).
                const dailyQuestions = { ...prev.dailyQuestions };
                if ((dailyQuestions[today] || 0) === 0) {
                    dailyQuestions[today] = 1;
                }

                const activityDates = prev.activityDates.includes(today)
                    ? prev.activityDates
                    : [...prev.activityDates, today];

                return { ...prev, dsaProgress, dailyQuestions, activityDates };
            });
        }
        return { added: fresh.length, already: uniq.length - fresh.length };
    }, [data.dsaProgress, updateData]);

    // Per-question personal note. Empty string means "no personal note" - the
    // UI falls back to the sheet's own remark (e.g. MIK's) in that case.
    const updateQuestionNote = useCallback((questionId, note) => {
        updateData((prev) => ({
            ...prev,
            questionNotes: { ...(prev.questionNotes || {}), [questionId]: note }
        }));
    }, [updateData]);

    const getQuestionNote = useCallback((questionId) => {
        return (data.questionNotes || {})[questionId] ?? '';
    }, [data.questionNotes]);

    // Comma-separated user tags per question.
    const updateQuestionTags = useCallback((questionId, tags) => {
        updateData((prev) => ({
            ...prev,
            questionTags: { ...(prev.questionTags || {}), [questionId]: tags }
        }));
    }, [updateData]);

    const getQuestionTags = useCallback((questionId) => {
        return (data.questionTags || {})[questionId] ?? '';
    }, [data.questionTags]);

    const toggleFollowCompany = useCallback((companyId) => {
        updateData((prev) => ({
            ...prev,
            followedCompanies: prev.followedCompanies.includes(companyId)
                ? prev.followedCompanies.filter((c) => c !== companyId)
                : [...prev.followedCompanies, companyId]
        }));
    }, [updateData]);

    // Solved count for one company sheet without loading its questions:
    // legacy per-list keys carry the `${registryId}:` prefix, and marks made
    // in the company view are tracked in companySolved[registryId].
    const getCompanySolvedCount = useCallback((companyId) => {
        const prefix = `${companyId}:`;
        let count = 0;
        for (const [id, s] of Object.entries(data.dsaProgress)) {
            if (id.startsWith(prefix) && s === 'solved') count++;
        }
        count += Object.keys(data.companySolved?.[companyId] || {}).length;
        return count;
    }, [data.dsaProgress, data.companySolved]);

    const getSolvedCount = useCallback(() => {
        return Object.values(data.dsaProgress).filter((s) => s === 'solved').length;
    }, [data.dsaProgress]);

    const getWeeklyData = useCallback(() => {
        const today = new Date();
        const weekData = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - diff);

        const todayKey = getLocalDateKey(today);

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = getLocalDateKey(date);

            weekData.push({
                day: dayNames[date.getDay()],
                date: dateStr,
                questions: data.dailyQuestions?.[dateStr] || 0,
                isToday: dateStr === todayKey,
            });
        }

        return weekData;
    }, [data.dailyQuestions]);

    const resetData = useCallback(() => {
        const defaultData = getDefaultData();
        updateData(defaultData);
    }, [updateData]);

    const updateDailyNote = useCallback((dateStr, note) => {
        updateData((prev) => ({
            ...prev,
            dailyNotes: { ...prev.dailyNotes, [dateStr]: note }
        }));
    }, [updateData]);

    const addDailyTodo = useCallback((dateStr, text) => {
        const newTodo = { id: Date.now(), text, completed: false };
        updateData((prev) => {
            const currentTodos = prev.dailyTodos[dateStr] || [];
            return {
                ...prev,
                dailyTodos: { ...prev.dailyTodos, [dateStr]: [...currentTodos, newTodo] }
            };
        });
    }, [updateData]);

    const toggleDailyTodo = useCallback((dateStr, todoId) => {
        updateData((prev) => {
            const currentTodos = prev.dailyTodos[dateStr] || [];
            const updatedTodos = currentTodos.map((todo) =>
                todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
            );
            return {
                ...prev,
                dailyTodos: { ...prev.dailyTodos, [dateStr]: updatedTodos }
            };
        });
    }, [updateData]);

    const deleteDailyTodo = useCallback((dateStr, todoId) => {
        updateData((prev) => {
            const currentTodos = prev.dailyTodos[dateStr] || [];
            const updatedTodos = currentTodos.filter((todo) => todo.id !== todoId);
            return {
                ...prev,
                dailyTodos: { ...prev.dailyTodos, [dateStr]: updatedTodos }
            };
        });
    }, [updateData]);

    return {
        data,
        loading,
        syncing,
        setStartDate,
        setGoal,
        setActiveSheet,
        updateDSAStatus,
        getDSAStatus,
        markSolvedBatch,
        updateQuestionNote,
        getQuestionNote,
        updateQuestionTags,
        getQuestionTags,
        toggleFollowCompany,
        getCompanySolvedCount,
        getSolvedCount,
        getWeeklyData,
        resetData,
        updateDailyNote,
        addDailyTodo,
        toggleDailyTodo,
        deleteDailyTodo,
    };
};

export default useUserData;
