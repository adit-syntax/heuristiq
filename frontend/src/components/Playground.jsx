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
        <div className="space-y-5 px-1 sm:px-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <SquareCode className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Code Playground</h1>
                        <p className="text-sm text-subtle sm:text-base">Write, run and keep scratch code. C++, Python, Java, JS and C.</p>
                    </div>
                </div>
                <button
                    onClick={() => setFloating((v) => !v)}
                    title={floating ? 'Dock the editor back into the page' : 'Pop the editor out - drag and resize anywhere'}
                    className="flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                >
                    {floating ? <Pin className="size-4" /> : <PictureInPicture2 className="size-4" />}
                    {floating ? 'Dock editor' : 'Float editor'}
                </button>
            </div>

            {floating ? (
                <FloatingPanel
                    title="Code Playground"
                    icon={<SquareCode className="size-4 shrink-0 text-accent-hi" />}
                    initialWidth={860}
                    initialHeight={620}
                    minW={480}
                    minH={360}
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
