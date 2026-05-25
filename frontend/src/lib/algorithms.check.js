// Self-check for the visualiser algorithms. Run: npm run check
import assert from 'node:assert/strict';
import { ARRAY_ALGORITHMS, GRID_ALGORITHMS, collectFrames } from './algorithms.js';

const sorts = ARRAY_ALGORITHMS.filter((a) => !a.needsTarget);
const searches = ARRAY_ALGORITHMS.filter((a) => a.needsTarget);

const cases = [
    [],
    [1],
    [2, 1],
    [5, 4, 3, 2, 1],
    [1, 2, 3, 4, 5],
    [3, 3, 3, 3],
    [9, -2, 7, 0, 7, -2, 4, 1],
];

for (const algo of sorts) {
    for (const input of cases) {
        const frames = collectFrames(algo.gen(input));
        const expected = [...input].sort((a, b) => a - b);
        assert.deepEqual(frames.at(-1).array, expected, `${algo.label} failed on [${input}]`);
        // The source array must never be mutated in place.
        assert.deepEqual(input, cases[cases.indexOf(input)], `${algo.label} mutated its input`);
    }
}

for (const algo of searches) {
    const arr = [9, -2, 7, 0, 4, 1];
    const hit = collectFrames(algo.gen(arr, 7)).at(-1);
    assert.match(hit.note, /Found 7/, `${algo.label} should find a present value`);

    const miss = collectFrames(algo.gen(arr, 42)).at(-1);
    assert.match(miss.note, /not in the array/, `${algo.label} should report a missing value`);
}

// BFS must return a shortest path; DFS must return some valid path.
const grid = Array.from({ length: 6 }, () => Array(6).fill(0));
for (let r = 0; r < 5; r++) grid[r][3] = 1; // wall with a gap at row 5

for (const algo of GRID_ALGORITHMS) {
    const frames = collectFrames(algo.gen(grid, [0, 0], [0, 5]));
    const path = frames.filter((f) => f.kind === 'path');
    assert.ok(path.length > 0, `${algo.label} found no path`);
    assert.deepEqual([path[0].r, path[0].c], [0, 0], `${algo.label} path must start at the source`);
    assert.deepEqual([path.at(-1).r, path.at(-1).c], [0, 5], `${algo.label} path must end at the target`);
    // Every step is orthogonally adjacent and never crosses a wall.
    for (let i = 1; i < path.length; i++) {
        const d = Math.abs(path[i].r - path[i - 1].r) + Math.abs(path[i].c - path[i - 1].c);
        assert.equal(d, 1, `${algo.label} path jumped between non-adjacent cells`);
        assert.equal(grid[path[i].r][path[i].c], 0, `${algo.label} path walked through a wall`);
    }
}

// Around the wall: down 5, right 5, up 5 = 15 moves = 16 cells.
const bfsPath = collectFrames(GRID_ALGORITHMS[0].gen(grid, [0, 0], [0, 5])).filter((f) => f.kind === 'path');
assert.equal(bfsPath.length, 16, 'BFS did not return the shortest path');

// Unreachable target terminates instead of hanging.
const walled = Array.from({ length: 4 }, () => Array(4).fill(0));
for (let r = 0; r < 4; r++) walled[r][2] = 1;
assert.equal(
    collectFrames(GRID_ALGORITHMS[0].gen(walled, [0, 0], [0, 3])).filter((f) => f.kind === 'path').length,
    0,
    'BFS reported a path through a solid wall'
);

console.log('algorithms: all checks passed');
