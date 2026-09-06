import {
    Calendar,
    Target,
    AlertTriangle,
    Clock,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Flame,
    Medal,
    PenTool,
    History as HistoryIcon,
    PlusCircle,
    ListTodo,
    Check,
    Plus,
    Trash2,
    Info,
    X,
} from 'lucide-react';
import DayDetails from './DayDetails';
import NoteHistory from './NoteHistory';
import LiveClock from './LiveClock';
import { SHEETS, getSheet } from '../lib/sheets';
import { useMemo, useState, useEffect, useRef } from 'react';
import LiveContestBanner from './LiveContestBanner';
import ContestReminderBanner from './ContestReminderBanner';
import { getLocalDateKey, calculateStreak } from '../lib/dateUtils';

const MOTIVATIONAL_QUOTES = [
    {
        short: "Focus on your work, not on the fruits.",
        source: "Bhagavad Gita 2:47",
        verse: "Chapter 2, Verse 47",
        fullTranslation: "You have a right to perform your prescribed duty, but you are not entitled to the fruits of your actions. Never let the fruits be your motive, nor be attached to inaction.",
        meaning: "Devote your complete focus to mastering algorithms and writing clean code rather than obsessing over interview outcomes. True mastery creates opportunities effortlessly."
    },
    {
        short: "True yoga is skill and excellence in action.",
        source: "Bhagavad Gita 2:50",
        verse: "Chapter 2, Verse 50",
        fullTranslation: "One who is endowed with equanimity of mind frees themselves from both good and bad deeds in this life. Strive therefore for Yoga, which is dexterity in action.",
        meaning: "Treat problem-solving as craft and deliberate practice rather than a sprint. Composure and attention to detail turn complex problems into routine steps."
    },
    {
        short: "The mind alone is your greatest ally or foe.",
        source: "Bhagavad Gita 6:5",
        verse: "Chapter 6, Verse 5",
        fullTranslation: "Elevate yourself through the power of your own mind; do not degrade yourself. For the mind alone is one's friend, and the mind alone is one's enemy.",
        meaning: "Doubts and distractions only have power if you feed them. Train your mind with daily disciplined problem-solving to make it your most formidable ally."
    },
    {
        short: "A restless mind is conquered by persistent practice.",
        source: "Bhagavad Gita 6:35",
        verse: "Chapter 6, Verse 35",
        fullTranslation: "The mind is undoubtedly restless and hard to restrain, but it can be mastered through ceaseless practice and detachment.",
        meaning: "When complex topics like Dynamic Programming or Graphs feel intimidating, do not quit. Consistent daily practice gradually makes the hardest ideas intuitive."
    },
    {
        short: "No sincere effort in this journey is ever wasted.",
        source: "Bhagavad Gita 2:40",
        verse: "Chapter 2, Verse 40",
        fullTranslation: "In this endeavor, no sincere effort is ever lost or wasted, and no adverse result is incurred. Even a little practice protects one from great fear.",
        meaning: "Every problem you grapple with strengthens your thinking even if you do not solve it on the first try. Every single minute invested accumulates into mastery."
    },
    {
        short: "Nothing in this world purifies like genuine knowledge.",
        source: "Bhagavad Gita 4:38",
        verse: "Chapter 4, Verse 38",
        fullTranslation: "In this world, there is nothing as purifying and liberating as knowledge. One who attains perfection through disciplined practice discovers this wisdom within.",
        meaning: "Seek deep understanding of first principles instead of memorizing solutions. True conceptual clarity eliminates fear in high-stakes technical interviews."
    },
    {
        short: "You become whatever your deepest conviction is.",
        source: "Bhagavad Gita 17:3",
        verse: "Chapter 17, Verse 3",
        fullTranslation: "A person is shaped by their deepest convictions and faith. Whatever a person's faith is, that indeed they become.",
        meaning: "Adopt the identity of a disciplined engineer who shows up every single day. Relentless self-belief backed by daily execution turns ambitions into reality."
    },
    {
        short: "Perform all essential tasks with disciplined dedication.",
        source: "Bhagavad Gita 3:19",
        verse: "Chapter 3, Verse 19",
        fullTranslation: "Constantly perform the work that ought to be done without attachment; for by doing work with pure intent, one attains the supreme state.",
        meaning: "Consistency will always defeat fleeting motivation. Show up at your desk and solve your daily quota even on days you do not feel inspired."
    },
    {
        short: "Keep your focus steady like a windless lamp.",
        source: "Bhagavad Gita 6:19",
        verse: "Chapter 6, Verse 19",
        fullTranslation: "As a lamp in a windless place does not flicker, so is the steady mind of a seeker who practices union with the deeper self.",
        meaning: "Turn off distractions and immerse yourself into deep work. An unwavering, concentrated mind solves hard engineering problems in half the time."
    },
    {
        short: "Discipline feels bitter first, but sweet at last.",
        source: "Bhagavad Gita 18:37",
        verse: "Chapter 18, Verse 37",
        fullTranslation: "That which appears like poison in the beginning but tastes like nectar in the end — that joy is born of clear self-knowledge and disciplined effort.",
        meaning: "The grind of preparation can feel exhausting in the moment, but the skill and career confidence you gain lasts a lifetime."
    },
    {
        short: "Fleeting discomfort passes; endure it with patience.",
        source: "Bhagavad Gita 2:14",
        verse: "Chapter 2, Verse 14",
        fullTranslation: "The contact of the senses with their objects gives rise to cold and heat, pleasure and pain. They are fleeting and impermanent; learn to endure them patiently.",
        meaning: "Frustration when debugging edge cases is only temporary. Remain patient and analytical, and celebrate the insight each mistake teaches you."
    },
    {
        short: "Arise, awake, and stop not until the goal is reached.",
        source: "Katha Upanishad 1:3:14",
        verse: "Chapter 1.3, Verse 14",
        fullTranslation: "Arise, awake, and stop not until the highest goal is attained. The path is subtle like the edge of a razor, but conquerable by the steadfast.",
        meaning: "Do not let complacency or momentary setbacks derail your momentum. Protect your streak and push yourself forward every single day."
    },
    {
        short: "Great results come from persistent effort, not mere wishing.",
        source: "Hitopadesha 1:36",
        verse: "Prastavika, Verse 36",
        fullTranslation: "Tasks are accomplished by deliberate, persistent effort, never by mere wishful thinking. A sleeping lion catches no prey.",
        meaning: "Dreaming of top tech offers is easy; putting in the focused practice hours is what makes it happen. Let your code speak for your ambition."
    }
];

