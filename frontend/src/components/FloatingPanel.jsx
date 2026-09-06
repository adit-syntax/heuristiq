import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Grip, Locate, Maximize2, Minimize2, X } from 'lucide-react';

// Keep at least this much visible on each axis so the panel can always be
// grabbed and pulled back (or re-centred with the Locate button).
const GRAB_X = 140;
const GRAB_Y = 40;

// Dynamic z-index stacking manager for all floating panels (101..118).
// Keeps panels strictly below toasts (z-[120]) and modal dialogs (z-[130]).
// Clicking or focusing any panel elevates it above all other panels.
const activePanels = new Set();
let baseZ = 101;
let topUpdater = null;

function registerPanel(setZ) {
    activePanels.add(setZ);
    baseZ++;
    topUpdater = setZ;
    setZ(baseZ);
    return () => {
        activePanels.delete(setZ);
        if (topUpdater === setZ) topUpdater = null;
    };
}

function bringPanelToFront(setZ) {
    if (topUpdater === setZ) return; // already on top
    baseZ++;
    if (baseZ >= 118) {
        // Renormalize existing panels so numbers never climb indefinitely
        baseZ = 101;
        for (const updater of activePanels) {
            if (updater !== setZ) updater(baseZ++);
        }
    }
    topUpdater = setZ;
    setZ(baseZ);
}

/**
 * Floating, draggable, resizable panel shell. The caller supplies the bar
 * content (right side) and the body. Move by dragging the title bar OR any
 * non-interactive part of the body; resize from any border/corner; Esc closes.
 * Panels move freely (even off-screen); the Locate button re-centres them.
 */
