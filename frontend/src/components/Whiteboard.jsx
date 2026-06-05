import { useRef, useCallback, useMemo, useEffect } from 'react';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { PenLine, Plus, Trash2, Pencil } from 'lucide-react';
import useSyncedDoc from '../hooks/useSyncedDoc';
import { SyncBadge } from './Notes';
import useToast from '../hooks/useToast';
import FloatingPanel from './FloatingPanel';

const EMPTY = { items: {}, activeId: null };

const newBoard = (name) => ({
    id: `b_${Date.now()}`,
    name,
    scene: '',
    updatedAt: Date.now(),
});

/**
 * Scenes are stored as JSON strings: Excalidraw elements contain nested arrays
 * (`points: [[x, y], ...]`) and Firestore rejects nested arrays outright.
 */
const parseScene = (scene) => {
    if (!scene) return null;
    try {
        const { elements, appState } = JSON.parse(scene);
        return { elements: elements || [], appState: { ...appState, collaborators: undefined }, scrollToContent: true };
    } catch {
        return null;
    }
};

const Whiteboard = ({ theme = 'dark', floating = false, onClose }) => {
    const [doc, setDoc, { loading, status }] = useSyncedDoc('boards', EMPTY);
    const saveTimer = useRef(null);
    const { toast, confirm, prompt } = useToast();

    const boards = useMemo(
        () => Object.values(doc.items || {}).sort((a, b) => b.updatedAt - a.updatedAt),
        [doc.items]
    );
    const activeId = doc.activeId && doc.items?.[doc.activeId] ? doc.activeId : boards[0]?.id || null;
    const active = activeId ? doc.items[activeId] : null;

    // First run: give the user a board instead of an empty screen.
    useEffect(() => {
        if (!loading && boards.length === 0) {
            const b = newBoard('Scratchpad');
            setDoc((prev) => ({ items: { ...prev.items, [b.id]: b }, activeId: b.id }));
        }
    }, [loading, boards.length, setDoc]);

    // Excalidraw fires onChange on every pointer move; only persist after a pause.
    const handleChange = useCallback((elements, appState, files) => {
        if (!activeId) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const scene = serializeAsJSON(elements, appState, files, 'local');
        saveTimer.current = setTimeout(() => {
            setDoc((prev) => (prev.items?.[activeId]
                ? { ...prev, items: { ...prev.items, [activeId]: { ...prev.items[activeId], scene, updatedAt: Date.now() } } }
                : prev));
        }, 800);
    }, [activeId, setDoc]);

    useEffect(() => () => clearTimeout(saveTimer.current), []);

    const addBoard = async () => {
        const name = await prompt('New board', {
            body: 'Give the board a name.',
            initialValue: `Board ${boards.length + 1}`,
            placeholder: 'Board name',
            confirmLabel: 'Create',
        });
        if (!name) return;
        const b = newBoard(name);
        setDoc((prev) => ({ items: { ...prev.items, [b.id]: b }, activeId: b.id }));
        toast('Board created', { detail: name });
    };

    const renameBoard = async () => {
        if (!active) return;
        const name = await prompt('Rename board', {
            initialValue: active.name,
            placeholder: 'Board name',
            confirmLabel: 'Rename',
        });
        if (!name) return;
        setDoc((prev) => ({ ...prev, items: { ...prev.items, [active.id]: { ...prev.items[active.id], name } } }));
        toast('Board renamed', { detail: name });
    };

    const removeBoard = async () => {
        if (!active) return;
        const board = active;
        if (!await confirm(`Delete "${board.name}"?`, {
            body: 'This cannot be undone.',
            confirmLabel: 'Delete board',
            danger: true,
        })) return;
        setDoc((prev) => {
            const items = { ...prev.items };
            delete items[board.id];
            return { items, activeId: Object.keys(items)[0] || null };
        });
        // Undo window: re-insert the board verbatim (scene string intact).
        toast('Board deleted', {
            detail: board.name,
            kind: 'danger',
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    setDoc((prev) => ({ ...prev, items: { ...prev.items, [board.id]: board }, activeId: board.id }));
                    toast('Board restored', { detail: board.name });
                },
            },
        });
    };

    const boardTabs = (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {boards.map((b) => (
                <button
                    key={b.id}
                    onClick={() => setDoc((prev) => ({ ...prev, activeId: b.id }))}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-all
                        ${b.id === activeId ? 'bg-accent text-white' : 'bg-raised/60 text-muted hover:bg-raised hover:text-fg'}`}
                >
                    {b.name}
                </button>
            ))}
            <button onClick={addBoard} title="New board"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-raised/60 text-muted transition-colors hover:bg-raised hover:text-fg">
                <Plus className="size-4" />
            </button>
            {active && (
                <>
                    <button onClick={renameBoard} title="Rename board"
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-raised/60 text-muted transition-colors hover:bg-raised hover:text-fg">
                        <Pencil className="size-4" />
                    </button>
                    <button onClick={removeBoard} title="Delete board"
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-raised/60 text-subtle transition-colors hover:bg-rose-500/10 hover:text-rose-400">
                        <Trash2 className="size-4" />
                    </button>
                </>
            )}
        </div>
    );

    const canvas = (
        <div className="h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-line bg-panel">
            {!loading && active && (
                // Remount on board switch so initialData is re-read.
                <Excalidraw
                    key={active.id}
                    theme={theme}
                    initialData={parseScene(active.scene)}
                    onChange={handleChange}
                    UIOptions={{ canvasActions: { loadScene: false } }}
                />
            )}
        </div>
    );

    // Floating mode: the full board (tabs + canvas) inside a draggable,
    // resizable panel - usable from any tab.
    if (floating) {
        return (
            <FloatingPanel
                title={`Whiteboard${active ? ` - ${active.name}` : ''}`}
                icon={<PenLine className="size-4 shrink-0 text-accent-hi" />}
                initialWidth={880}
                initialHeight={560}
                minW={420}
                minH={320}
                keepAspect={false}
                allowOffscreen
                onClose={onClose || (() => {})}
            >
                <div className="flex h-full flex-col gap-2 p-2">
                    {boardTabs}
                    <div className="min-h-0 flex-1">{canvas}</div>
                </div>
            </FloatingPanel>
        );
    }

    return (
        <div className="space-y-4 px-1 sm:px-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <PenLine className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Whiteboard</h1>
                        <p className="text-sm text-subtle sm:text-base">Sketch trees, graphs and dry runs. Autosaves.</p>
                    </div>
                </div>
                <SyncBadge status={status} loading={loading} />
            </div>

            {boardTabs}

            {/* Canvas - Excalidraw needs an explicitly sized parent. */}
            <div className="h-[72vh] min-h-[420px] overflow-hidden rounded-2xl border border-line bg-panel">
                {!loading && active && (
                    // Remount on board switch so initialData is re-read.
                    <Excalidraw
                        key={active.id}
                        theme={theme}
                        initialData={parseScene(active.scene)}
                        onChange={handleChange}
                        UIOptions={{ canvasActions: { loadScene: false } }}
                    />
                )}
            </div>
        </div>
    );
};

export default Whiteboard;
