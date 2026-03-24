import React, { useMemo } from 'react';
import { X, Calendar, CheckSquare, FileText, ArrowRight } from 'lucide-react';

const NoteHistory = ({ data, onClose, onSelectDate }) => {
    // Combine and sort dates that have either notes or todos
    const historyItems = useMemo(() => {
        const dates = new Set([
            ...Object.keys(data.dailyNotes || {}),
            ...Object.keys(data.dailyTodos || {})
        ]);

        return Array.from(dates)
            .sort((a, b) => new Date(b) - new Date(a)) // Newest first
            .map(dateStr => {
                const note = data.dailyNotes?.[dateStr] || '';
                const todos = data.dailyTodos?.[dateStr] || [];
                const completedTodos = todos.filter(t => t.completed).length;

                // Format date as a local date to avoid timezone off-by-one.
                const [y, m, d] = dateStr.split('-').map(Number);
                const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });

                return {
                    dateStr,
                    displayDate,
                    notePreview: note.length > 60 ? note.substring(0, 60) + '...' : note,
                    todoCount: todos.length,
                    completedTodos,
                    hasNote: !!note
                };
            });
    }, [data.dailyNotes, data.dailyTodos]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h3 className="flex items-center gap-2.5 font-semibold">
                        <FileText className="size-5 text-accent-hi" />
                        Notes & tasks history
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
                    {historyItems.length > 0 ? (
                        historyItems.map((item) => (
                            <div
                                key={item.dateStr}
                                onClick={() => onSelectDate(item.dateStr)}
                                className="group flex cursor-pointer items-center gap-4 rounded-xl border border-line bg-raised/40 p-4 transition-all hover:border-accent/40 hover:bg-raised"
                            >
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-app/60 text-subtle transition-colors group-hover:border-accent/30 group-hover:text-accent-hi">
                                    <Calendar size={17} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h4 className="mb-0.5 font-semibold">{item.displayDate}</h4>
                                    <div className="flex items-center gap-4 text-xs text-subtle">
                                        {item.todoCount > 0 && (
                                            <span className="flex items-center gap-1">
                                                <CheckSquare size={12} />
                                                {item.completedTodos}/{item.todoCount} tasks
                                            </span>
                                        )}
                                        {item.hasNote && (
                                            <span className="max-w-[200px] truncate italic text-faint md:max-w-xs">
                                                "{item.notePreview}"
                                            </span>
                                        )}
                                        {!item.todoCount && !item.hasNote && (
                                            <span className="italic opacity-50">Empty entry</span>
                                        )}
                                    </div>
                                </div>

                                <ArrowRight
                                    size={18}
                                    className="shrink-0 text-faint transition-all group-hover:translate-x-1 group-hover:text-accent-hi"
                                />
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-subtle">
                            <p>No notes or tasks found in history.</p>
                            <p className="mt-2 text-sm">Start adding daily plans from the calendar!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NoteHistory;
