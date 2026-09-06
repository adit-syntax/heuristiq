import { useState, useMemo, useEffect, useRef } from 'react';
import {
    PlayCircle, ExternalLink, Search, CheckCircle2, Circle,
    PictureInPicture2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Locate,
} from 'lucide-react';
import { videoPlaylists } from '../data/dsaResources';
import { A2Z_PLAYLIST } from '../data/a2zPlaylist';
import useSyncedDoc from '../hooks/useSyncedDoc';
import { SyncBadge } from './Notes';
import FloatingPanel from './FloatingPanel';

const EMPTY = { watched: {} };
const SLIDER_STEP = 300; // px per arrow click

const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/**
 * Video course tracker: full Striver A2Z playlist (315 videos) with watched
 * state. Videos are a vertical, arrow-scrollable column beside the pinned
 * player; "pop out" floats the player anywhere in the window (it can leave
 * the viewport entirely - the Locate button re-centres it).
 */
const CourseVideos = () => {
    const [doc, setDoc, { loading, status }] = useSyncedDoc('videos', EMPTY);
    const [current, setCurrent] = useState(null);   // video id playing (null = nothing yet)
    const [popped, setPopped] = useState(false);    // player mode: pinned (default) | floating
    const [query, setQuery] = useState('');
    const [hideWatched, setHideWatched] = useState(false);
    const listRef = useRef(null);

    const playlist = videoPlaylists[0];
    const videos = A2Z_PLAYLIST;

    const watchedCount = useMemo(
        () => videos.filter((v) => doc.watched?.[v.id]).length,
        [videos, doc.watched]
    );
    const progress = videos.length ? Math.round((watchedCount / videos.length) * 100) : 0;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return videos.filter((v) =>
            (!hideWatched || !doc.watched?.[v.id]) &&
            (!q || v.title.toLowerCase().includes(q))
        );
    }, [videos, query, hideWatched, doc.watched]);

    const currentIdx = current ? videos.findIndex((v) => v.id === current) : -1;
    const currentVideo = currentIdx >= 0 ? videos[currentIdx] : null;
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx >= 0 && currentIdx < videos.length - 1;

    const play = (video) => {
        setCurrent(video.id);
        if (!doc.watched?.[video.id]) {
            setDoc((prev) => ({ ...prev, watched: { ...prev.watched, [video.id]: true } }));
        }
    };

    const step = (dir) => {
        const next = currentIdx + dir;
        if (next >= 0 && next < videos.length) play(videos[next]);
    };

    const toggleWatched = (id, isWatched) => {
        setDoc((prev) => {
            const watched = { ...prev.watched };
            if (isWatched) delete watched[id];
            else watched[id] = true;
            return { ...prev, watched };
        });
    };

    const slide = (dir) => listRef.current?.scrollBy({ top: dir * SLIDER_STEP, behavior: 'smooth' });

    // Keep the playing card in view when the video changes.
    useEffect(() => {
        if (!current) return;
        document.querySelector(`[data-vid="${current}"]`)
            ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [current]);

    // Built only while a video is selected - `currentVideo` is null until then.
    const playerBody = currentVideo ? (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 bg-black">
                <iframe
                    key={currentVideo.id}
                    src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&rel=0`}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-3 py-2">
                <span className="truncate font-mono text-[11px] text-subtle">
                    #{currentIdx + 1} / {videos.length}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                    <button
                        onClick={() => step(-1)}
                        disabled={!hasPrev}
                        title="Previous video"
                        className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg disabled:opacity-40"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        onClick={() => step(1)}
                        disabled={!hasNext}
                        title="Next video"
                        className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg disabled:opacity-40"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{playlist.name}</h2>
                        <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-xs text-subtle">{videos.length} videos</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-raised">
                            <div
                                className="h-full rounded-full bg-accent transition-[width] duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="shrink-0 font-mono text-xs text-subtle">
                            {watchedCount}/{videos.length} watched ({progress}%)
                        </span>
                    </div>
                </div>
                <SyncBadge status={status} loading={loading} />
                <a
                    href={`https://www.youtube.com/playlist?list=${playlist.listId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-raised/50 px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                >
                    YouTube <ExternalLink className="size-3.5" />
                </a>
            </div>

            {/* Layout: pinned player + vertical list beside it */}
            <div className="flex gap-4">
                {/* Left: player (sticky while the list scrolls) */}
                <div className="min-w-0 flex-1">
                    {currentVideo ? (
                        <div className="sticky top-16 z-20 md:top-2">
                            <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
                                <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                                    <PlayCircle className="size-5 shrink-0 text-accent-hi" />
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{currentVideo.title}</span>
                                    {popped ? (
                                        <button
                                            onClick={() => setPopped(false)}
                                            title="Re-attach player to the page"
                                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                                        >
                                            <Locate className="size-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setPopped(true)}
                                            title="Pop out - drag anywhere in the window, even off-screen"
                                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                                        >
                                            <PictureInPicture2 className="size-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="aspect-video w-full bg-black">
                                    {popped ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-3 bg-panel/30 p-6 text-center text-subtle">
                                            <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-hi shadow-inner">
                                                <PictureInPicture2 className="size-7 animate-pulse" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-fg">Playing in floating window</p>
                                                <p className="max-w-xs text-xs text-subtle">
                                                    Video is popped out and draggable anywhere on screen.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setPopped(false)}
                                                className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-raised px-4 py-2 text-xs font-medium text-fg transition-all hover:bg-panel hover:scale-[1.02]"
                                            >
                                                <Locate className="size-3.5 text-accent-hi" />
                                                Dock video back here
                                            </button>
                                        </div>
                                    ) : (
                                        playerBody
                                    )}
                                </div>
                            </div>
                            {!popped && (
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={() => step(-1)}
                                        disabled={!hasPrev}
                                        className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3.5 py-2 text-sm text-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-40"
                                    >
                                        <ChevronLeft className="size-4" /> Prev
                                    </button>
                                    <button
                                        onClick={() => step(1)}
                                        disabled={!hasNext}
                                        className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-40"
                                    >
                                        Next <ChevronRight className="size-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/50 p-8 text-center">
                            <PlayCircle className="size-10 text-faint" />
                            <p className="font-medium">Pick a video from the list</p>
                            <p className="text-sm text-subtle">
                                It plays pinned here - or pop it out and drag it anywhere in the window.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right: vertical slider */}
                <div className="flex w-64 shrink-0 flex-col sm:w-72">
                    {/* Controls */}
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search videos..."
                            className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
                        />
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                        <button
                            onClick={() => setHideWatched((h) => !h)}
                            className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors
                                ${hideWatched ? 'border-accent/30 bg-accent/15 text-accent-hi' : 'border-line bg-panel text-subtle hover:text-fg'}`}
                        >
                            {hideWatched ? 'Unwatched only' : 'Hide watched'}
                        </button>
                        <button
                            onClick={() => slide(-1)}
                            title="Scroll up"
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-subtle transition-colors hover:text-fg"
                        >
                            <ChevronUp className="size-4" />
                        </button>
                        <button
                            onClick={() => slide(1)}
                            title="Scroll down"
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-subtle transition-colors hover:text-fg"
                        >
                            <ChevronDown className="size-4" />
                        </button>
                    </div>

                    {/* Scroll column */}
                    <div
                        ref={listRef}
                        className="scrollbar-hide max-h-[70vh] min-h-[320px] flex-1 snap-y snap-proximity overflow-y-auto rounded-2xl border border-line bg-panel"
                    >
                        {visible.length === 0 && (
                            <p className="px-4 py-10 text-center text-sm text-subtle">
                                {videos.every((v) => doc.watched?.[v.id]) ? 'Every video watched. Legend.' : 'No matches.'}
                            </p>
                        )}
                        {visible.map((v) => {
                            const idx = videos.indexOf(v);
                            const isWatched = Boolean(doc.watched?.[v.id]);
                            const isCurrent = v.id === current;
                            return (
                                <div
                                    key={v.id}
                                    data-vid={v.id}
                                    onClick={() => play(v)}
                                    className={`group flex cursor-pointer snap-start items-start gap-3 border-b border-line/50 p-2.5 transition-colors
                                        ${isCurrent ? 'bg-accent/10' : 'hover:bg-raised/40'}`}
                                >
                                    <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-raised">
                                        <img
                                            src={thumb(v.id)}
                                            alt={v.title}
                                            loading="lazy"
                                            className={`h-full w-full object-cover ${isWatched && !isCurrent ? 'opacity-50' : ''}`}
                                        />
                                        {v.duration && (
                                            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 font-mono text-[9px] text-white">
                                                {v.duration}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`line-clamp-2 text-xs leading-snug ${isWatched && !isCurrent ? 'text-subtle' : 'text-fg'}`}>
                                            <span className="mr-1 font-mono text-faint">{idx + 1}</span>
                                            {v.title}
                                        </p>
                                        {isCurrent && (
                                            <span className="mt-1 inline-block text-[10px] font-medium text-accent-hi">Playing</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleWatched(v.id, isWatched); }}
                                        title={isWatched ? 'Mark unwatched' : 'Mark watched'}
                                        className="shrink-0 self-center transition-transform hover:scale-110"
                                    >
                                        {isWatched
                                            ? <CheckCircle2 className="size-5 text-accent-hi" />
                                            : <Circle className="size-5 text-faint group-hover:text-subtle" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Floating player - draggable anywhere in the window (even off-screen) */}
            {currentVideo && popped && (
                <FloatingPanel
                    title={currentVideo.title}
                    icon={<PlayCircle className="size-4 shrink-0 text-accent-hi" />}
                    initialWidth={720}
                    allowOffscreen
                    onClose={() => setPopped(false)}
                    onExternal={{
                        url: `https://www.youtube.com/watch?v=${currentVideo.id}&list=${playlist.listId}`,
                        title: 'Open on YouTube',
                        icon: <ExternalLink className="size-3.5" />,
                    }}
                >
                    {playerBody}
                </FloatingPanel>
            )}

            <p className="px-1 text-xs text-subtle">
                Click a video to play it (marks it watched); click the circle to toggle without playing.
                Popped-out players can be dragged anywhere - fully off-screen too - the Locate button re-attaches it.
            </p>
        </div>
    );
};

export default CourseVideos;