const Stat = ({ value, label }) => (
    <div className="rounded-2xl border border-line bg-panel p-4">
        <p className="font-mono text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-subtle">{label}</p>
    </div>
);

/** Modal explaining streak rules & logic */
const StreakInfoModal = ({ onClose }) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5 sm:p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20">
                        <Flame className="size-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-fg">Streak Rules</h3>
                        <p className="text-xs text-subtle">How consistency, daily resets, and streaks work</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                >
                    <X className="size-4" />
                </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted">
                <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-raised/40 p-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-hi font-bold text-[11px]">1</span>
                    <div>
                        <p className="font-semibold text-fg">1 Problem = 1 Active Day</p>
                        <p className="mt-0.5 text-subtle">
                            Solving at least <strong className="text-fg">1 problem</strong> in any sheet, or syncing newly solved questions from LeetCode / Codeforces stamps today as active.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-raised/40 p-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">2</span>
                    <div>
                        <p className="font-semibold text-fg">Local Midnight Reset (Your Timezone)</p>
                        <p className="mt-0.5 text-subtle">
                            Streaks run on your device's local calendar day (<span className="font-mono text-fg">00:00 → 23:59</span>). You have until midnight in your own local time to keep the flame alive.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-raised/40 p-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 font-bold text-[11px]">3</span>
                    <div>
                        <p className="font-semibold text-fg">At-Risk Grace Period</p>
                        <p className="mt-0.5 text-subtle">
                            If you solved yesterday, your streak won't break during the day—it stays marked <strong className="text-fg">"At Risk"</strong>. Solving any question before midnight securely advances the streak.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-raised/40 p-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-[11px]">4</span>
                    <div>
                        <p className="font-semibold text-fg">Coding Profile Sync</p>
                        <p className="mt-0.5 text-subtle">
                            Syncing LeetCode or Codeforces detects accepted submissions completed today in your local time and credits today's streak instantly.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-5 flex justify-end">
                <button
                    onClick={onClose}
                    className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                    Got it
                </button>
            </div>
        </div>
    </div>
);

/** Duolingo-style streak bar: flame for the current streak, a medal for the
 *  longest streak ever. Sits above the calendar. */
