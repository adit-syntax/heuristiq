import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/** Live local clock. Ticks every second; re-renders only itself. */
const LiveClock = ({ className = '' }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <span className={`inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.25em] text-subtle ${className}`} title={now.toLocaleDateString()}>
            <Clock className="size-3 translate-y-px" />
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
};

export default LiveClock;
