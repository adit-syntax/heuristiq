import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Activity, Play, Pause, SkipBack, SkipForward, Shuffle, RotateCcw, Grid3x3, BarChart3, Eraser,
} from 'lucide-react';
import { ARRAY_ALGORITHMS, GRID_ALGORITHMS, collectFrames } from '../lib/algorithms';

const randomArray = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 95) + 5);

const ROWS = 15;
const COLS = 29;
const START = [7, 2];
const END = [7, 26];
const cellKey = (r, c) => `${r},${c}`;
const emptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const Slider = ({ label, value, onChange, min, max, step = 1, disabled }) => (
    <label className="flex items-center gap-2 text-xs text-muted">
        <span className="whitespace-nowrap">{label}</span>
        <input
            type="range" min={min} max={max} step={step} value={value} disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 accent-accent disabled:opacity-40 sm:w-32"
        />
    </label>
);

const Visualizer = () => {
    const [mode, setMode] = useState('array');
    return (
        <div className="space-y-5 px-1 sm:px-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <Activity className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Algorithm Visualizer</h1>
                        <p className="text-sm text-subtle sm:text-base">Step through each comparison, swap and visit</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'array', label: 'Sorting & search', icon: BarChart3 },
                        { id: 'grid', label: 'Pathfinding', icon: Grid3x3 },
                    ].map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:text-sm
                                ${mode === m.id ? 'bg-accent text-white' : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                        >
                            <m.icon className="size-4" /> {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {mode === 'array' ? <ArrayViz /> : <GridViz />}
        </div>
    );
};

/* ------------------------------------------------------------ sorting/search */