const StreakHeader = ({ activityDates }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    const { current, longest, solvedToday } = useMemo(() => {
        return calculateStreak(activityDates);
    }, [activityDates]);

    return (
        <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between px-0.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    <Flame className="size-3.5 text-accent-hi" />
                    Consistency & Streaks
                </span>
                <button
                    onClick={() => setInfoOpen(true)}
                    title="How streaks work"
                    className="group flex items-center gap-1.5 rounded-lg border border-line bg-raised/50 px-2 py-0.5 text-[11px] font-medium text-subtle transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent-hi"
                >
                    <Info className="size-3 text-subtle transition-colors group-hover:text-accent-hi" />
                    <span>Streak logic</span>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Current streak - flame */}
                <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3
                    ${current > 0 ? 'border-accent/25 bg-accent/10' : 'border-line bg-raised/40'}`}>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${current > 0 ? 'bg-accent/20' : 'bg-raised'}`}>
                        <Flame
                            className={`size-5 ${current > 0 ? 'fill-accent/30 text-accent-hi' : 'text-faint'} ${solvedToday ? 'animate-pulse' : ''}`}
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="font-mono text-xl font-bold leading-none">
                            {current}
                            <span className="ml-1 text-xs font-medium text-subtle">{current === 1 ? 'day streak' : 'day streaks'}</span>
                        </p>
                        <p className="mt-1 truncate text-xs text-subtle">
                            {current === 0 ? 'Solve one problem to start'
                                : solvedToday ? 'Solved today - streak safe'
                                : 'Not solved yet today (at risk)'}
                        </p>
                    </div>
                </div>

                {/* Longest streak - achievement medal */}
                <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3
                    ${longest >= 7 ? 'border-amber-500/30 bg-amber-500/10' : 'border-line bg-raised/40'}`}>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${longest >= 7 ? 'bg-amber-500/20' : 'bg-raised'}`}>
                        <Medal className={`size-5 ${longest >= 7 ? 'text-amber-400' : 'text-faint'}`} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-mono text-xl font-bold leading-none">
                            {longest}
                            <span className="ml-1 text-xs font-medium text-subtle">{longest === 1 ? 'day best' : 'days best'}</span>
                        </p>
                        <p className="mt-1 truncate text-xs text-subtle">
                            {longest >= 30 ? 'Legendary consistency'
                                : longest >= 14 ? 'Unstoppable'
                                : longest >= 7 ? 'Week warrior - keep going'
                                : 'Reach 7 days for bronze'}
                        </p>
                    </div>
                </div>
            </div>

            {infoOpen && <StreakInfoModal onClose={() => setInfoOpen(false)} />}
        </div>
    );
};

/** Flexible goal editor: start date, optional deadline, optional daily
 *  target. All three independently settable/clearable. */
