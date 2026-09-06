import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Grip, Locate, Maximize2, Minimize2, X } from 'lucide-react';

// Keep at least this much visible on each axis so the panel can always be
// grabbed and pulled back (or re-centred with the Locate button).
const GRAB_X = 64;
const GRAB_Y = 40;

// Dynamic z-index stacking manager for all floating panels (101..118).
// Keeps panels strictly below toasts (z-[120]) and modal dialogs (z-[130]).
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
    if (topUpdater === setZ) return;
    baseZ++;
    if (baseZ >= 118) {
        baseZ = 101;
        for (const updater of activePanels) {
            if (updater !== setZ) updater(baseZ++);
        }
    }
    topUpdater = setZ;
    setZ(baseZ);
}

// Module-level persistent geometry cache so panels remember where the user
// moved/resized them instead of resetting to auto-centre on reopen.
const panelCache = new Map();

/**
 * Floating, draggable, resizable panel shell.
 * Move by dragging the title bar; resize from any border/corner; Esc closes.
 */
const FloatingPanel = ({
    title,
    icon,
    panelId,
    initialWidth = 720,
    initialHeight,
    minW = 320,
    minH = 180,
    keepAspect = false,
    aspect = 16 / 9,
    onClose,
    onExternal,
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

    const cacheKey = panelId || (typeof title === 'string' ? title.split(' - ')[0].trim() : 'panel');

    const [size, setSize] = useState(() => {
        const cached = panelCache.get(cacheKey)?.size;
        const maxW = typeof window !== 'undefined' ? window.innerWidth - 16 : 800;
        const maxH = typeof window !== 'undefined' ? window.innerHeight - 32 : 600;
        if (cached && Number.isFinite(cached.w) && Number.isFinite(cached.h)) {
            return {
                w: Math.round(Math.max(effectiveMinW, Math.min(cached.w, maxW))),
                h: Math.round(Math.max(effectiveMinH, Math.min(cached.h, maxH))),
            };
        }
        const w0 = isMobileScreen
            ? defaultMobileW
            : Math.min(initialWidth, maxW);
        const h0 = isMobileScreen
            ? defaultMobileH
            : initialHeight
                ? Math.min(initialHeight, maxH)
                : Math.round(w0 / aspect);
        return { w: Math.round(w0), h: Math.round(h0) };
    });

    const [pos, setPos] = useState(() => {
        const cached = panelCache.get(cacheKey)?.pos;
        const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
        const winH = typeof window !== 'undefined' ? window.innerHeight : 600;
        if (cached && Number.isFinite(cached.x) && Number.isFinite(cached.y)) {
            return {
                x: Math.round(Math.max(8, Math.min(cached.x, winW - 60))),
                y: Math.round(Math.max(8, Math.min(cached.y, winH - 60))),
            };
        }
        const initialW = isMobileScreen ? defaultMobileW : Math.min(initialWidth, winW - 16);
        const initialH = isMobileScreen ? defaultMobileH : (initialHeight || Math.round(initialW / aspect));
        return {
            x: Math.max(8, Math.round((winW - initialW) / 2)),
            y: Math.max(8, Math.round((winH - initialH) * 0.15)),
        };
    });

    const dragRef = useRef(null);
    const panelRef = useRef(null);
    const liveRef = useRef({ pos, size });

    // Keep liveRef updated with sanitized coordinates on every render
    const sanitize = (p, s) => ({
        pos: {
            x: Number.isFinite(p?.x) ? p.x : 20,
            y: Number.isFinite(p?.y) ? p.y : 20,
        },
        size: {
            w: Number.isFinite(s?.w) ? Math.max(effectiveMinW, s.w) : 360,
            h: Number.isFinite(s?.h) ? Math.max(effectiveMinH, s.h) : 260,
        },
    });
    liveRef.current = sanitize(pos, size);

    const clamp = useCallback((x, y, w, h) => {
        const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
        const winH = typeof window !== 'undefined' ? window.innerHeight : 600;
        const panelW = Number.isFinite(w) ? w : 360;
        const panelH = Number.isFinite(h) ? h : 260;

        // Keep at least GRAB_X pixels on screen horizontally, and title bar visible vertically
        const minX = Math.min(8, winW - panelW - 8);
        const maxX = Math.max(8, winW - GRAB_X);
        const safeX = Number.isFinite(x) ? Math.min(Math.max(-panelW + GRAB_X, x), maxX) : Math.max(8, Math.round((winW - panelW) / 2));
        const safeY = Number.isFinite(y) ? Math.min(Math.max(0, y), winH - GRAB_Y) : Math.max(8, Math.round((winH - panelH) * 0.15));
        return { x: Math.round(safeX), y: Math.round(safeY) };
    }, []);

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

    // Adjust on window resize without resetting position
    useEffect(() => {
        const handleWindowResize = () => {
            if (isMaximized) return;
            const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
            const winH = typeof window !== 'undefined' ? window.innerHeight : 600;
            setSize((s) => {
                const maxW = Math.max(effectiveMinW, winW - 16);
                const maxH = Math.max(effectiveMinH, winH - 32);
                const w = Math.min(s.w, maxW);
                const h = Math.min(s.h, maxH);
                return (w === s.w && h === s.h) ? s : { w: Math.round(w), h: Math.round(h) };
            });
            setPos((p) => clamp(p.x, p.y, liveRef.current.size.w, liveRef.current.size.h));
        };
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [clamp, isMaximized, effectiveMinW, effectiveMinH]);

    const [dragging, setDragging] = useState(false);

    // Uniform start for move drag
    const onDragStart = useCallback((e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.cancelable) e.preventDefault();
        const { size: s, pos: p } = liveRef.current;
        dragRef.current = {
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            origPos: { x: p.x, y: p.y },
            origSize: { w: s.w, h: s.h },
            pointerType: e.pointerType || 'mouse',
            pointerId: e.pointerId,
        };
        setDragging(true);
        if (e.target?.setPointerCapture && e.pointerId !== undefined) {
            try { e.target.setPointerCapture(e.pointerId); } catch {}
        }
    }, []);

    // Uniform start for resize drag
    const onResizeStart = useCallback((e, dir) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        const { size: s, pos: p } = liveRef.current;
        dragRef.current = {
            mode: `resize:${dir}`,
            startX: e.clientX,
            startY: e.clientY,
            origPos: { x: p.x, y: p.y },
            origSize: { w: s.w, h: s.h },
            pointerType: e.pointerType || 'mouse',
            pointerId: e.pointerId,
        };
        setDragging(true);
        if (e.target?.setPointerCapture && e.pointerId !== undefined) {
            try { e.target.setPointerCapture(e.pointerId); } catch {}
        }
    }, []);

    useEffect(() => {
        const onMove = (e) => {
            const d = dragRef.current;
            if (!d) return;

            // Only mouse uses e.buttons. Touch events regularly report 0 buttons.
            if (d.pointerType === 'mouse' && e.buttons === 0) {
                dragRef.current = null;
                setDragging(false);
                return;
            }

            const dx = e.clientX - d.startX;
            const dy = e.clientY - d.startY;

            if (d.mode === 'move') {
                const targetX = d.origPos.x + dx;
                const targetY = d.origPos.y + dy;
                const nextPos = clamp(targetX, targetY, d.origSize.w, d.origSize.h);
                setPos((prev) => (nextPos.x === prev.x && nextPos.y === prev.y ? prev : nextPos));
                return;
            }

            // Resizing
            const dir = d.mode.split(':')[1];
            const origX = d.origPos.x;
            const origY = d.origPos.y;
            const origW = d.origSize.w;
            const origH = d.origSize.h;

            let newX = origX;
            let newY = origY;
            let newW = origW;
            let newH = origH;

            const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
            const winH = typeof window !== 'undefined' ? window.innerHeight : 600;

            if (dir.includes('e')) newW = origW + dx;
            if (dir.includes('s')) newH = origH + dy;
            if (dir.includes('w')) {
                newW = origW - dx;
                newX = origX + dx;
            }
            if (dir.includes('n')) {
                newH = origH - dy;
                newY = origY + dy;
            }

            const clampedW = Math.min(Math.max(effectiveMinW, newW), winW - 16);
            const clampedH = Math.min(Math.max(effectiveMinH, newH), winH - 32);

            // Anchor correction when dragging left or top borders
            if (dir.includes('w')) {
                newX = origX + (origW - clampedW);
            }
            if (dir.includes('n')) {
                newY = origY + (origH - clampedH);
            }

            let finalW = clampedW;
            let finalH = clampedH;
            if (keepAspect && dir.length === 2) {
                finalW = Math.round(finalH * aspect);
                if (finalW > winW - 16) {
                    finalW = winW - 16;
                    finalH = Math.round(finalW / aspect);
                }
                if (finalW < effectiveMinW) {
                    finalW = effectiveMinW;
                    finalH = Math.round(finalW / aspect);
                }
                if (dir.includes('w')) newX = origX + (origW - finalW);
                if (dir.includes('n')) newY = origY + (origH - finalH);
            }

            const nextSize = { w: Math.round(finalW), h: Math.round(finalH) };
            setSize(nextSize);

            if (dir.includes('w') || dir.includes('n')) {
                const nextPos = clamp(newX, newY, nextSize.w, nextSize.h);
                setPos(nextPos);
            }
        };

        const onUp = (e) => {
            if (dragRef.current?.pointerId !== undefined && e?.target?.releasePointerCapture) {
                try { e.target.releasePointerCapture(dragRef.current.pointerId); } catch {}
            }
            dragRef.current = null;
            setDragging(false);
            // Cache user's geometry preference
            panelCache.set(cacheKey, { pos: liveRef.current.pos, size: liveRef.current.size });
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
    }, [effectiveMinW, effectiveMinH, keepAspect, aspect, clamp, cacheKey]);

    const recenter = useCallback(() => {
        const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
        const winH = typeof window !== 'undefined' ? window.innerHeight : 600;
        const newPos = {
            x: Math.max(8, Math.round((winW - size.w) / 2)),
            y: Math.max(8, Math.round((winH - size.h) * 0.15)),
        };
        setPos(newPos);
        panelCache.set(cacheKey, { pos: newPos, size });
    }, [size, cacheKey]);

    const isOffscreen = pos.x < 0 || pos.y < 0 || (typeof window !== 'undefined' && (pos.x + size.w > window.innerWidth || pos.y + size.h > window.innerHeight));

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && onClose) {
                e.preventDefault();
                onClose();
                return;
            }
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

            const STEP = e.shiftKey ? 32 : 12;
            if (e.key === 'ArrowLeft') {
                setPos((p) => clamp(p.x - STEP, p.y, size.w, size.h));
            }
            if (e.key === 'ArrowRight') {
                setPos((p) => clamp(p.x + STEP, p.y, size.w, size.h));
            }
            if (e.key === 'ArrowUp') {
                setPos((p) => clamp(p.x, p.y - STEP, size.w, size.h));
            }
            if (e.key === 'ArrowDown') {
                setPos((p) => clamp(p.x, p.y + STEP, size.w, size.h));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, size.w, size.h, clamp]);

    return createPortal(
        <div
            ref={panelRef}
            className={`fixed select-none overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl transition-[box-shadow,border-color] duration-150 flex flex-col ${isMaximized ? 'transition-all duration-200' : ''}`}
            style={{
                left: isMaximized ? 8 : (Number.isFinite(pos.x) ? pos.x : 16),
                top: isMaximized ? 8 : (Number.isFinite(pos.y) ? pos.y : 16),
                width: isMaximized ? 'calc(100vw - 16px)' : (Number.isFinite(size.w) ? `${size.w}px` : 'auto'),
                height: isMaximized ? 'calc(100vh - 16px)' : (Number.isFinite(size.h) ? `${size.h}px` : 'auto'),
                maxWidth: 'calc(100vw - 16px)',
                maxHeight: 'calc(100vh - 16px)',
                zIndex: isMaximized ? 9999 : zIndex,
            }}
            onPointerDownCapture={bringToFront}
            onFocusCapture={bringToFront}
        >
            {/* Transparent shield during drag prevents iframe/monaco gesture eating */}
            {dragging && <div className="absolute inset-0 z-50 cursor-grabbing" />}

            {/* Drag bar */}
            <div
                data-drag-handle
                style={{ touchAction: isMaximized ? 'auto' : 'none' }}
                onPointerDown={isMaximized ? undefined : onDragStart}
                className={`flex h-11 sm:h-10 shrink-0 items-center gap-1.5 sm:gap-2 border-b border-line bg-raised/75 px-2.5 sm:px-3 relative z-20 ${isMaximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                title={isMaximized ? undefined : "Drag to move · arrow keys nudge"}
            >
                <Grip className={`size-3.5 shrink-0 text-subtle ${isMaximized ? 'hidden sm:block opacity-40' : ''}`} />
                {icon}
                <span className="min-w-0 flex-1 truncate text-xs font-medium select-none">{title}</span>

                {/* Header Action Buttons - isolated from drag with high z-index and touch manipulation */}
                <div
                    className="flex items-center gap-1 sm:gap-1.5 shrink-0 relative z-30"
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    {/* Recenter button (hidden when maximized) */}
                    {!isMaximized && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                recenter();
                            }}
                            title="Re-centre on screen"
                            className={`flex size-8 sm:size-7 shrink-0 items-center justify-center rounded-lg transition-colors touch-manipulation active:scale-95
                                ${isOffscreen ? 'bg-accent/20 text-accent-hi hover:bg-accent/30' : 'text-subtle hover:bg-raised hover:text-fg active:bg-raised'}`}
                        >
                            <Locate className="size-4 sm:size-3.5" />
                        </button>
                    )}

                    {/* Maximize / Restore button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMaximize();
                        }}
                        title={isMaximized ? "Restore window size" : "Maximize (Full screen)"}
                        className="flex size-8 sm:size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg active:bg-raised touch-manipulation active:scale-95"
                    >
                        {isMaximized ? <Minimize2 className="size-4 sm:size-3.5" /> : <Maximize2 className="size-4 sm:size-3.5" />}
                    </button>

                    {onExternal && (
                        <a
                            href={onExternal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={onExternal.title || 'Open externally'}
                            className="flex size-8 sm:size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg active:bg-raised touch-manipulation active:scale-95"
                        >
                            {onExternal.icon}
                        </a>
                    )}

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose?.();
                        }}
                        title="Close (Esc)"
                        className="flex size-8 sm:size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/20 active:text-rose-400 touch-manipulation active:scale-95"
                    >
                        <X className="size-4 sm:size-3.5" />
                    </button>
                </div>
            </div>

            {/* Body: cleanly fills remaining panel height without overflow */}
            <div className={`flex-1 min-h-0 w-full overflow-hidden ${bodyClassName}`}>
                {children}
            </div>

            {/* Resize zones: 4 corners + 4 edges (active when not maximized) */}
            {!isMaximized && (
                <>
                    {[
                        // Corners
                        { dir: 'nw', cls: 'left-0 top-0 size-8 sm:size-5 cursor-nwse-resize z-10' },
                        { dir: 'ne', cls: 'right-0 top-0 size-4 cursor-nesw-resize z-10' },
                        { dir: 'sw', cls: 'left-0 bottom-0 size-8 sm:size-5 cursor-nesw-resize z-20' },
                        { dir: 'se', cls: 'right-0 bottom-0 size-11 sm:size-7 cursor-nwse-resize z-30' },
                        // Edges - top edge stops before buttons
                        { dir: 'n', cls: 'left-8 right-32 top-0 h-2 cursor-ns-resize z-10' },
                        { dir: 's', cls: 'left-8 right-8 bottom-0 h-4 sm:h-2 cursor-ns-resize z-20' },
                        { dir: 'w', cls: 'top-12 bottom-8 left-0 w-4 sm:w-2 cursor-ew-resize z-20' },
                        { dir: 'e', cls: 'top-12 bottom-8 right-0 w-4 sm:w-2 cursor-ew-resize z-20' },
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