const FloatingPanel = ({
    title,
    icon,
    initialWidth = 720,
    initialHeight,          // optional; default derives from aspect
    minW = 320,
    minH = 180,
    keepAspect = true,   // lock body to the given aspect while resizing
    aspect = 16 / 9,
    onClose,
    onExternal,          // optional { url, title } rendered as an open-external button
    children,
    bodyClassName = '',
}) => {
    const [zIndex, setZIndex] = useState(105);

    useEffect(() => {
        return registerPanel(setZIndex);
    }, []);

    const bringToFront = useCallback(() => {
        bringPanelToFront(setZIndex);
    }, []);

    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
    const effectiveMinW = isMobileScreen ? Math.min(minW, 220) : minW;
    const effectiveMinH = isMobileScreen ? Math.min(minH, 180) : minH;
    const defaultMobileW = typeof window !== 'undefined' ? Math.min(360, window.innerWidth - 16) : 360;
    const defaultMobileH = typeof window !== 'undefined' ? Math.min(460, window.innerHeight - 110) : 420;

    const w0 = isMobileScreen
        ? defaultMobileW
        : Math.min(initialWidth, typeof window !== 'undefined' ? window.innerWidth - 16 : 720);

    const [size, setSize] = useState({
        w: w0,
        h: isMobileScreen
            ? defaultMobileH
            : initialHeight
                ? Math.min(initialHeight, typeof window !== 'undefined' ? window.innerHeight - 80 : 500)
                : Math.round(w0 / aspect),
    });
    const [pos, setPos] = useState(() => ({
        x: Math.max(8, Math.round(((typeof window !== 'undefined' ? window.innerWidth : 800) - w0) / 2)),
        y: Math.max(8, Math.round(((typeof window !== 'undefined' ? window.innerHeight : 600) - (isMobileScreen ? defaultMobileH : Math.round(w0 / aspect))) * 0.15)),
    }));

    const dragRef = useRef(null);
    const panelRef = useRef(null);
    const liveRef = useRef({ pos, size });
    const sanitize = (p, s) => ({
        pos: {
            x: Number.isFinite(p.x) ? p.x : 20,
            y: Number.isFinite(p.y) ? p.y : 20,
        },
        size: {
            w: Number.isFinite(s.w) ? Math.max(effectiveMinW, s.w) : 480,
            h: Number.isFinite(s.h) ? Math.max(effectiveMinH, s.h) : 320,
        },
    });
    liveRef.current = sanitize(pos, size);

    const clamp = useCallback((x, y, w) => {
        // Free horizontal movement: keep at least 48px visible on small screens
        const grabMargin = Math.min(GRAB_X, Math.max(48, Math.round((typeof window !== 'undefined' ? window.innerWidth : 800) * 0.15)));
        const maxW = typeof window !== 'undefined' ? window.innerWidth : 800;
        const maxH = typeof window !== 'undefined' ? window.innerHeight : 600;
        const cx = Number.isFinite(x) ? Math.min(Math.max(grabMargin - w, x), maxW - grabMargin) : Math.round((maxW - w) / 2);
        const cy = Number.isFinite(y) ? Math.min(Math.max(0, y), maxH - GRAB_Y) : Math.round(maxH * 0.15);
        return { x: Math.round(cx), y: Math.round(cy) };
    }, []);

    // Do not force-maximize on mobile: keep panels floating and freely draggable!
    const [isMaximized, setIsMaximized] = useState(false);
    const preMaxRef = useRef(null);

    const toggleMaximize = useCallback(() => {
        if (isMaximized) {
            setIsMaximized(false);
            if (preMaxRef.current) {
                setPos(preMaxRef.current.pos);
                setSize(preMaxRef.current.size);
            }
        } else {
            preMaxRef.current = { pos, size };
            setIsMaximized(true);
            setPos({ x: 8, y: 8 });
            setSize({
                w: typeof window !== 'undefined' ? window.innerWidth - 16 : 800,
                h: typeof window !== 'undefined' ? window.innerHeight - 16 : 600,
            });
        }
    }, [isMaximized, pos, size]);

    useEffect(() => {
        const handleWindowResize = () => {
            if (isMaximized) return;
            setSize((s) => {
                const maxW = Math.max(effectiveMinW, window.innerWidth - 16);
                const maxH = Math.max(effectiveMinH, window.innerHeight - 80);
                const w = Math.min(s.w, maxW);
                const h = Math.min(s.h, maxH);
                return (w === s.w && h === s.h) ? s : { w, h };
            });
            setPos((p) => clamp(p.x, p.y, Math.min(liveRef.current.size.w, window.innerWidth - 16)));
        };
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [clamp, isMaximized, effectiveMinW, effectiveMinH]);

    const [dragging, setDragging] = useState(false);

    const onDragStart = useCallback((e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.cancelable) e.preventDefault();
        const { size: s, pos: p } = liveRef.current;
        dragRef.current = {
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            orig: p,
            origSize: s,
            pointerType: e.pointerType || 'mouse',
            pointerId: e.pointerId,
        };
        setDragging(true);
        if (e.target?.setPointerCapture && e.pointerId !== undefined) {
            try { e.target.setPointerCapture(e.pointerId); } catch {}
        }
    }, []);

    // dir bits: n/s/e/w - e.g. 'se' = bottom-right corner, 'e' = right edge.
    const onResizeStart = useCallback((e, dir) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        const { size: s, pos: p } = liveRef.current;
        dragRef.current = {
            mode: `resize:${dir}`,
            startX: e.clientX,
            startY: e.clientY,
            orig: s,
            origPos: p,
            pointerType: e.pointerType || 'mouse',
            pointerId: e.pointerId,
        };
        setDragging(true);
        if (e.target?.setPointerCapture && e.pointerId !== undefined) {
            try { e.target.setPointerCapture(e.pointerId); } catch {}
        }
    }, []);

    // ONE listener registration for the component's lifetime.
    useEffect(() => {
        const onMove = (e) => {
            const d = dragRef.current;
            if (!d) return;
            // Only mouse can check e.buttons === 0. Touch events frequently report 0 buttons!
            if (d.pointerType === 'mouse' && e.buttons === 0) {
                dragRef.current = null;
                setDragging(false);
                return;
            }
            const dx = e.clientX - d.startX;
            const dy = e.clientY - d.startY;

            if (d.mode === 'move') {
                setPos((prev) => {
                    const next = clamp(d.orig.x + dx, d.orig.y + dy, d.origSize.w);
                    return next.x === prev.x && next.y === prev.y ? prev : next;
                });
                return;
            }

            const dir = d.mode.split(':')[1]; // e.g. 'n', 'se', 'w'...
            // Hard NaN guards: if the gesture origin was ever poisoned, heal
            // from liveRef (which is sanitised from the real DOM rect).
            const origPos = {
                x: Number.isFinite(d.origPos?.x) ? d.origPos.x : liveRef.current.pos.x,
                y: Number.isFinite(d.origPos?.y) ? d.origPos.y : liveRef.current.pos.y,
            };
            const orig = {
                w: Number.isFinite(d.orig?.w) ? d.orig.w : liveRef.current.size.w,
                h: Number.isFinite(d.orig?.h) ? d.orig.h : liveRef.current.size.h,
            };
            let { x, y } = origPos;
            let w = orig.w;
            let h = orig.h;

            // Each axis is independent: only the dragged edges touch it.
            if (dir.includes('e')) w = orig.w + dx;
            if (dir.includes('s')) h = orig.h + dy;
            if (dir.includes('w')) { w = orig.w - dx; x = origPos.x + dx; }
            if (dir.includes('n')) { h = orig.h - dy; y = origPos.y + dy; }

            const clampedW = Math.min(Math.max(effectiveMinW, w), window.innerWidth - 8);
            // Cap height below the free-movement inversion threshold.
            const maxH = Math.max(effectiveMinH, window.innerHeight - 80);
            const clampedH = Math.min(Math.max(effectiveMinH, h), maxH);

            w = clampedW;
            h = clampedH;

            // Aspect lock only applies to corner drags (a stretched edge is
            // explicitly a one-axis request).
            if (keepAspect && dir.length === 2) {
                w = Math.round(h * aspect);
                if (w > window.innerWidth - 8) { w = window.innerWidth - 8; h = Math.round(w / aspect); }
                if (w < effectiveMinW) { w = effectiveMinW; h = Math.round(w / aspect); }
                // Keep the opposite corner anchored.
                if (dir.includes('w')) x = d.origPos.x + (orig.w - w);
                if (dir.includes('n')) y = d.origPos.y + (orig.h - h);
            }

            // When an edge pulled the panel past a min, pin it back so the
            // opposite side stays anchored.
            if (dir.includes('w')) x = Math.min(x, d.origPos.x + orig.w - effectiveMinW);
            if (dir.includes('n')) y = Math.min(y, d.origPos.y + orig.h - effectiveMinH);

            const nextW = Math.round(w), nextH = Math.round(h);
            setSize((prev) => (prev.w === nextW && prev.h === nextH ? prev : { w: nextW, h: nextH }));
            if (dir.includes('w') || dir.includes('n')) {
                setPos((prev) => {
                    const next = clamp(Math.round(x), Math.round(y), nextW);
                    return next.x === prev.x && next.y === prev.y ? prev : next;
                });
            }
        };

        const onUp = (e) => {
            if (dragRef.current?.pointerId !== undefined && e?.target?.releasePointerCapture) {
                try { e.target.releasePointerCapture(dragRef.current.pointerId); } catch {}
            }
            dragRef.current = null;
            setDragging(false);
        };
        const clearZombie = () => {
            dragRef.current = null;
            setDragging(false);
        };
        const onOutsideDown = (e) => {
            const panel = panelRef.current;
            if (dragRef.current && panel && !panel.contains(e.target)) clearZombie();
        };
        window.addEventListener('blur', clearZombie);
        document.addEventListener('visibilitychange', clearZombie);
        document.addEventListener('pointerdown', onOutsideDown, true);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            window.removeEventListener('blur', clearZombie);
            document.removeEventListener('visibilitychange', clearZombie);
            document.removeEventListener('pointerdown', onOutsideDown, true);
        };
    }, [minW, minH, keepAspect, aspect, clamp]);

    const recenter = useCallback(() => {
        setPos({
            x: Math.max(8, Math.round((window.innerWidth - size.w) / 2)),
            y: Math.max(8, Math.round((window.innerHeight - size.h) * 0.2)),
        });
    }, [size.w, size.h]);

    const isOffscreen = pos.x < 0 || pos.y < 0 || pos.x + size.w > window.innerWidth || pos.y + size.h > window.innerHeight;

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                setPos((p) => clamp(
                    p.x + (e.key === 'ArrowRight' ? 24 : e.key === 'ArrowLeft' ? -24 : 0),
                    p.y + (e.key === 'ArrowDown' ? 24 : e.key === 'ArrowUp' ? -24 : 0),
                    size.w
                ));
            }
            if (e.key === '+' || e.key === '=') {
                setSize((s) => {
                    const w = Math.min(s.w + 48, window.innerWidth - 8);
                    const h = keepAspect ? Math.round(w / aspect) : Math.min(s.h + 48, window.innerHeight - 8);
                    return { w, h };
                });
            }
            if (e.key === '-') {
                setSize((s) => {
                    const w = Math.max(minW, s.w - 48);
                    const h = keepAspect ? Math.round(w / aspect) : Math.max(minH, s.h - 48);
                    return { w, h };
                });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, size.w, size.h, keepAspect, aspect, minW, minH, clamp]);

    const actualPos = isMaximized
        ? { x: 8, y: 8 }
        : pos;
    const actualWidth = isMaximized
        ? (typeof window !== 'undefined' ? window.innerWidth - 16 : 720)
        : Math.min(size.w, typeof window !== 'undefined' ? window.innerWidth - 16 : 720);
    const actualBodyHeight = isMaximized
        ? Math.max(180, (typeof window !== 'undefined' ? window.innerHeight : 600) - ((typeof window !== 'undefined' && window.innerWidth < 768) ? 128 : 64))
        : Math.min(size.h, typeof window !== 'undefined' ? window.innerHeight - 80 : 500);

    // Portal to <body>: the panel must not live inside any animated or
    // transformed ancestor (page fade-ins, hover scales) - those turn
    // position:fixed into position:absolute-like behaviour and break free
    // movement (the "locked to horizontal" bug).
    return createPortal(
        <div
            ref={panelRef}
            className={`fixed select-none overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl transition-[box-shadow,border-color] duration-150 ${isMaximized ? 'transition-all duration-200' : ''}`}
            style={{
                left: actualPos.x,
                top: actualPos.y,
                width: actualWidth,
                maxWidth: 'calc(100vw - 16px)',
                zIndex,
            }}
            onPointerDownCapture={bringToFront}
            onFocusCapture={bringToFront}
            onPointerDown={(e) => {
                if (isMaximized) return;
                if (e.button !== 0) return;
                // On touchscreens (smartphones/tablets), touching body should scroll content, NOT drag the panel
                if (e.pointerType === 'touch') return;
                const el = e.target;
                if (el.closest('button, a, input, textarea, select, iframe, [contenteditable], [data-no-drag]')) return;
                if (el.closest('[data-drag-handle]') || el.closest('.monaco-editor') || el.closest('canvas') || el.closest('textarea')) return;
                onDragStart(e);
            }}
        >
            {/* While dragging: a transparent shield over the whole panel.
                Guarantees pointerup/move always land on our window (iframes
                and Monaco swallow pointer events otherwise - the zombie
                gesture bug), and blocks text-selection/scroll interference. */}
            {dragging && <div className="absolute inset-0 z-20 cursor-grabbing" />}
            {/* Drag bar */}
            <div
                data-drag-handle
                style={{ touchAction: isMaximized ? 'auto' : 'none' }}
                onPointerDown={isMaximized ? undefined : onDragStart}
                className={`flex items-center gap-1.5 sm:gap-2 border-b border-line bg-raised/60 px-2.5 py-2 sm:px-3 ${isMaximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                title={isMaximized ? undefined : "Drag to move · arrow keys nudge · +/- resizes"}
            >
                <Grip className={`size-3.5 shrink-0 text-subtle ${isMaximized ? 'hidden sm:block opacity-40' : ''}`} />
                {icon}
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{title}</span>

                {/* Recenter button (hidden when maximized) */}
                {!isMaximized && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={recenter}
                        title="Re-centre on screen"
                        className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors
                            ${isOffscreen ? 'bg-accent/15 text-accent-hi hover:bg-accent/25' : 'text-subtle hover:bg-raised hover:text-fg'}`}
                    >
                        <Locate className="size-3.5" />
                    </button>
                )}

                {/* Maximize / Restore button */}
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={toggleMaximize}
                    title={isMaximized ? "Restore window size" : "Maximize (Full screen)"}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                >
                    {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </button>

                {onExternal && (
                    <a
                        href={onExternal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onPointerDown={(e) => e.stopPropagation()}
                        title={onExternal.title || 'Open externally'}
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                    >
                        {onExternal.icon}
                    </a>
                )}
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onClose}
                    title="Close (Esc)"
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                    <X className="size-3.5" />
                </button>
            </div>

            {/* Body: cleanly fills the remaining panel height without overflowing */}
            <div className={`flex-1 min-h-0 w-full overflow-hidden ${bodyClassName}`}>
                {children}
            </div>

            {/* Body drag strip & resize zones (only active when not maximized) */}
            {!isMaximized && (
                <>
                    {/* Body drag strip: a slim grabbable band below title bar */}
                    <div
                        onPointerDown={(e) => {
                            if (e.pointerType === 'touch') return;
                            onDragStart(e);
                        }}
                        className="absolute inset-x-[20px] top-[40px] z-[15] h-3 cursor-grab active:cursor-grabbing"
                        title="Drag to move"
                    />

                    {/* Resize zones: 4 corners + 4 edges with generous touch targets on mobile */}
                    {[
                        // Corners (generous hit target on mobile: 32px / 36px)
                        { dir: 'nw', cls: 'left-0 top-0 size-8 sm:size-[18px] cursor-nwse-resize z-20' },
                        { dir: 'ne', cls: 'right-0 top-0 size-8 sm:size-[18px] cursor-nesw-resize z-20' },
                        { dir: 'sw', cls: 'left-0 bottom-0 size-8 sm:size-[18px] cursor-nesw-resize z-20' },
                        { dir: 'se', cls: 'right-0 bottom-0 size-10 sm:size-7 cursor-nwse-resize z-30' },
                        // Edge bands - full length of each side, comfortable touch targets
                        { dir: 'n', cls: 'left-8 right-8 top-0 h-3 sm:h-2 cursor-ns-resize z-10' },
                        { dir: 's', cls: 'left-8 right-8 bottom-0 h-4 sm:h-2 cursor-ns-resize z-10' },
                        { dir: 'w', cls: 'top-8 bottom-8 left-0 w-4 sm:w-2 cursor-ew-resize z-10' },
                        { dir: 'e', cls: 'top-8 bottom-8 right-0 w-4 sm:w-2 cursor-ew-resize z-10' },
                    ].map((h) => (
                        <div
                            key={h.dir}
                            style={{ touchAction: 'none' }}
                            onPointerDown={(e) => onResizeStart(e, h.dir)}
                            className={`absolute select-none ${h.cls}`}
                            title="Drag to resize"
                        />
                    ))}

                    {/* Corner affordance on the se grip */}
                    <div className="pointer-events-none absolute bottom-1 right-1 size-4 sm:size-3.5 z-30 opacity-70">
                        <svg viewBox="0 0 16 16" className="size-full text-subtle">
                            <path d="M14 6 L6 14 M14 10 L10 14 M14 2 L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                    </div>
                </>
            )}
        </div>,
        document.body
    );
};

export default FloatingPanel;
