import { useState } from 'react';
import { SquareCode, PictureInPicture2, Pin } from 'lucide-react';
import CodeEditor from './CodeEditor';
import FloatingPanel from './FloatingPanel';

/** Scratch code editor not tied to any question. Can float as a resizable,
 *  draggable panel (8-way resize) so you can code beside any tab. */
const Playground = ({ theme }) => {
    const [floating, setFloating] = useState(false);

    const editor = <CodeEditor storageKey="playground" theme={theme} />;

    return (
        <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-5 px-1 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-11 sm:size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20">
                        <SquareCode className="size-5 sm:size-7 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-fg truncate sm:whitespace-normal">Code Playground</h1>
                        <p className="text-xs sm:text-base text-subtle truncate sm:whitespace-normal">Write, run and keep scratch code. C++, Python, Java, JS and C.</p>
                    </div>
                </div>
                <button
                    onClick={() => setFloating((v) => !v)}
                    title={floating ? 'Dock the editor back into the page' : 'Pop the editor out - drag and resize anywhere'}
                    className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2 text-xs sm:text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg shrink-0"
                >
                    {floating ? <Pin className="size-4" /> : <PictureInPicture2 className="size-4" />}
                    {floating ? 'Dock editor' : 'Float editor'}
                </button>
            </div>

            {floating ? (
                <FloatingPanel
                    title="Code Playground"
                    icon={<SquareCode className="size-4 shrink-0 text-accent-hi" />}
                    initialWidth={typeof window !== 'undefined' ? Math.min(860, window.innerWidth - 16) : 860}
                    initialHeight={typeof window !== 'undefined' ? Math.min(620, window.innerHeight - 80) : 620}
                    minW={300}
                    minH={240}
                    keepAspect={false}
                    allowOffscreen
                    onClose={() => setFloating(false)}
                    bodyClassName="overflow-y-auto"
                >
                    <div className="h-full p-2">
                        <CodeEditor storageKey="playground" theme={theme} fill />
                    </div>
                </FloatingPanel>
            ) : (
                editor
            )}
        </div>
    );
};

export default Playground;
