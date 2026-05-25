// Algorithms written as generators: each `yield` is one animation frame.
// Keeping the stepping logic out of React means the player component is
// a dumb frame renderer and adding an algorithm is one function.

const frame = (array, active = [], marked = [], note = '', pivot = null) => ({
    array: [...array], active, marked: [...marked], note, pivot,
});

const allIndices = (n) => Array.from({ length: n }, (_, i) => i);

// ---------------------------------------------------------------- sorting

function* bubbleSort(input) {
    const a = [...input];
    const done = [];
    for (let i = 0; i < a.length - 1; i++) {
        let swapped = false;
        for (let j = 0; j < a.length - 1 - i; j++) {
            yield frame(a, [j, j + 1], done, `Compare a[${j}]=${a[j]} with a[${j + 1}]=${a[j + 1]}`);
            if (a[j] > a[j + 1]) {
                [a[j], a[j + 1]] = [a[j + 1], a[j]];
                swapped = true;
                yield frame(a, [j, j + 1], done, `${a[j + 1]} > ${a[j]}, swap`);
            }
        }
        done.push(a.length - 1 - i);
        if (!swapped) break; // already sorted
    }
    yield frame(a, [], allIndices(a.length), 'Sorted');
}

function* selectionSort(input) {
    const a = [...input];
    const done = [];
    for (let i = 0; i < a.length - 1; i++) {
        let min = i;
        for (let j = i + 1; j < a.length; j++) {
            yield frame(a, [min, j], done, `Current min a[${min}]=${a[min]}, checking a[${j}]=${a[j]}`);
            if (a[j] < a[min]) min = j;
        }
        if (min !== i) [a[i], a[min]] = [a[min], a[i]];
        done.push(i);
        yield frame(a, [i], done, `Place ${a[i]} at index ${i}`);
    }
    yield frame(a, [], allIndices(a.length), 'Sorted');
}

function* insertionSort(input) {
    const a = [...input];
    for (let i = 1; i < a.length; i++) {
        const key = a[i];
        let j = i - 1;
        yield frame(a, [i], allIndices(i), `Insert a[${i}]=${key} into the sorted prefix`);
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            yield frame(a, [j, j + 1], allIndices(i), `${a[j]} > ${key}, shift right`);
            j--;
        }
        a[j + 1] = key;
        yield frame(a, [j + 1], allIndices(i + 1), `Placed ${key} at index ${j + 1}`);
    }
    yield frame(a, [], allIndices(a.length), 'Sorted');
}

function* mergeRange(a, lo, hi) {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    yield* mergeRange(a, lo, mid);
    yield* mergeRange(a, mid + 1, hi);

    const range = [];
    for (let k = lo; k <= hi; k++) range.push(k);

    const tmp = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
        yield frame(a, [i, j], range, `Merge: compare ${a[i]} and ${a[j]}`);
        tmp.push(a[i] <= a[j] ? a[i++] : a[j++]);
    }
    while (i <= mid) tmp.push(a[i++]);
    while (j <= hi) tmp.push(a[j++]);

    for (let k = 0; k < tmp.length; k++) {
        a[lo + k] = tmp[k];
        yield frame(a, [lo + k], range, `Write ${tmp[k]} into index ${lo + k}`);
    }
}

function* mergeSort(input) {
    const a = [...input];
    yield* mergeRange(a, 0, a.length - 1);
    yield frame(a, [], allIndices(a.length), 'Sorted');
}

function* quickRange(a, lo, hi, done) {
    if (lo >= hi) {
        if (lo === hi) done.push(lo);
        return;
    }
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
        yield frame(a, [j], done, `Compare a[${j}]=${a[j]} with pivot ${pivot}`, hi);
        if (a[j] < pivot) {
            if (i !== j) {
                [a[i], a[j]] = [a[j], a[i]];
                yield frame(a, [i, j], done, `${a[j]} < pivot, swap into position ${i}`, hi);
            }
            i++;
        }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    done.push(i);
    yield frame(a, [i], done, `Pivot ${pivot} lands at index ${i}`, i);
    yield* quickRange(a, lo, i - 1, done);
    yield* quickRange(a, i + 1, hi, done);
}

function* quickSort(input) {
    const a = [...input];
    yield* quickRange(a, 0, a.length - 1, []);
    yield frame(a, [], allIndices(a.length), 'Sorted');
}

// -------------------------------------------------------------- searching

