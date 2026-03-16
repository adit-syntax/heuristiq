// Sheet registry: one entry per question sheet. Components never import a
// sheet's data module directly - they go through here so adding a new sheet
// later is one loader + one registry entry.
//
// Every sheet flattens to the same question shape:
//   { id, cid?, topic, subtopic, problem, questionLink, gfgLink, leetCodeLink, youTubeLink, companies?, learn?, difficulty? }
// `cid` is the canonical cross-list identity (lc:/cf:/gfg:/cses: slug) - when
// present, solve/favorite status is shared across every list carrying the
// same question.

import { canonicalKey } from './canonical';

const flattenStriver = (mod) => {
    const out = [];
    mod.default?.content?.forEach((topic, topicIndex) => {
        topic.categoryList?.forEach((category, categoryIndex) => {
            category.questionList?.forEach((question, questionIndex) => {
                out.push({
                    id: question.questionId || `s_${topicIndex}_${categoryIndex}_${questionIndex}`,
                    cid: canonicalKey({
                        leetCodeLink: question.leetCodeLink,
                        questionLink: question.questionLink,
                        gfgLink: question.gfgLink,
                    }) || undefined,
                    topic: topic.contentHeading,
                    subtopic: category.categoryName,
                    problem: question.questionHeading,
                    questionLink: question.questionLink || '',
                    gfgLink: question.gfgLink || '',
                    leetCodeLink: question.leetCodeLink || '',
                    youTubeLink: question.youTubeLink || '',
                    order: [topicIndex, categoryIndex, question.questionIndex ?? questionIndex],
                });
            });
        });
    });
    out.sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2]);
    return out;
};

// Tab-shaped sheets (MIK, SDE, NeetCode, Blind, Top 150, CP, CSES, SQL):
// topics -> rows of { title, video, problem, code?, companies, learn, difficulty }.
const flattenTabbed = (prefix, topics) => {
    const out = [];
    topics?.forEach((topic, topicIndex) => {
        topic.rows?.forEach((row, questionIndex) => {
            // Titles repeat across topics, so scope the id by topic.
            out.push({
                id: `${prefix}:${topic.id}:${row.title}`,
                cid: canonicalKey({ leetCodeLink: row.problem || '' }) || undefined,
                topic: topic.title,
                subtopic: 'Problems',
                problem: row.title,
                // `code` is the solution/editorial link slot (e.g. CP-31 GitHub solutions).
                questionLink: row.code || '',
                gfgLink: '',
                leetCodeLink: row.problem || '',
                youTubeLink: row.video || '',
                companies: row.companies || '',
                learn: row.learn || '',
                difficulty: row.difficulty || '',
                order: [topicIndex, 0, questionIndex],
            });
        });
    });
    out.sort((a, b) => a.order[0] - b.order[0] || a.order[2] - b.order[2]);
    return out;
};

export const SHEETS = [
    {
        id: 'striver',
        name: 'Striver A2Z',
        short: 'A2Z',
        // The full course playlist exists for this sheet (Videos toggle).
        hasPlaylist: true,
        load: async () => flattenStriver(await import('../data/dsaQuestions')),
    },
    {
        id: 'sde',
        name: 'Striver SDE Sheet',
        short: 'SDE',
        hasPlaylist: false,
        load: async () => flattenTabbed('sde', (await import('../data/sheets/sde')).TOPICS),
    },
    {
        id: 'mik',
        name: 'CodeStoryWithMIK',
        short: 'MIK',
        hasPlaylist: false,
        load: async () => flattenTabbed('mik', (await import('../data/mikSheet')).MIK_TOPICS),
    },
    {
        id: 'blind75',
        name: 'Blind 75',
        short: 'Blind 75',
        hasPlaylist: false,
        load: async () => flattenTabbed('blind75', (await import('../data/sheets/blind75')).TOPICS),
    },
    {
        id: 'neetcode150',
        name: 'NeetCode 150',
        short: 'NeetCode 150',
        hasPlaylist: false,
        load: async () => flattenTabbed('nc150', (await import('../data/sheets/neetcode150')).TOPICS),
    },
    {
        id: 'tip150',
        name: 'LeetCode Top Interview 150',
        short: 'Top 150',
        hasPlaylist: false,
        load: async () => flattenTabbed('tip150', (await import('../data/sheets/tip150')).TOPICS),
    },
    {
        id: 'cp',
        name: 'Striver CP Sheet',
        short: 'CP Sheet',
        hasPlaylist: false,
        // Links are Codeforces/AtCoder/etc., not LeetCode.
        labels: { leetCode: 'Problem' },
        load: async () => flattenTabbed('cp', (await import('../data/sheets/cp')).TOPICS),
    },
    {
        id: 'cp31',
        name: 'TLE Eliminators CP-31 (rating-wise)',
        short: 'CP-31',
        hasPlaylist: false,
        labels: { article: 'Code', leetCode: 'Codeforces' },
        load: async () => flattenTabbed('cp31', (await import('../data/sheets/cp31')).TOPICS),
    },
    {
        id: 'cses',
        name: 'CSES Problem Set',
        short: 'CSES',
        hasPlaylist: false,
        labels: { leetCode: 'CSES' },
        load: async () => flattenTabbed('cses', (await import('../data/sheets/cses')).TOPICS),
    },
    {
        id: 'sql',
        name: 'Striver SQL Problems',
        short: 'SQL',
        hasPlaylist: false,
        labels: { leetCode: 'Problem' },
        load: async () => flattenTabbed('sql', (await import('../data/sheets/sql')).TOPICS),
    },
];

export const DEFAULT_SHEET = SHEETS[0].id;

export const getSheet = (id) => SHEETS.find((s) => s.id === id) || SHEETS[0];
