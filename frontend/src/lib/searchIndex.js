// Global search index: problems from every sheet + companies, built once and
// cached. Notes live in reactive docs and are passed in by the caller.
import { SHEETS } from './sheets';
import { COMPANY_REGISTRY } from '../data/companies/registry';

let cache = null;

export const buildSearchIndex = async () => {
    if (cache) return cache;
    const problems = [];
    for (const sheet of SHEETS) {
        const qs = await sheet.load();
        qs.forEach((q) => {
            problems.push({
                type: 'problem',
                title: q.problem,
                sheetId: sheet.id,
                sheetName: sheet.short || sheet.name,
                topic: q.topic,
                id: q.id,
            });
        });
    }
    const companies = COMPANY_REGISTRY.map((c) => ({
        type: 'company',
        title: c.name,
        slug: c.slug,
        total: c.total,
        id: `cj:${c.slug}`,
    }));
    cache = { problems, companies };
    return cache;
};
