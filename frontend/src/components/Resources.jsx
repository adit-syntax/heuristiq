import { useState } from 'react';
import { BookMarked, ExternalLink, ChevronDown, Map, Layers, Table2, Puzzle, GraduationCap } from 'lucide-react';
import { roadmaps, materials, complexityTable, sortingComplexity, patterns } from '../data/dsaResources';
import CodeZen from './CodeZen';

const SECTIONS = [
    { id: 'codezen', label: 'CodeZen Bootcamp', icon: GraduationCap },
    { id: 'roadmaps', label: 'Roadmaps', icon: Map },
    { id: 'material', label: 'Material', icon: Layers },
    { id: 'patterns', label: 'Patterns', icon: Puzzle },
    { id: 'complexity', label: 'Complexity', icon: Table2 },
];

const Th = ({ children }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-subtle">{children}</th>
);
const Td = ({ children, className = '' }) => (
    <td className={`px-4 py-3 text-sm text-muted ${className}`}>{children}</td>
);

const Resources = () => {
    const [section, setSection] = useState('codezen');
    const [openRoadmap, setOpenRoadmap] = useState('a2z');

    return (
        <div className="space-y-6 px-1 sm:px-0">
            <div className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                    <BookMarked className="size-6 text-white sm:size-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">DSA Material</h1>
                    <p className="text-sm text-subtle sm:text-base">Roadmaps, references, patterns and complexity tables</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setSection(s.id)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all
                            ${section === s.id ? 'bg-accent text-white' : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                    >
                        <s.icon className="size-4" />
                        {s.label}
                    </button>
                ))}
            </div>

            {section === 'codezen' && <CodeZen />}

            {section === 'roadmaps' && (
                <div className="space-y-3">
                    {roadmaps.map((r) => {
                        const open = openRoadmap === r.id;
                        return (
                            <div key={r.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                                <button
                                    onClick={() => setOpenRoadmap(open ? null : r.id)}
                                    className="flex w-full items-start gap-4 px-5 py-4 text-left transition-all hover:bg-raised/30"
                                >
                                    <ChevronDown className={`mt-1 size-5 shrink-0 text-subtle transition-transform ${open ? '' : '-rotate-90'}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold">{r.name}</h2>
                                            <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent-hi">{r.count}</span>
                                            <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-subtle">{r.level}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted">{r.blurb}</p>
                                        <p className="mt-1 text-xs text-faint">{r.author} · approx. {r.weeks}</p>
                                    </div>
                                </button>

                                {open && (
                                    <div className="border-t border-line px-5 py-4">
                                        <ol className="mb-4 space-y-2">
                                            {r.steps.map((step, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-muted">
                                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-raised font-mono text-xs text-subtle">
                                                        {i + 1}
                                                    </span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ol>
                                        <a
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent-hi transition-colors hover:bg-accent/20"
                                        >
                                            Open sheet <ExternalLink className="size-4" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {section === 'material' && (
                <div className="grid gap-4 md:grid-cols-2">
                    {materials.map((group) => (
                        <div key={group.section} className="rounded-2xl border border-line bg-panel p-5">
                            <h2 className="mb-4 text-base font-semibold">{group.section}</h2>
                            <div className="space-y-2">
                                {group.links.map((link) => (
                                    <a
                                        key={link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-start justify-between gap-3 rounded-xl border border-line bg-raised/40 p-3.5 transition-colors hover:border-accent/30 hover:bg-raised"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-fg">{link.name}</div>
                                            <div className="text-xs text-subtle">{link.note}</div>
                                        </div>
                                        <ExternalLink className="mt-0.5 size-4 shrink-0 text-faint group-hover:text-accent-hi" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {section === 'patterns' && (
                <div className="overflow-hidden rounded-2xl border border-line bg-panel">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead className="border-b border-line bg-raised/40">
                                <tr><Th>Pattern</Th><Th>Use when</Th><Th>Classic problems</Th></tr>
                            </thead>
                            <tbody>
                                {patterns.map((p) => (
                                    <tr key={p.name} className="border-b border-line/50 last:border-0 hover:bg-raised/20">
                                        <Td className="whitespace-nowrap font-medium text-fg">{p.name}</Td>
                                        <Td>{p.when}</Td>
                                        <Td className="text-subtle">{p.example}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {section === 'complexity' && (
                <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
                        <h2 className="border-b border-line px-5 py-4 text-base font-semibold">Data structures</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead className="border-b border-line bg-raised/40">
                                    <tr><Th>Structure</Th><Th>Access</Th><Th>Search</Th><Th>Insert</Th><Th>Delete</Th><Th>Space</Th></tr>
                                </thead>
                                <tbody>
                                    {complexityTable.map((row) => (
                                        <tr key={row.name} className="border-b border-line/50 last:border-0 hover:bg-raised/20">
                                            <Td className="whitespace-nowrap font-medium text-fg">{row.name}</Td>
                                            <Td className="font-mono text-cyan-500">{row.access}</Td>
                                            <Td className="font-mono text-cyan-500">{row.search}</Td>
                                            <Td className="font-mono text-cyan-500">{row.insert}</Td>
                                            <Td className="font-mono text-cyan-500">{row.remove}</Td>
                                            <Td className="font-mono text-amber-500">{row.space}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
                        <h2 className="border-b border-line px-5 py-4 text-base font-semibold">Sorting algorithms</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead className="border-b border-line bg-raised/40">
                                    <tr><Th>Algorithm</Th><Th>Best</Th><Th>Average</Th><Th>Worst</Th><Th>Space</Th><Th>Stable</Th></tr>
                                </thead>
                                <tbody>
                                    {sortingComplexity.map((row) => (
                                        <tr key={row.name} className="border-b border-line/50 last:border-0 hover:bg-raised/20">
                                            <Td className="whitespace-nowrap font-medium text-fg">{row.name}</Td>
                                            <Td className="font-mono text-emerald-500">{row.best}</Td>
                                            <Td className="font-mono text-cyan-500">{row.avg}</Td>
                                            <Td className="font-mono text-rose-400">{row.worst}</Td>
                                            <Td className="font-mono text-amber-500">{row.space}</Td>
                                            <Td>{row.stable}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <p className="px-1 text-xs text-faint">* amortised or average case</p>
                </div>
            )}
        </div>
    );
};

export default Resources;