function* linearSearch(input, target) {
    const a = [...input];
    for (let i = 0; i < a.length; i++) {
        yield frame(a, [i], allIndices(i), `Is a[${i}]=${a[i]} equal to ${target}?`);
        if (a[i] === target) {
            yield frame(a, [i], [i], `Found ${target} at index ${i} after ${i + 1} comparisons`);
            return;
        }
    }
    yield frame(a, [], [], `${target} is not in the array`);
}

function* binarySearch(input, target) {
    const a = [...input].sort((x, y) => x - y);
    let lo = 0, hi = a.length - 1;
    yield frame(a, [], allIndices(a.length), 'Binary search needs a sorted array - sorted first');
    while (lo <= hi) {
        const window = [];
        for (let k = lo; k <= hi; k++) window.push(k);
        const mid = (lo + hi) >> 1;
        yield frame(a, [mid], window, `lo=${lo}, hi=${hi}, mid=${mid} -> a[${mid}]=${a[mid]}`);
        if (a[mid] === target) {
            yield frame(a, [mid], [mid], `Found ${target} at index ${mid}`);
            return;
        }
        if (a[mid] < target) {
            yield frame(a, [mid], window, `${a[mid]} < ${target}, discard the left half`);
            lo = mid + 1;
        } else {
            yield frame(a, [mid], window, `${a[mid]} > ${target}, discard the right half`);
            hi = mid - 1;
        }
    }
    yield frame(a, [], [], `${target} is not in the array`);
}

export const ARRAY_ALGORITHMS = [
    { id: 'bubble', label: 'Bubble sort', complexity: 'O(n²) time, O(1) space', gen: bubbleSort, needsTarget: false },
    { id: 'selection', label: 'Selection sort', complexity: 'O(n²) time, O(1) space', gen: selectionSort, needsTarget: false },
    { id: 'insertion', label: 'Insertion sort', complexity: 'O(n²) time, O(1) space', gen: insertionSort, needsTarget: false },
    { id: 'merge', label: 'Merge sort', complexity: 'O(n log n) time, O(n) space', gen: mergeSort, needsTarget: false },
    { id: 'quick', label: 'Quick sort', complexity: 'O(n log n) avg, O(n²) worst', gen: quickSort, needsTarget: false },
    { id: 'linear', label: 'Linear search', complexity: 'O(n) time', gen: linearSearch, needsTarget: true },
    { id: 'binary', label: 'Binary search', complexity: 'O(log n) time, needs sorted input', gen: binarySearch, needsTarget: true },
];

// ------------------------------------------------------------ pathfinding
// Frames here are deltas (`{ kind, r, c }`) rather than whole grids: a
// 25x40 grid materialised per frame would be a megabyte of state.

const NEIGHBOURS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const key = (r, c) => `${r},${c}`;

function tracePath(parent, endKey) {
    const path = [];
    let cur = endKey;
    while (cur) {
        path.push(cur);
        cur = parent.get(cur);
    }
    return path.reverse();
}

/** Shared traversal: `pop` decides BFS (shift) vs DFS (pop). */
function* traverse(grid, start, end, popLast) {
    const rows = grid.length, cols = grid[0].length;
    const seen = new Set([key(...start)]);
    const parent = new Map();
    const queue = [start];

    while (queue.length) {
        const [r, c] = popLast ? queue.pop() : queue.shift();
        yield { kind: 'visit', r, c };

        if (r === end[0] && c === end[1]) {
            for (const k of tracePath(parent, key(r, c))) {
                const [pr, pc] = k.split(',').map(Number);
                yield { kind: 'path', r: pr, c: pc };
            }
            return;
        }

        for (const [dr, dc] of NEIGHBOURS) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
            if (grid[nr][nc] === 1 || seen.has(key(nr, nc))) continue;
            seen.add(key(nr, nc));
            parent.set(key(nr, nc), key(r, c));
            queue.push([nr, nc]);
            yield { kind: 'frontier', r: nr, c: nc };
        }
    }
}

export const GRID_ALGORITHMS = [
    {
        id: 'bfs',
        label: 'BFS (shortest path)',
        complexity: 'O(V + E) - guarantees the shortest path on an unweighted grid',
        gen: (grid, start, end) => traverse(grid, start, end, false),
    },
    {
        id: 'dfs',
        label: 'DFS',
        complexity: 'O(V + E) - finds *a* path, not necessarily the shortest',
        gen: (grid, start, end) => traverse(grid, start, end, true),
    },
];

/** Drains a generator into an array, with a hard cap so a bug cannot hang the tab. */
export function collectFrames(generator, cap = 20000) {
    const frames = [];
    for (const f of generator) {
        frames.push(f);
        if (frames.length >= cap) break;
    }
    return frames;
}
