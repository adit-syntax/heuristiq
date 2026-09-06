import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/** Live local clock. Ticks every second; re-renders only itself. */
const LiveClock = ({
    className = 'inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-raised/50 px-2.5 font-mono text-xs font-medium uppercase tracking-wider text-subtle leading-none',
    showIcon = true,
}) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <span className={className} title={now.toLocaleDateString()}>
            {showIcon && <Clock className="size-3.5 shrink-0 text-accent-hi" />}
            <span className="leading-none">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </span>
    );
};

export default LiveClock;