const GoalEditor = ({ startDate, endDate, dailyTarget, onSave, onDone }) => {
    const [start, setStart] = useState(startDate || '');
    const [end, setEnd] = useState(endDate || '');
    const [target, setTarget] = useState(dailyTarget ? String(dailyTarget) : '');

    const inputCls = 'w-full rounded-xl border border-line bg-raised/50 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none';

    const save = () => {
        const t = parseInt(target, 10);
        onSave({
            startDate: start || null,
            endDate: end || null,
            dailyTarget: Number.isFinite(t) && t > 0 ? t : null,
        });
        onDone?.();
    };

    // Quick presets for the deadline.
    const setDeadlineInDays = (days) => {
        if (!start) return;
        const d = new Date(start);
        d.setDate(d.getDate() + days);
        setEnd(d.toISOString().split('T')[0]);
    };

    return (
        <div className="mt-4 space-y-3 rounded-xl border border-line bg-raised/30 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Start date</label>
                    <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Deadline (optional)</label>
                    <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Daily target (optional)</label>
                    <input
                        type="number"
                        min="1"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        placeholder="e.g. 3"
                        className={inputCls}
                    />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {start && [30, 60, 90, 180].map((d) => (
                    <button
                        key={d}
                        onClick={() => setDeadlineInDays(d)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors
                            ${end && Math.round((new Date(end) - new Date(start)) / 86400000) === d
                                ? 'bg-accent text-white'
                                : 'bg-raised text-muted hover:text-fg'}`}
                    >
                        {d}-day
                    </button>
                ))}
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => { setStart(startDate || ''); setEnd(endDate || ''); setTarget(dailyTarget ? String(dailyTarget) : ''); onDone?.(); }}
                        className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={!start}
                        className="rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-50"
                    >
                        Save goal
                    </button>
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({
    data,
    setGoal,
    setActiveSheet,
    getDSAStatus,
    getWeeklyData,
    userName,
    updateDailyNote,
    addDailyTodo,
    toggleDailyTodo,
    deleteDailyTodo
}) => {
    // The dashboard tracks the pinned sheet; switching it here also switches
    // the DSA tab (same synced field).
    const activeSheet = data.activeSheet || 'striver';
    const sheet = getSheet(activeSheet);

    // Question data is a lazy-loaded module per sheet (~500 kB for Striver);
    // the dashboard only needs the question id set to compute per-sheet stats.
    const [sheetQuestions, setSheetQuestions] = useState([]);
    useEffect(() => {
        let live = true;
        sheet.load().then((qs) => { if (live) setSheetQuestions(qs); });
        return () => { live = false; };
    }, [sheet]);

    const solvedQuestions = useMemo(
        () => sheetQuestions.filter((q) => getDSAStatus(q.id, q.cid) === 'solved').length,
        [sheetQuestions, getDSAStatus]
    );
    const revisionQuestions = useMemo(
        () => sheetQuestions.filter((q) => getDSAStatus(q.id, q.cid) === 'revision').length,
        [sheetQuestions, getDSAStatus]
    );
    const totalQuestions = sheetQuestions.length;

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [goalOpen, setGoalOpen] = useState(false);
    const [sheetMenuOpen, setSheetMenuOpen] = useState(false);

    // Daily task & calendar selection state
    const todayStr = useMemo(() => getLocalDateKey(), []);
    const [activeDate, setActiveDate] = useState(todayStr);
    const [taskInput, setTaskInput] = useState('');
    const tasksSliderRef = useRef(null);

    // Motivational quote randomized on every refresh / page load (does not change on click)
    const [quoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
    const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex];
    const [quoteInfoOpen, setQuoteInfoOpen] = useState(false);
    const [quoteHovered, setQuoteHovered] = useState(false);
    const quoteRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (quoteRef.current && !quoteRef.current.contains(e.target)) {
                setQuoteInfoOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, []);

    const isToday = activeDate === todayStr;
    const activeDateObj = useMemo(() => {
        if (!activeDate) return new Date();
        const [y, m, d] = activeDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }, [activeDate]);

    const formattedActiveDate = useMemo(() => {
        return activeDateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }, [activeDateObj]);

    const currentTodos = useMemo(() => {
        return data.dailyTodos?.[activeDate] || [];
    }, [data.dailyTodos, activeDate]);

    const completedTodosCount = useMemo(() => {
        return currentTodos.filter((t) => t.completed).length;
    }, [currentTodos]);

    const handleAddTask = (e) => {
        e.preventDefault();
        if (!taskInput.trim()) return;
        addDailyTodo(activeDate, taskInput.trim());
        setTaskInput('');
        setTimeout(() => {
            if (tasksSliderRef.current) {
                tasksSliderRef.current.scrollTo({
                    left: tasksSliderRef.current.scrollWidth,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const slideTasks = (dir) => {
        if (tasksSliderRef.current) {
            tasksSliderRef.current.scrollBy({ top: dir * 120, behavior: 'smooth' });
        }
    };

    // Calculate days info - fully flexible goal:
    //   endDate set   -> pace the sheet across start..end
    //   dailyTarget   -> pace by N questions/day (works with or without an end date)
    //   neither       -> nothing to pace (classic 90-day default only on first set)
    const daysInfo = useMemo(() => {
        if (!data.startDate) return null;

        const start = new Date(data.startDate);
        start.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysPassed = Math.max(0, Math.round((today - start) / 86400000));
        let end = null;
        let daysRemaining = null;
        let totalDays = null;

        if (data.endDate) {
            end = new Date(data.endDate);
            end.setHours(0, 0, 0, 0);
            totalDays = Math.max(1, Math.round((end - start) / 86400000));
            daysRemaining = Math.max(0, Math.round((end - today) / 86400000));
        }

        return { start, end, daysPassed, daysRemaining, totalDays };
    }, [data.startDate, data.endDate]);

    // Pacing: end-date mode spreads the sheet over the window; daily-target
    // mode multiplies the target by days elapsed. If both are set, the
    // stricter (higher) expectation wins - you see the ambitious number.
    const pacingInfo = useMemo(() => {
        if (!daysInfo) return null;
        const { daysPassed } = daysInfo;

        let perDay = null;
        let expected = null;

        if (daysInfo.totalDays) {
            const byEnd = totalQuestions / daysInfo.totalDays;
            perDay = byEnd;
            expected = byEnd * daysPassed;
        }
        if (data.dailyTarget) {
            const byTarget = data.dailyTarget * daysPassed;
            if (perDay === null) perDay = data.dailyTarget;
            expected = expected === null ? byTarget : Math.max(expected, byTarget);
        }

        if (expected === null) return null;
        return {
            expectedQuestions: Math.floor(expected),
            questionDifference: Math.floor(expected) - solvedQuestions,
            questionsPerDay: Number.isFinite(perDay) ? perDay.toFixed(1) : '…',
        };
    }, [daysInfo, solvedQuestions, totalQuestions, data.dailyTarget]);

    // Calendar data for the current month with weeks in rows
    const calendarData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
        // We want Monday to be the start, so adjust
        let startDayOfWeek = firstDay.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Convert to Monday = 0

        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Add empty cells for days before the first of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ empty: true });
        }

        // Add all days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            // Use local date string construction to avoid timezone shifts caused by toISOString() check
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;
            const isActive = data.activityDates.includes(dateStr);

            days.push({
                day,
                dateStr,
                isToday,
                isPast,
                isActive,
                empty: false
            });
        }

        // Group into weeks (7 days each)
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }

        // Pad the last week if necessary
        const lastWeek = weeks[weeks.length - 1];
        while (lastWeek && lastWeek.length < 7) {
            lastWeek.push({ empty: true });
        }

        return weeks;
    }, [currentMonth, data.activityDates]);

    const activeDaysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        return data.activityDates.filter(dateStr => {
            const date = new Date(dateStr);
            return date.getFullYear() === year && date.getMonth() === month;
        }).length;
    }, [currentMonth, data.activityDates]);

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getMonthName = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const navigateMonth = (direction) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const getCurrentDateInfo = () => {
        const now = new Date();
        return now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    const weekDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    const weekly = getWeeklyData();
    const maxWeekly = Math.max(...weekly.map((d) => d.questions), 5);

    // Completion percentages (DSA only)
    const dsaPercentage = totalQuestions ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;

    return (
        <div className="animate-fade-in space-y-5">
            {/* Live contest attention banner (non-dismissible) */}
            <LiveContestBanner />

            {/* Dismissible reminders for later-today contests */}
            <ContestReminderBanner />

            {/* Header */}
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-raised/50 px-2.5 font-mono text-xs font-medium uppercase tracking-wider text-subtle leading-none">
                        <Calendar className="size-3.5 shrink-0 text-accent-hi" />
                        <span className="leading-none">{getCurrentDateInfo()}</span>
                    </span>
                    <LiveClock />
                </div>
                <div className="mt-2 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl shrink-0 text-fg">
                        {getGreeting()}, <span className="text-accent-hi">{userName || 'User'}</span>
                    </h1>
                    {currentQuote && (
                        <div
                            ref={quoteRef}
                            className="relative flex flex-col items-start md:items-end text-left md:text-right max-w-sm sm:max-w-md md:ml-auto select-text"
                        >
                            <p className="font-serif italic text-xs sm:text-sm font-medium text-zinc-400 leading-snug">
                                “{currentQuote.short}”
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-semibold text-subtle uppercase tracking-wider">
                                <span>— {currentQuote.source}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setQuoteInfoOpen((prev) => !prev);
                                    }}
                                    onMouseEnter={() => setQuoteHovered(true)}
                                    onMouseLeave={() => setQuoteHovered(false)}
                                    title="View verse translation & practical focus"
                                    aria-label="View verse translation and practical focus"
                                    className="group inline-flex items-center justify-center rounded-full p-0.5 text-zinc-400 transition-colors hover:text-accent-hi focus:outline-none"
                                >
                                    <Info className="size-3 transition-transform group-hover:scale-110" />
                                </button>
                            </div>

                            {/* Sleek dark-themed tooltip / modal */}
                            {(quoteInfoOpen || quoteHovered) && (
                                <div
                                    onMouseEnter={() => setQuoteHovered(true)}
                                    onMouseLeave={() => setQuoteHovered(false)}
                                    className="absolute right-0 top-full z-50 mt-2 w-72 sm:w-88 md:w-96 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 sm:p-5 text-left shadow-2xl backdrop-blur-xl animate-fade-in"
                                >
                                    <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-2.5">
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-rose-400">
                                                {currentQuote.source}
                                            </span>
                                            <p className="mt-1 font-mono text-[10px] text-zinc-500">
                                                {currentQuote.verse}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQuoteInfoOpen(false);
                                                setQuoteHovered(false);
                                            }}
                                            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                                            aria-label="Close"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>

                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Full Translation</p>
                                            <p className="mt-1 font-serif italic text-xs sm:text-[13px] leading-relaxed text-zinc-200">
                                                “{currentQuote.fullTranslation}”
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                                            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                                                <span className="size-1.5 rounded-full bg-rose-400" />
                                                Practical Focus
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                                                {currentQuote.meaning}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={solvedQuestions} label="Solved" />
                <Stat value={`${dsaPercentage}%`} label="Sheet done" />
                <Stat value={revisionQuestions} label="For revision" />
                <Stat value={activeDaysInMonth} label="Active this month" />
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
                {/* Left column */}
                <div className="space-y-5 lg:col-span-3">
                    {/* Sheet progress - the pinned sheet */}
                    <div className="rounded-2xl border border-line bg-panel p-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-muted">Sheet progress</h3>
                                {/* Pinned sheet dropdown - also drives the DSA tab */}
                                <div className="relative">
                                    <button
                                        onClick={() => setSheetMenuOpen(!sheetMenuOpen)}
                                        className="flex items-center gap-1.5 rounded-lg border border-line bg-raised/50 px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-fg"
                                    >
                                        {sheet.name}
                                        <ChevronDown className={`size-3.5 transition-transform ${sheetMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {sheetMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setSheetMenuOpen(false)} />
                                            <div className="absolute left-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-panel py-1.5 shadow-2xl">
                                                {SHEETS.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => { setActiveSheet?.(s.id); setSheetMenuOpen(false); }}
                                                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors
                                                            ${activeSheet === s.id ? 'bg-accent/10 text-accent-hi' : 'text-muted hover:bg-raised/60 hover:text-fg'}`}
                                                    >
                                                        <span className="truncate">{s.name}</span>
                                                        {activeSheet === s.id && <span className="size-1.5 shrink-0 rounded-full bg-accent-hi" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="font-mono text-sm text-subtle">
                                <span className="text-lg font-semibold text-fg">{solvedQuestions}</span>
                                {' / '}{totalQuestions || '…'}
                            </p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-raised">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-data via-data to-data-hi transition-[width] duration-500"
                                style={{ width: `${dsaPercentage}%` }}
                            />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-subtle">
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-data" /> solved
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500" /> {revisionQuestions} marked for revision
                            </span>
                        </div>
                    </div>

                    {/* Weekly chart */}
                    <div className="rounded-2xl border border-line bg-panel p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted">Questions this week</h3>
                            <span className="flex items-center gap-1.5 text-xs text-subtle">
                                <span className="size-2 rounded-sm bg-data" /> solved / day
                            </span>
                        </div>
                        <div className="flex h-32 items-end gap-2 sm:gap-3">
                            {weekly.map((day, index) => (
                                <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                                    {day.questions > 0 && (
                                        <span className="font-mono text-xs text-muted">{day.questions}</span>
                                    )}
                                    <div
                                        className={`w-full rounded-t-md transition-[height] ${day.isToday ? 'bg-data-hi' : 'bg-data/60'}`}
                                        style={{ height: `${Math.max((day.questions / maxWeekly) * 100, day.questions > 0 ? 6 : 2)}%` }}
                                        title={`${day.questions} questions`}
                                    />
                                    <span className={`text-[11px] font-medium ${day.isToday ? 'text-data-hi' : 'text-subtle'}`}>
                                        {day.day}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Goal / pacing - flexible: start date, optional end date
                        and optional daily target. */}
                    {daysInfo ? (
                        <div className="rounded-2xl border border-line bg-panel p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent-hi">
                                        <Target className="size-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">
                                            {daysInfo.totalDays ? `${daysInfo.totalDays}-Day Goal` : 'Daily Goal'}
                                        </h3>
                                        <p className="font-mono text-xs text-subtle">
                                            {formatDate(daysInfo.start)}
                                            {daysInfo.end ? ` → ${formatDate(daysInfo.end)}` : ' → open-ended'}
                                            {data.dailyTarget ? ` · ${data.dailyTarget}/day` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setGoalOpen((v) => !v)}
                                    className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                                >
                                    {goalOpen ? 'Close' : 'Edit goal'}
                                </button>
                            </div>

                            {goalOpen && (
                                <GoalEditor
                                    startDate={data.startDate}
                                    endDate={data.endDate}
                                    dailyTarget={data.dailyTarget}
                                    onSave={setGoal}
                                    onDone={() => setGoalOpen(false)}
                                />
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl bg-raised/50 p-3">
                                    <p className="font-mono text-lg font-semibold">{daysInfo.daysPassed}</p>
                                    <p className="text-[11px] uppercase tracking-wide text-subtle">Days passed</p>
                                </div>
                                <div className="rounded-xl bg-raised/50 p-3">
                                    <p className="font-mono text-lg font-semibold text-accent-hi">
                                        {daysInfo.daysRemaining ?? '—'}
                                    </p>
                                    <p className="text-[11px] uppercase tracking-wide text-subtle">Days left</p>
                                </div>
                                <div className="rounded-xl bg-raised/50 p-3">
                                    <p className="font-mono text-lg font-semibold">{pacingInfo?.questionsPerDay ?? '…'}</p>
                                    <p className="text-[11px] uppercase tracking-wide text-subtle">Questions/day</p>
                                </div>
                                <div className="rounded-xl bg-raised/50 p-3">
                                    <p className="font-mono text-lg font-semibold">{pacingInfo?.expectedQuestions ?? '—'}</p>
                                    <p className="text-[11px] uppercase tracking-wide text-subtle">Target so far</p>
                                </div>
                            </div>

                            {pacingInfo && pacingInfo.questionDifference > 0 && (
                                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                                    <AlertTriangle className="size-4 shrink-0" />
                                    <span>
                                        <strong>{pacingInfo.questionDifference} questions behind</strong> schedule
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel p-8 text-center">
                            <Clock className="size-10 text-subtle" />
                            <div>
                                <h3 className="font-semibold">Set your goal</h3>
                                <p className="mt-1 text-sm text-subtle">Pick a start date, an optional deadline and daily pace</p>
                            </div>
                            <GoalEditor
                                startDate={data.startDate}
                                endDate={data.endDate}
                                dailyTarget={data.dailyTarget}
                                onSave={setGoal}
                                onDone={() => setGoalOpen(false)}
                            />
                        </div>
                    )}
                </div>

                {/* Right column: calendar with streak header (Duolingo-style) & daily tasks */}
                <div className="flex flex-col justify-between rounded-2xl border border-line bg-panel p-5 lg:col-span-2">
                    <div>
                        {/* Streak strip */}
                        <StreakHeader activityDates={data.activityDates} />

                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">{getMonthName(currentMonth)}</h3>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => navigateMonth(-1)}
                                    className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <button
                                    onClick={() => navigateMonth(1)}
                                    className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1.5">
                            {weekDays.map((day) => (
                                <div key={day} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle">
                                    {day}
                                </div>
                            ))}

                            {calendarData.flat().map((day, index) => {
                                if (day.empty) return <div key={index} className="aspect-square" />;
                                const isSelected = day.dateStr === activeDate;
                                const hasTodos = (data.dailyTodos?.[day.dateStr]?.length || 0) > 0;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (activeDate === day.dateStr) {
                                                setSelectedDate(day.dateStr);
                                            } else {
                                                setActiveDate(day.dateStr);
                                            }
                                        }}
                                        title={`${day.dateStr} - ${day.isActive ? 'active' : 'inactive'}${hasTodos ? ' (has tasks)' : ''}`}
                                        className={`relative flex aspect-square items-center justify-center rounded-lg font-mono text-sm transition-all
                                            ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-panel font-bold z-10' : ''}
                                            ${day.isActive
                                                ? 'bg-data/25 font-semibold text-fg hover:bg-data/35'
                                                : day.isToday
                                                    ? 'font-semibold text-accent-hi hover:bg-raised'
                                                    : day.isPast
                                                        ? 'text-faint hover:bg-raised'
                                                        : 'text-muted hover:bg-raised'}`}
                                    >
                                        {day.day}
                                        {hasTodos && (
                                            <span className="absolute bottom-1 size-1 rounded-full bg-accent-hi" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-subtle">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded bg-data/40" /> Active ({activeDaysInMonth})
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded bg-raised ring-1 ring-inset ring-line" /> Missed
                                </span>
                            </div>
                            {activeDate !== todayStr && (
                                <button
                                    onClick={() => setActiveDate(todayStr)}
                                    className="text-[11px] font-medium text-accent-hi transition-colors hover:underline"
                                >
                                    Back to today
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Daily Tasks to be done - embedded directly below calendar */}
                    <div className="mt-5 flex flex-col border-t border-line pt-4">
                        {/* Tasks Header */}
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-hi">
                                    <ListTodo className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Tasks to be done</h4>
                                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${isToday ? 'bg-accent/15 text-accent-hi' : 'bg-raised text-subtle'}`}>
                                            {isToday ? 'Today' : formattedActiveDate}
                                        </span>
                                    </div>
                                    {currentTodos.length > 0 && (
                                        <p className="text-[11px] text-subtle">
                                            {completedTodosCount} of {currentTodos.length} completed
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Slider navigation & Open Details */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {currentTodos.length > 3 && (
                                    <div className="flex items-center gap-1 mr-1">
                                        <button
                                            onClick={() => slideTasks(-1)}
                                            title="Slide up"
                                            className="flex size-7 items-center justify-center rounded-lg border border-line bg-raised/40 text-subtle transition-colors hover:bg-raised hover:text-fg"
                                        >
                                            <ChevronUp className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => slideTasks(1)}
                                            title="Slide down"
                                            className="flex size-7 items-center justify-center rounded-lg border border-line bg-raised/40 text-subtle transition-colors hover:bg-raised hover:text-fg"
                                        >
                                            <ChevronDown className="size-3.5" />
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedDate(activeDate)}
                                    title="Open day notes & full planner"
                                    className="flex size-7 items-center justify-center rounded-lg border border-line bg-raised/40 text-subtle transition-colors hover:bg-raised hover:text-fg"
                                >
                                    <PenTool className="size-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Quick Add Task Input */}
                        <form onSubmit={handleAddTask} className="mb-3 flex items-center gap-2">
                            <input
                                type="text"
                                value={taskInput}
                                onChange={(e) => setTaskInput(e.target.value)}
                                placeholder={`Add task for ${isToday ? 'today' : formattedActiveDate}...`}
                                className="flex-1 rounded-xl border border-line bg-raised/40 px-3 py-1.5 text-xs text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!taskInput.trim()}
                                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hi disabled:opacity-40"
                                title="Add task"
                            >
                                <Plus className="size-4" />
                            </button>
                        </form>

                        {/* Vertical Scroll / Slide for Tasks */}
                        {currentTodos.length > 0 ? (
                            <div
                                ref={tasksSliderRef}
                                className="max-h-56 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-line pr-1 scroll-smooth"
                            >
                                {currentTodos.map((todo) => (
                                    <div
                                        key={todo.id}
                                        className={`group flex items-center justify-between gap-2.5 rounded-xl border p-2.5 transition-all
                                            ${todo.completed
                                                ? 'border-line/40 bg-raised/20 text-subtle'
                                                : 'border-line bg-raised/50 text-fg hover:border-accent/40 hover:bg-raised'
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleDailyTodo(activeDate, todo.id)}
                                            className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors
                                                ${todo.completed
                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                    : 'border-subtle/60 text-transparent hover:border-accent'
                                                }`}
                                            title={todo.completed ? 'Mark incomplete' : 'Mark complete'}
                                        >
                                            <Check className="size-3" strokeWidth={3} />
                                        </button>
                                        <span
                                            className={`min-w-0 flex-1 text-xs font-medium leading-snug break-words select-none ${todo.completed ? 'line-through text-subtle' : 'text-fg'}`}
                                            title={todo.text}
                                        >
                                            {todo.text}
                                        </span>
                                        <button
                                            onClick={() => deleteDailyTodo(activeDate, todo.id)}
                                            className="shrink-0 rounded p-1 text-subtle opacity-50 transition-all hover:text-rose-400 group-hover:opacity-100"
                                            title="Delete task"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line/60 bg-raised/20 py-3.5 px-3 text-center text-xs text-subtle">
                                <ListTodo className="size-4 text-faint" />
                                <span>No tasks added yet. Add one above!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Planner banner */}
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent-hi">
                        <PenTool className="size-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Daily planner & notes</h3>
                        <p className="text-sm text-subtle">Tasks and learnings for each day, kept with your progress</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => {
                            const today = new Date();
                            const y = today.getFullYear();
                            const m = String(today.getMonth() + 1).padStart(2, '0');
                            const d = String(today.getDate()).padStart(2, '0');
                            setSelectedDate(`${y}-${m}-${d}`);
                        }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi sm:flex-none"
                    >
                        <PlusCircle className="size-4" />
                        Today's plan
                    </button>
                    <button
                        onClick={() => setHistoryOpen(true)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-raised/50 px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg sm:flex-none"
                    >
                        <HistoryIcon className="size-4" />
                        History
                    </button>
                </div>
            </div>

            {/* Daily Details Modal - keyed by date so editor state resets per day */}
            {selectedDate && (
                <DayDetails
                    key={selectedDate}
                    dateStr={selectedDate}
                    onClose={() => setSelectedDate(null)}
                    note={data.dailyNotes?.[selectedDate]}
                    todos={data.dailyTodos?.[selectedDate]}
                    onUpdateNote={updateDailyNote}
                    onAddTodo={addDailyTodo}
                    onToggleTodo={toggleDailyTodo}
                    onDeleteTodo={deleteDailyTodo}
                />
            )}

            {/* History Modal */}
            {historyOpen && (
                <NoteHistory
                    data={data}
                    onClose={() => setHistoryOpen(false)}
                    onSelectDate={(date) => {
                        setSelectedDate(date);
                        setHistoryOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;