const ArrayViz = () => {
    const [algoId, setAlgoId] = useState('bubble');
    const [size, setSize] = useState(24);
    const [speed, setSpeed] = useState(40);
    const [array, setArray] = useState(() => randomArray(24));
    const [target, setTarget] = useState(50);
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(false);

    const algo = ARRAY_ALGORITHMS.find((a) => a.id === algoId);

    const frames = useMemo(
        () => collectFrames(algo.gen(array, target)),
        [algo, array, target]
    );

    const atEnd = step >= frames.length - 1;

    // Rewind whenever an input changes rather than resetting from an effect.
    const restart = (apply) => { apply(); setStep(0); setPlaying(false); };

    useEffect(() => {
        if (!playing || atEnd) return;
        const id = setTimeout(() => setStep((s) => s + 1), 205 - speed * 2);
        return () => clearTimeout(id);
    }, [playing, step, atEnd, speed]);

    const current = frames[step] || { array, active: [], marked: [], note: 'Press play', pivot: null };
    const max = Math.max(...current.array, 1);

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-4">
                <select
                    value={algoId}
                    onChange={(e) => restart(() => setAlgoId(e.target.value))}
                    className="cursor-pointer rounded-xl border border-line bg-raised/60 px-3 py-2 text-sm text-fg transition-colors focus:border-accent focus:outline-none"
                >
                    {ARRAY_ALGORITHMS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>

                {algo.needsTarget && (
                    <label className="flex items-center gap-2 text-xs text-muted">
                        Target
                        <input
                            type="number" value={target}
                            onChange={(e) => restart(() => setTarget(Number(e.target.value)))}
                            className="w-20 rounded-xl border border-line bg-raised/60 px-2 py-1.5 font-mono text-sm text-fg focus:border-accent focus:outline-none"
                        />
                    </label>
                )}

                <button
                    onClick={() => {
                        if (atEnd) { setStep(0); setPlaying(true); }
                        else setPlaying(!playing);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hi"
                >
                    {playing && !atEnd ? <Pause className="size-4" /> : <Play className="size-4" />}
                    {atEnd ? 'Replay' : playing ? 'Pause' : 'Play'}
                </button>

                <div className="flex items-center gap-1">
                    <button onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
                        className="flex size-9 items-center justify-center rounded-xl border border-line bg-raised/60 text-muted transition-colors hover:text-fg" title="Step back">
                        <SkipBack className="size-4" />
                    </button>
                    <button onClick={() => { setPlaying(false); setStep((s) => Math.min(frames.length - 1, s + 1)); }}
                        className="flex size-9 items-center justify-center rounded-xl border border-line bg-raised/60 text-muted transition-colors hover:text-fg" title="Step forward">
                        <SkipForward className="size-4" />
                    </button>
                    <button onClick={() => restart(() => setArray(randomArray(size)))}
                        className="flex size-9 items-center justify-center rounded-xl border border-line bg-raised/60 text-muted transition-colors hover:text-fg" title="Shuffle">
                        <Shuffle className="size-4" />
                    </button>
                    <button onClick={() => { setStep(0); setPlaying(false); }}
                        className="flex size-9 items-center justify-center rounded-xl border border-line bg-raised/60 text-muted transition-colors hover:text-fg" title="Reset">
                        <RotateCcw className="size-4" />
                    </button>
                </div>

                <Slider label="Size" value={size} min={5} max={40}
                    onChange={(n) => restart(() => { setSize(n); setArray(randomArray(n)); })} disabled={playing} />
                <Slider label="Speed" value={speed} min={1} max={100} onChange={setSpeed} />
            </div>

            {/* Bars */}
            <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex h-64 items-end justify-center gap-[3px] sm:h-80">
                    {current.array.map((v, i) => {
                        const isActive = current.active.includes(i);
                        const isPivot = current.pivot === i;
                        const isMarked = current.marked.includes(i);
                        const colour = isPivot ? 'bg-amber-400'
                            : isActive ? 'bg-accent-hi'
                                : isMarked ? 'bg-emerald-500'
                                    : 'bg-line';
                        return (
                            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                                <div className={`w-full rounded-t transition-[height] duration-75 ${colour}`} style={{ height: `${(v / max) * 100}%` }} />
                                {current.array.length <= 26 && (
                                    <span className="mt-1 font-mono text-[10px] text-faint">{v}</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 space-y-2 border-t border-line pt-4">
                    <p className="min-h-[20px] font-mono text-sm text-muted">{current.note}</p>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-subtle">
                        <span>{algo.complexity}</span>
                        <span className="font-mono">Step {frames.length ? step + 1 : 0} / {frames.length}</span>
                    </div>
                    <input
                        type="range" min={0} max={Math.max(0, frames.length - 1)} value={step}
                        onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
                        className="w-full accent-accent"
                    />
                    <div className="flex flex-wrap gap-4 pt-1 text-xs text-subtle">
                        <Legend colour="bg-accent-hi" label="comparing" />
                        <Legend colour="bg-emerald-500" label="settled" />
                        <Legend colour="bg-amber-400" label="pivot" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Legend = ({ colour, label }) => (
    <span className="flex items-center gap-1.5"><span className={`size-3 rounded ${colour}`} />{label}</span>
);

/* ---------------------------------------------------------------- pathfinding */

const GridViz = () => {
    const [algoId, setAlgoId] = useState('bfs');
    const [grid, setGrid] = useState(emptyGrid);
    const [speed, setSpeed] = useState(70);
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(false);
    const painting = useRef(false);

    const algo = GRID_ALGORITHMS.find((a) => a.id === algoId);
    const frames = useMemo(() => collectFrames(algo.gen(grid, START, END)), [algo, grid]);
    const atEnd = step >= frames.length;

    // Rewind whenever the grid or algorithm changes, not from an effect.
    const restart = (apply) => { apply(); setStep(0); setPlaying(false); };

    useEffect(() => {
        if (!playing || atEnd) return;
        const id = setTimeout(() => setStep((s) => s + 1), 105 - speed);
        return () => clearTimeout(id);
    }, [playing, step, atEnd, speed]);

    // Frames are deltas, so replay the prefix to get the state at `step`.
    const painted = useMemo(() => {
        const map = new Map();
        for (let i = 0; i < step; i++) {
            const f = frames[i];
            map.set(cellKey(f.r, f.c), f.kind);
        }
        return map;
    }, [frames, step]);

    const toggleWall = useCallback((r, c) => {
        if (cellKey(r, c) === cellKey(...START) || cellKey(r, c) === cellKey(...END)) return;
        restart(() => setGrid((prev) => prev.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? (v ? 0 : 1) : v)) : row))));
    }, []);

    const pathLength = frames.filter((f) => f.kind === 'path').length;
    const visited = frames.slice(0, step).filter((f) => f.kind === 'visit').length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-4">
                <select
                    value={algoId}
                    onChange={(e) => restart(() => setAlgoId(e.target.value))}
                    className="cursor-pointer rounded-xl border border-line bg-raised/60 px-3 py-2 text-sm text-fg transition-colors focus:border-accent focus:outline-none"
                >
                    {GRID_ALGORITHMS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>

                <button
                    onClick={() => {
                        if (atEnd) { setStep(0); setPlaying(true); }
                        else setPlaying(!playing);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hi"
                >
                    {playing && !atEnd ? <Pause className="size-4" /> : <Play className="size-4" />}
                    {atEnd ? 'Replay' : playing ? 'Pause' : 'Play'}
                </button>

                <button onClick={() => restart(() => setGrid(
                    emptyGrid().map((row, r) => row.map((_, c) =>
                        (cellKey(r, c) === cellKey(...START) || cellKey(r, c) === cellKey(...END)) ? 0 : (Math.random() < 0.28 ? 1 : 0)
                    ))
                ))}
                    className="flex items-center gap-2 rounded-xl border border-line bg-raised/60 px-3 py-2 text-sm text-muted transition-colors hover:bg-raised hover:text-fg">
                    <Shuffle className="size-4" /> Random walls
                </button>
                <button onClick={() => restart(() => setGrid(emptyGrid()))}
                    className="flex items-center gap-2 rounded-xl border border-line bg-raised/60 px-3 py-2 text-sm text-muted transition-colors hover:bg-raised hover:text-fg">
                    <Eraser className="size-4" /> Clear
                </button>

                <Slider label="Speed" value={speed} min={1} max={100} onChange={setSpeed} />
                <span className="ml-auto text-xs text-subtle">Click or drag cells to draw walls</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-4">
                <div
                    className="mx-auto inline-grid select-none gap-[2px]"
                    style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
                    onPointerUp={() => { painting.current = false; }}
                    onPointerLeave={() => { painting.current = false; }}
                >
                    {grid.map((row, r) => row.map((wall, c) => {
                        const k = cellKey(r, c);
                        const state = painted.get(k);
                        const isStart = k === cellKey(...START);
                        const isEnd = k === cellKey(...END);
                        const colour = isStart ? 'bg-emerald-500'
                            : isEnd ? 'bg-rose-500'
                                : wall ? 'bg-line'
                                    : state === 'path' ? 'bg-amber-400'
                                        : state === 'visit' ? 'bg-accent/60'
                                            : state === 'frontier' ? 'bg-accent/25'
                                                : 'bg-raised/40';
                        return (
                            <div
                                key={k}
                                onPointerDown={() => { painting.current = true; toggleWall(r, c); }}
                                onPointerEnter={() => { if (painting.current) toggleWall(r, c); }}
                                className={`size-4 cursor-pointer rounded-[3px] transition-colors sm:size-5 ${colour}`}
                            />
                        );
                    }))}
                </div>

                <div className="mt-4 space-y-2 border-t border-line pt-4">
                    <p className="text-sm text-muted">
                        {pathLength > 0
                            ? `Path found: ${pathLength - 1} moves after visiting ${visited} cells.`
                            : 'No path exists with the current walls.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-subtle">
                        <span>{algo.complexity}</span>
                        <span className="font-mono">Step {step} / {frames.length}</span>
                    </div>
                    <input
                        type="range" min={0} max={frames.length} value={step}
                        onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
                        className="w-full accent-accent"
                    />
                    <div className="flex flex-wrap gap-4 pt-1 text-xs text-subtle">
                        <Legend colour="bg-emerald-500" label="start" />
                        <Legend colour="bg-rose-500" label="target" />
                        <Legend colour="bg-accent/25" label="queued" />
                        <Legend colour="bg-accent/60" label="visited" />
                        <Legend colour="bg-amber-400" label="path" />
                        <Legend colour="bg-line" label="wall" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Visualizer;
