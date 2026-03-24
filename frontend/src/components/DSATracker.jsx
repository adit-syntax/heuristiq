import { useState, useMemo, useEffect } from 'react';
import {
    Code2,
    ExternalLink,
    Filter,
    Search,
    CheckCircle2,
    Circle,
    RotateCcw,
    ChevronDown,
    ChevronRight,
    Youtube,
    FileText,
    Sparkles,
    BookOpen,
    Star,
    SquareCode,
    ListChecks,
    PlayCircle,
    StickyNote,
    Github
} from 'lucide-react';
import SolveModal from './SolveModal';
import QuestionNoteModal from './QuestionNoteModal';
import VideoModal from './VideoModal';
import CourseVideos from './CourseVideos';
import { getYouTubeId } from '../lib/youtube';
import { SHEETS, getSheet } from '../lib/sheets';

const DSATracker = ({ updateDSAStatus, getDSAStatus, getQuestionNote, updateQuestionNote, getQuestionTags, updateQuestionTags, theme = 'dark', sheetId, onSheetChange, jumpQuery }) => {
    const [view, setView] = useState('sheet'); // 'sheet' | 'video'
    const [filterTopic, setFilterTopic] = useState('all');
    const [filterCompany, setFilterCompany] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDifficulty, setFilterDifficulty] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showTopicDropdown, setShowTopicDropdown] = useState(false);
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [showSheetDropdown, setShowSheetDropdown] = useState(false);
    const [expandedTopics, setExpandedTopics] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [solving, setSolving] = useState(null);
    const [noting, setNoting] = useState(null);
    const [video, setVideo] = useState(null);

    const sheet = getSheet(sheetId);

    // Videos view only exists for sheets with a course playlist; fall back to
    // the sheet view without an effect by deriving it.
    const effectiveView = sheet.hasPlaylist ? view : 'sheet';

    // The question data is a lazy-loaded module per sheet (~500 kB for
    // Striver); swap it when the active sheet changes.
    const [flattenedQuestions, setFlattenedQuestions] = useState([]);
    const [sheetLoading, setSheetLoading] = useState(true);
    useEffect(() => {
        let live = true;
        sheet.load().then((qs) => {
            if (live) { setFlattenedQuestions(qs); setSheetLoading(false); }
        });
        return () => { live = false; };
    }, [sheet]);

    // Per-sheet solved count: only ids belonging to the active sheet.
    const solvedCount = useMemo(
        () => flattenedQuestions.filter((q) => getDSAStatus(q.id, q.cid) === 'solved').length,
        [flattenedQuestions, getDSAStatus]
    );

    // Watch in-app when the link is embeddable, otherwise fall back to a tab.
    const openVideo = (question) => {
        if (getYouTubeId(question.youTubeLink)) {
            setVideo({ url: question.youTubeLink, title: question.problem });
        } else if (question.youTubeLink) {
            window.open(question.youTubeLink, '_blank', 'noopener');
        }
    };

    const totalQuestions = flattenedQuestions.length;
    const solvedPercentage = totalQuestions > 0 ? Math.round((solvedCount / totalQuestions) * 100) : 0;

    // Global-search jump: land on this sheet pre-filtered to the query.
    // Adjust-state-during-render (the React-endorsed derive pattern) instead
    // of an effect.
    const [lastJump, setLastJump] = useState(null);
    if (jumpQuery && jumpQuery !== lastJump) {
        setLastJump(jumpQuery);
        setSearchQuery(jumpQuery);
    }

    const topics = useMemo(() => {
        const topicSet = new Set(flattenedQuestions.map(q => q.topic));
        return ['all', ...Array.from(topicSet)];
    }, [flattenedQuestions]);

    // Company chips from the sheet's own tags column (MIK), sorted by count.
    const companies = useMemo(() => {
        const counts = new Map();
        flattenedQuestions.forEach((q) => {
            String(q.companies || '').split(/[,;]+/).forEach((raw) => {
                const c = raw.trim();
                if (c) counts.set(c, (counts.get(c) || 0) + 1);
            });
        });
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }, [flattenedQuestions]);

    // Difficulty chips only make sense for sheets that carry the field
    // (SDE, NeetCode, Blind, Top 150, SQL).
    const hasDifficulty = useMemo(
        () => flattenedQuestions.some((q) => q.difficulty),
        [flattenedQuestions]
    );

    const filteredQuestions = useMemo(() => {
        return flattenedQuestions.filter(question => {
            const status = getDSAStatus(question.id, question.cid);
            if (filterTopic !== 'all' && question.topic !== filterTopic) return false;
            if (filterStatus !== 'all' && status !== filterStatus) return false;
            if (filterDifficulty !== 'all' && question.difficulty !== filterDifficulty) return false;
            if (filterCompany !== 'all' && !String(question.companies || '').includes(filterCompany)) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    question.problem.toLowerCase().includes(query) ||
                    question.topic.toLowerCase().includes(query) ||
                    question.subtopic.toLowerCase().includes(query) ||
                    String(question.companies || '').toLowerCase().includes(query) ||
                    String(question.learn || '').toLowerCase().includes(query) ||
                    getQuestionTags(question.id).toLowerCase().includes(query)
                );
            }
            return true;
        });
    }, [flattenedQuestions, filterTopic, filterStatus, filterDifficulty, filterCompany, searchQuery, getDSAStatus, getQuestionTags]);

    const groupedQuestions = useMemo(() => {
        const grouped = {};
        filteredQuestions.forEach(q => {
            if (!grouped[q.topic]) {
                grouped[q.topic] = { topicIndex: q.order[0], categories: {} };
            }
            if (!grouped[q.topic].categories[q.subtopic]) {
                grouped[q.topic].categories[q.subtopic] = { categoryIndex: q.order[1], questions: [] };
            }
            grouped[q.topic].categories[q.subtopic].questions.push(q);
        });

        const sortedGrouped = {};
        Object.keys(grouped)
            .sort((a, b) => grouped[a].topicIndex - grouped[b].topicIndex)
            .forEach(topic => {
                sortedGrouped[topic] = grouped[topic];
                const sortedCategories = {};
                Object.keys(grouped[topic].categories)
                    .sort((a, b) => grouped[topic].categories[a].categoryIndex - grouped[topic].categories[b].categoryIndex)
                    .forEach(cat => {
                        sortedCategories[cat] = grouped[topic].categories[cat];
                        sortedCategories[cat].questions.sort((a, b) => a.order[2] - b.order[2]);
                    });
                sortedGrouped[topic].categories = sortedCategories;
            });

        return sortedGrouped;
    }, [filteredQuestions]);

    const getStatusIcon = (status, size = 'normal') => {
        const sizeClass = size === 'small' ? 'size-5' : 'size-6';
        switch (status) {
            case 'solved':
                return <CheckCircle2 className={`${sizeClass} text-emerald-500`} />;
            case 'revision':
                return <RotateCcw className={`${sizeClass} text-amber-500`} />;
            default:
                return <Circle className={`${sizeClass} text-faint`} />;
        }
    };

    // Sheets that carry difficulty (SDE, NeetCode, Blind, Top 150) show a chip.
    const diffChip = (difficulty) => difficulty ? (
        <span className={`ml-1.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase
            ${difficulty === 'Easy' ? 'bg-emerald-500/15 text-emerald-500'
                : difficulty === 'Medium' ? 'bg-amber-500/15 text-amber-500'
                : 'bg-rose-500/15 text-rose-500'}`}>
            {difficulty}
        </span>
    ) : null;

    const toggleTopic = (topic) => {
        setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
    };

    const toggleCategory = (key) => {
        setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const hasLinks = (question) => {
        return question.questionLink || question.gfgLink || question.leetCodeLink || question.youTubeLink;
    };

    // Topics/categories render expanded by default (`!== false`), so no
    // eager state initialisation is needed here.

    const linkTile = (href, Icon, tint) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group/tile flex size-9 items-center justify-center rounded-lg border bg-raised/40 transition-colors hover:bg-raised ${tint}`}
        >
            <Icon className="size-4" />
        </a>
    );

    // Per-sheet column labels (CP-31/CP/CSES/SQL aren't LeetCode).
    const labels = sheet.labels || {};
    const articleLabel = labels.article || 'Article';
    const leetCodeLabel = labels.leetCode || 'LeetCode';
    const articleIcon = labels.article === 'Code' ? Github : FileText;

    return (
        <div className="space-y-6 px-1 sm:px-0">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <Code2 className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">DSA Question Sheet</h1>
                        <p className="flex items-center gap-2 text-sm text-subtle sm:text-base">
                            <Sparkles className="size-4 text-accent-hi" />
                            {sheetLoading
                                ? 'loading sheet...'
                                : <><span className="font-mono">{solvedCount} / {totalQuestions}</span> solved ({solvedPercentage}%)</>}
                        </p>
                    </div>
                </div>

                {/* Sheet + view toggles, search */}
                <div className="flex w-full items-center gap-3 lg:w-auto">
                    {/* Sheet picker - dropdown with all sheets */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowSheetDropdown(!showSheetDropdown)}
                            className="flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-raised"
                        >
                            <ListChecks className="size-4 text-accent-hi" />
                            <span className="whitespace-nowrap">{sheet.name}</span>
                            <ChevronDown className={`size-4 text-subtle transition-transform ${showSheetDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showSheetDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowSheetDropdown(false)} />
                                <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-panel py-2 shadow-2xl">
                                    {SHEETS.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setFilterTopic('all');
                                                setFilterCompany('all');
                                                setFilterDifficulty('all');
                                                onSheetChange?.(s.id);
                                                setShowSheetDropdown(false);
                                            }}
                                            className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors
                                                ${sheet.id === s.id ? 'bg-accent/10 text-accent-hi' : 'text-muted hover:bg-raised/60 hover:text-fg'}`}
                                        >
                                            <span className="truncate">{s.name}</span>
                                            {sheet.id === s.id && <span className="size-1.5 shrink-0 rounded-full bg-accent-hi" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* View toggle - videos only exist where there is a playlist */}
                    <div className="flex shrink-0 rounded-xl border border-line bg-panel p-1">
                        {[
                            { id: 'sheet', label: 'Sheet', icon: ListChecks, show: true },
                            { id: 'video', label: 'Videos', icon: PlayCircle, show: sheet.hasPlaylist },
                        ].filter((v) => v.show).map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id)}
                                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all
                                    ${effectiveView === v.id ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}
                            >
                                <v.icon className="size-4" />
                                <span className="hidden sm:inline">{v.label}</span>
                            </button>
                        ))}
                    </div>

                    {effectiveView === 'sheet' && (
                        <div className="relative w-full lg:w-80">
                            <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-subtle" />
                            <input
                                type="text"
                                placeholder="Search problems..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-line bg-panel py-3.5 pl-4 pr-12 text-base text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Sheet view: topic stats, filters, questions */}
            {effectiveView === 'sheet' && (<>
            {/* Topic Stats - Horizontal Scroll */}
            <div className="scrollbar-hide flex gap-3 overflow-x-auto px-3 pb-2">
                {Object.entries(
                    flattenedQuestions.reduce((acc, q) => {
                        if (!acc[q.topic]) {
                            acc[q.topic] = { total: 0, solved: 0, topicIndex: q.order[0] };
                        }
                        acc[q.topic].total++;
                        if (getDSAStatus(q.id, q.cid) === 'solved') {
                            acc[q.topic].solved++;
                        }
                        return acc;
                    }, {})
                )
                    .sort((a, b) => a[1].topicIndex - b[1].topicIndex)
                    .map(([topic, stats]) => {
                        const percentage = Math.round((stats.solved / stats.total) * 100);
                        const isSelected = filterTopic === topic;

                        return (
                            <button
                                key={topic}
                                onClick={() => setFilterTopic(isSelected ? 'all' : topic)}
                                className={`min-w-[130px] shrink-0 rounded-2xl border p-3.5 text-left transition-all sm:min-w-[150px]
                                    ${isSelected
                                        ? 'border-accent/50 bg-raised'
                                        : 'border-line bg-panel hover:border-accent/25 hover:bg-raised/60'
                                    }`}
                            >
                                <div className="mb-2 truncate text-xs text-muted">{topic}</div>
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <span className="font-mono text-lg font-semibold sm:text-xl">{stats.solved}</span>
                                        <span className="font-mono text-sm text-subtle">/{stats.total}</span>
                                    </div>
                                    <div className="relative size-10">
                                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="14" fill="none"
                                                className="text-line" stroke="currentColor" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14" fill="none"
                                                className="text-data"
                                                stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                                                strokeDasharray={`${percentage * 0.88} 88`} />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="mr-2 flex items-center gap-2 text-muted">
                    <Filter className="relative top-px size-4" />
                    <span className="hidden text-sm font-medium sm:inline">Filter:</span>
                </div>

                {['all', 'unsolved', 'solved', 'revision'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-all
                            ${filterStatus === status
                                ? 'bg-accent font-semibold text-white'
                                : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}

                {hasDifficulty && ['Easy', 'Medium', 'Hard'].map(diff => (
                    <button
                        key={diff}
                        onClick={() => setFilterDifficulty(filterDifficulty === diff ? 'all' : diff)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-all
                            ${filterDifficulty === diff
                                ? diff === 'Easy' ? 'bg-emerald-500 font-semibold text-white'
                                    : diff === 'Medium' ? 'bg-amber-500 font-semibold text-white'
                                    : 'bg-rose-500 font-semibold text-white'
                                : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'
                            }`}
                    >
                        {diff}
                    </button>
                ))}

                <div className="relative ml-auto">
                    <button
                        onClick={() => setShowTopicDropdown(!showTopicDropdown)}
                        className="flex items-center gap-2 rounded-xl bg-raised/60 px-3.5 py-2 text-sm font-medium text-muted transition-all hover:bg-raised hover:text-fg sm:px-4"
                    >
                        {filterTopic === 'all' ? 'All Topics' : filterTopic}
                        <ChevronDown className={`size-4 transition-transform ${showTopicDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showTopicDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowTopicDropdown(false)} />
                            <div className="absolute right-0 top-full z-50 mt-2 max-h-80 min-w-56 overflow-y-auto rounded-2xl border border-line bg-panel py-2 shadow-2xl">
                                    {topics.map(topic => (
                                        <button
                                            key={topic}
                                            onClick={() => {
                                                setFilterTopic(topic);
                                                setShowTopicDropdown(false);
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                                ${filterTopic === topic ? 'bg-accent/10 text-accent-hi' : 'text-muted hover:bg-raised/60 hover:text-fg'}`}
                                        >
                                            {topic === 'all' ? 'All Topics' : topic}
                                        </button>
                                    ))}
                            </div>
                        </>
                    )}

                    {/* Company filter - only sheets with tags (MIK) */}
                    {companies.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all sm:px-4
                                    ${filterCompany !== 'all'
                                        ? 'bg-violet-500/15 text-violet-400'
                                        : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                            >
                                {filterCompany === 'all' ? 'All Companies' : filterCompany}
                                <ChevronDown className={`size-4 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showCompanyDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowCompanyDropdown(false)} />
                                    <div className="absolute right-0 top-full z-50 mt-2 max-h-80 min-w-56 overflow-y-auto rounded-2xl border border-line bg-panel py-2 shadow-2xl">
                                        {companies.map(([name, count]) => (
                                            <button
                                                key={name}
                                                onClick={() => {
                                                    setFilterCompany(filterCompany === name ? 'all' : name);
                                                    setShowCompanyDropdown(false);
                                                }}
                                                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors
                                                    ${filterCompany === name ? 'bg-violet-500/10 text-violet-400' : 'text-muted hover:bg-raised/60 hover:text-fg'}`}
                                            >
                                                <span className="truncate">{name}</span>
                                                <span className="font-mono text-xs text-subtle">{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Showing count */}
            <div className="pl-1 font-mono text-sm text-subtle">
                Showing {filteredQuestions.length} / {totalQuestions} questions
            </div>

            {/* Questions Container */}
            <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
                {Object.entries(groupedQuestions).map(([topic, topicData]) => {
                    const isExpanded = expandedTopics[topic] !== false;
                    const topicSolved = Object.values(topicData.categories).reduce((acc, cat) =>
                        acc + cat.questions.filter(q => getDSAStatus(q.id, q.cid) === 'solved').length, 0
                    );
                    const topicTotal = Object.values(topicData.categories).reduce((acc, cat) => acc + cat.questions.length, 0);
                    const topicProgress = Math.round((topicSolved / topicTotal) * 100);

                    return (
                        <div key={topic} className="border-b border-line last:border-b-0">
                            {/* Topic Header */}
                            <button
                                onClick={() => toggleTopic(topic)}
                                className="group flex w-full items-center justify-between px-4 py-4 transition-all hover:bg-raised/30 lg:px-6 lg:py-5"
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <ChevronDown className={`size-5 shrink-0 text-subtle transition-transform duration-200 group-hover:text-fg ${isExpanded ? '' : '-rotate-90'}`} />
                                    <h2 className="truncate text-lg font-semibold transition-colors group-hover:text-accent-hi lg:text-xl">{topic}</h2>
                                </div>
                                <div className="flex shrink-0 items-center gap-4">
                                    <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-raised sm:block lg:w-32">
                                        <div
                                            className="h-full rounded-full bg-accent transition-[width] duration-300"
                                            style={{ width: `${topicProgress}%` }}
                                        />
                                    </div>
                                    <span className="rounded-full bg-raised px-3 py-1 font-mono text-xs text-muted sm:text-sm">
                                        {topicSolved} / {topicTotal}
                                    </span>
                                </div>
                            </button>

                            {/* Categories */}
                            {isExpanded && (
                                <div className="border-t border-line">
                                    {Object.entries(topicData.categories).map(([categoryName, categoryData]) => {
                                        const categoryKey = `${topic}_${categoryName}`;
                                        const isCatExpanded = expandedCategories[categoryKey] !== false;
                                        const catSolved = categoryData.questions.filter(q => getDSAStatus(q.id, q.cid) === 'solved').length;
                                        const catProgress = Math.round((catSolved / categoryData.questions.length) * 100);

                                        return (
                                            <div key={categoryKey}>
                                                {/* Category Header */}
                                                <button
                                                    onClick={() => toggleCategory(categoryKey)}
                                                    className="flex w-full items-center justify-between border-t border-line/60 px-4 py-3 transition-all hover:bg-raised/20 lg:px-6 lg:py-4"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3 pl-8 lg:pl-10">
                                                        <ChevronRight className={`size-4 shrink-0 text-subtle transition-transform duration-200 ${isCatExpanded ? 'rotate-90' : ''}`} />
                                                        <span className="truncate text-base font-medium text-muted lg:text-lg">{categoryName}</span>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-4">
                                                        <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-raised sm:block lg:w-24">
                                                            <div
                                                                className="h-full rounded-full bg-data-hi/60"
                                                                style={{ width: `${catProgress}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-mono text-sm text-subtle">
                                                            {catSolved} / {categoryData.questions.length}
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Questions */}
                                                {isCatExpanded && (
                                                    <>
                                                        {/* DESKTOP TABLE VIEW */}
                                                        <div className="hidden lg:block">
                                                            {/* Table Header */}
                                                            <div className="border-t border-line/60 bg-raised/40 px-6 py-3">
                                                                <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-4 pl-12 text-xs font-semibold uppercase tracking-wider text-subtle">
                                                                    <div className="col-span-4">Problem</div>
                                                                    <div className="col-span-1 text-center">{articleLabel}</div>
                                                                    <div className="col-span-1 text-center">Video</div>
                                                                    <div className="col-span-1 text-center">{leetCodeLabel}</div>
                                                                    <div className="col-span-1 text-center">GFG</div>
                                                                    <div className="col-span-1 text-center">Solve</div>
                                                                    <div className="col-span-1 text-center">Revision</div>
                                                                    <div className="col-span-1 text-center">Note</div>
                                                                    <div className="col-span-2 text-center">Status</div>
                                                                </div>
                                                            </div>

                                                            {/* Table Rows */}
                                                            {categoryData.questions.map((question) => {
                                                                const status = getDSAStatus(question.id, question.cid);
                                                                const hasNoteContent = getQuestionNote(question.id) || getQuestionTags(question.id) || question.companies || question.learn;

                                                                return (
                                                                    <div
                                                                        key={question.id}
                                                                        className={`border-t border-line/40 px-6 py-4 transition-all hover:bg-raised/30
                                                                            ${status === 'solved' ? 'bg-emerald-500/5' : ''}`}
                                                                    >
                                                                        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] items-center gap-4 pl-12">
                                                                            {/* Problem Name */}
                                                                            <div className="col-span-4 flex items-center gap-3">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newStatus = status === 'solved' ? 'unsolved' : 'solved';
                                                                                        updateDSAStatus(question.id, newStatus, { cid: question.cid, title: question.problem });
                                                                                    }}
                                                                                    className="transition-transform hover:scale-110 focus:outline-none"
                                                                                >
                                                                                    {getStatusIcon(status, 'small')}
                                                                                </button>
                                                                                <span className={`text-base font-medium ${status === 'solved' ? 'text-subtle line-through' : 'text-fg'}`}>
                                                                                    {question.problem}
                                                                                </span>
                                                                                {diffChip(question.difficulty)}
                                                                            </div>

                                                                            {/* Links */}
                                                                            <div className="col-span-1 flex justify-center">
                                                                                {question.questionLink
                                                                                    ? linkTile(question.questionLink, articleIcon, 'border-cyan-500/15 text-cyan-500/80 hover:border-cyan-500/40')
                                                                                    : <span className="text-faint">—</span>}
                                                                            </div>
                                                                            {/* YouTube - plays in app */}
                                                                            <div className="col-span-1 flex justify-center">
                                                                                {question.youTubeLink ? (
                                                                                    <button
                                                                                        onClick={() => openVideo(question)}
                                                                                        title="Watch in app"
                                                                                        className="flex size-9 items-center justify-center rounded-lg border border-rose-500/15 bg-rose-500/5 text-rose-500/80 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                                                                                    >
                                                                                        <Youtube className="size-4" />
                                                                                    </button>
                                                                                ) : <span className="text-faint">—</span>}
                                                                            </div>
                                                                            <div className="col-span-1 flex justify-center">
                                                                                {question.leetCodeLink
                                                                                    ? linkTile(question.leetCodeLink, ExternalLink, 'border-amber-500/15 text-amber-500/80 hover:border-amber-500/40')
                                                                                    : <span className="text-faint">—</span>}
                                                                            </div>
                                                                            <div className="col-span-1 flex justify-center">
                                                                                {question.gfgLink
                                                                                    ? linkTile(question.gfgLink, BookOpen, 'border-emerald-500/15 text-emerald-500/80 hover:border-emerald-500/40')
                                                                                    : <span className="text-faint">—</span>}
                                                                            </div>

                                                                            {/* Solve in-app */}
                                                                            <div className="col-span-1 flex justify-center">
                                                                                <button
                                                                                    onClick={() => setSolving(question)}
                                                                                    title="Write and run code"
                                                                                    className="flex size-9 items-center justify-center rounded-lg border border-accent/15 bg-accent/5 text-accent-hi/80 transition-all hover:border-accent/40 hover:bg-accent/10 hover:text-accent-hi"
                                                                                >
                                                                                    <SquareCode className="size-4" />
                                                                                </button>
                                                                            </div>

                                                                            {/* Revision Toggle */}
                                                                            <div className="col-span-1 flex justify-center">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newStatus = status === 'revision' ? 'unsolved' : 'revision';
                                                                                        updateDSAStatus(question.id, newStatus, { cid: question.cid, title: question.problem });
                                                                                    }}
                                                                                    className={`flex size-9 items-center justify-center rounded-lg border transition-all
                                                                                        ${status === 'revision'
                                                                                            ? 'border-amber-500/30 bg-amber-500/10'
                                                                                            : 'border-line bg-transparent hover:border-amber-500/30'
                                                                                        }`}
                                                                                >
                                                                                    <Star className={`size-4 ${status === 'revision' ? 'fill-amber-400 text-amber-400' : 'text-faint'}`} />
                                                                                </button>
                                                                            </div>

                                                                            {/* Notes / tags / remarks */}
                                                                            <div className="col-span-1 flex justify-center">
                                                                                <button
                                                                                    onClick={() => setNoting(question)}
                                                                                    title="Notes, company tags & remarks"
                                                                                    className={`flex size-9 items-center justify-center rounded-lg border transition-all
                                                                                        ${hasNoteContent
                                                                                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                                                                                            : 'border-line bg-transparent text-faint hover:border-amber-500/30 hover:text-amber-500/80'
                                                                                        }`}
                                                                                >
                                                                                    <StickyNote className="size-4" />
                                                                                </button>
                                                                            </div>

                                                                            {/* Status Dropdown */}
                                                                            <div className="col-span-2 flex justify-center">
                                                                                <select
                                                                                    value={status}
                                                                                    onChange={(e) => updateDSAStatus(question.id, e.target.value, { cid: question.cid, title: question.problem })}
                                                                                    className={`cursor-pointer rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all focus:outline-none
                                                                                        ${status === 'solved'
                                                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                                                                                            : status === 'revision'
                                                                                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                                                                                                : 'border-line bg-raised text-muted'
                                                                                        }`}
                                                                                >
                                                                                    <option value="unsolved">Unsolved</option>
                                                                                    <option value="solved">Solved</option>
                                                                                    <option value="revision">REV</option>
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* MOBILE CARD VIEW */}
                                                        <div className="space-y-3 border-t border-line/40 px-3 pb-3 pt-3 lg:hidden">
                                                            {categoryData.questions.map((question) => {
                                                                const status = getDSAStatus(question.id, question.cid);

                                                                return (
                                                                    <div
                                                                        key={question.id}
                                                                        className={`rounded-2xl border p-4 transition-all
                                                                            ${status === 'solved'
                                                                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                                                                : status === 'revision'
                                                                                    ? 'border-amber-500/20 bg-amber-500/5'
                                                                                    : 'border-line bg-raised/30'
                                                                            }`}
                                                                    >
                                                                        {/* Question Header */}
                                                                        <div className="flex items-start gap-3">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newStatus = status === 'solved' ? 'unsolved' : 'solved';
                                                                                    updateDSAStatus(question.id, newStatus, { cid: question.cid, title: question.problem });
                                                                                }}
                                                                                className="mt-0.5 shrink-0 transition-transform active:scale-90"
                                                                            >
                                                                                {getStatusIcon(status)}
                                                                            </button>
                                                                            <p className={`flex-1 text-base font-medium leading-relaxed ${status === 'solved' ? 'text-subtle line-through' : 'text-fg'}`}>
                                                                                {question.problem}
                                                                            </p>
                                                                            {diffChip(question.difficulty)}
                                                                        </div>

                                                                        {/* Links Row */}
                                                                        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                                                                            <div className="flex items-center gap-2">
                                                                                {question.questionLink && (
                                                                                    <a href={question.questionLink} target="_blank" rel="noopener noreferrer"
                                                                                        className="flex size-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform active:scale-95">
                                                                                        {(() => { const I = articleIcon; return <I className="size-5" />; })()}
                                                                                    </a>
                                                                                )}
                                                                                {question.youTubeLink && (
                                                                                    <button
                                                                                        onClick={() => openVideo(question)}
                                                                                        title="Watch in app"
                                                                                        className="flex size-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-transform active:scale-95"
                                                                                    >
                                                                                        <Youtube className="size-5" />
                                                                                    </button>
                                                                                )}
                                                                                {question.leetCodeLink && (
                                                                                    <a href={question.leetCodeLink} target="_blank" rel="noopener noreferrer"
                                                                                        className="flex size-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 transition-transform active:scale-95">
                                                                                        <ExternalLink className="size-5" />
                                                                                    </a>
                                                                                )}
                                                                                {question.gfgLink && (
                                                                                    <a href={question.gfgLink} target="_blank" rel="noopener noreferrer"
                                                                                        className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 transition-transform active:scale-95">
                                                                                        <BookOpen className="size-5" />
                                                                                    </a>
                                                                                )}
                                                                                {!hasLinks(question) && (
                                                                                    <span className="text-sm text-faint">No links</span>
                                                                                )}
                                                                            </div>

                                                                        {/* Actions */}
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => setNoting(question)}
                                                                                title="Notes, company tags & remarks"
                                                                                className={`flex size-10 items-center justify-center rounded-xl border transition-all active:scale-95
                                                                                    ${getQuestionNote(question.id) || getQuestionTags(question.id) || question.companies || question.learn
                                                                                        ? 'border-amber-500/30 bg-amber-500/15 text-amber-500'
                                                                                        : 'border-line bg-raised/50 text-subtle'
                                                                                    }`}
                                                                            >
                                                                                <StickyNote className="size-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setSolving(question)}
                                                                                    title="Write and run code"
                                                                                    className="flex size-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent-hi transition-all active:scale-95"
                                                                                >
                                                                                    <SquareCode className="size-5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newStatus = status === 'revision' ? 'unsolved' : 'revision';
                                                                                        updateDSAStatus(question.id, newStatus, { cid: question.cid, title: question.problem });
                                                                                    }}
                                                                                    className={`flex size-10 items-center justify-center rounded-xl border transition-all active:scale-95
                                                                                        ${status === 'revision'
                                                                                            ? 'border-amber-500/30 bg-amber-500/15'
                                                                                            : 'border-line bg-raised/50'
                                                                                        }`}
                                                                                >
                                                                                    <Star className={`size-5 ${status === 'revision' ? 'fill-amber-400 text-amber-400' : 'text-subtle'}`} />
                                                                                </button>
                                                                                <select
                                                                                    value={status}
                                                                                    onChange={(e) => updateDSAStatus(question.id, e.target.value, { cid: question.cid, title: question.problem })}
                                                                                    className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium
                                                                                        ${status === 'solved'
                                                                                            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500'
                                                                                            : status === 'revision'
                                                                                                ? 'border-amber-500/30 bg-amber-500/15 text-amber-500'
                                                                                                : 'border-line bg-raised text-muted'
                                                                                        }`}
                                                                                >
                                                                                    <option value="unsolved">Unsolved</option>
                                                                                    <option value="solved">Solved</option>
                                                                                    <option value="revision">REV</option>
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {Object.keys(groupedQuestions).length === 0 && (
                    <div className="py-16 text-center">
                        <Code2 className="mx-auto mb-4 size-16 text-faint" />
                        <h3 className="mb-2 text-xl font-semibold">No Questions Found</h3>
                        <p className="text-subtle">Try adjusting your filters.</p>
                    </div>
                )}
            </div>
            </>)}

            {/* Videos view: the full course playlist, in-app */}
            {effectiveView === 'video' && <CourseVideos />}

            {solving && (
                <SolveModal
                    question={solving}
                    status={getDSAStatus(solving.id, solving.cid)}
                    onStatusChange={(qid, s) => updateDSAStatus(qid, s, { cid: solving.cid, title: solving.problem })}
                    onClose={() => setSolving(null)}
                    theme={theme}
                />
            )}

            {noting && (
                <QuestionNoteModal
                    key={noting.id}
                    question={noting}
                    note={getQuestionNote(noting.id)}
                    tags={getQuestionTags(noting.id)}
                    onSave={updateQuestionNote}
                    onTagsChange={updateQuestionTags}
                    onClose={() => setNoting(null)}
                />
            )}

            {video && (
                <VideoModal
                    url={video.url}
                    title={video.title}
                    onClose={() => setVideo(null)}
                />
            )}
        </div>
    );
};

export default DSATracker;
