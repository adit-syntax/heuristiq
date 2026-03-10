import { X, ExternalLink, Youtube } from 'lucide-react';
import { getYouTubeId } from '../lib/youtube';
import FloatingPanel from './FloatingPanel';

/**
 * Draggable, resizable in-app YouTube player (single video).
 * Callers only open it when getYouTubeId(url) is set.
 */
const VideoModal = ({ url, title = 'Video solution', onClose }) => {
    const id = getYouTubeId(url);
    if (!id) return null;

    return (
        <FloatingPanel
            title={title}
            icon={<Youtube className="size-4 shrink-0 text-rose-400" />}
            initialWidth={760}
            onClose={onClose}
            onExternal={{ url, title: 'Open on YouTube', icon: <ExternalLink className="size-3.5" /> }}
        >
            <iframe
                src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
            />
        </FloatingPanel>
    );
};

export default VideoModal;
