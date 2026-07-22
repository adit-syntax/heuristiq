import React, { useState } from 'react';
import { X, Check, Plus, Trash2 } from 'lucide-react';

const DayDetails = ({
    dateStr,
    onClose,
    note,
    todos,
    onUpdateNote,
    onAddTodo,
    onToggleTodo,
    onDeleteTodo
}) => {
    // Local state for note editing. The parent keys this component by date,
    // so the note resets naturally when a different day opens.
    const [localNote, setLocalNote] = useState(note || '');
    const [todoInput, setTodoInput] = useState('');

    const handleSaveNote = () => {
        onUpdateNote(dateStr, localNote);
    };

    const handleAddTodo = (e) => {
        e.preventDefault();
        if (!todoInput.trim()) return;
        onAddTodo(dateStr, todoInput);
        setTodoInput('');
    };

    // Format date as a local date to avoid timezone off-by-one.
    const [y, m, d] = dateStr.split('-').map(Number);
    const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h3 className="font-semibold">{displayDate}</h3>
                    <button
                        onClick={onClose}
                        className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                    {/* To-Do Section */}
                    <div className="border-b border-line p-5">
                        <h4 className="mb-3.5 text-xs font-semibold uppercase tracking-widest text-subtle">Tasks</h4>

                        <form onSubmit={handleAddTodo} className="mb-4 flex gap-2">
                            <input
                                type="text"
                                value={todoInput}
                                onChange={e => setTodoInput(e.target.value)}
                                placeholder="Add a task for this day..."
                                className="flex-1 rounded-xl border border-line bg-app/60 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="rounded-xl bg-accent px-3.5 text-white transition-colors hover:bg-accent-hi"
                                title="Add task"
                            >
                                <Plus size={18} className="mx-auto" />
                            </button>
                        </form>

                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                            {todos && todos.length > 0 ? (
                                todos.map(todo => (
                                    <div
                                        key={todo.id}
                                        className="group flex items-start gap-3 rounded-xl border border-line bg-raised/40 p-3 transition-colors hover:border-accent/30"
                                    >
                                        <button
                                            onClick={() => onToggleTodo(dateStr, todo.id)}
                                            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${todo.completed
                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                    : 'border-subtle text-transparent hover:border-accent'
                                                }`}
                                        >
                                            <Check size={13} strokeWidth={3} />
                                        </button>
                                        <span className={`flex-1 text-sm leading-relaxed ${todo.completed ? 'text-subtle line-through' : 'text-fg'}`}>
                                            {todo.text}
                                        </span>
                                        <button
                                            onClick={() => onDeleteTodo(dateStr, todo.id)}
                                            className="p-1 text-subtle opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-xl border border-dashed border-line py-6 text-center text-sm italic text-subtle">
                                    No tasks for this day
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="p-5">
                        <div className="mb-3.5 flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-widest text-subtle">Notes</h4>
                            {localNote !== note && (
                                <span className="animate-pulse text-xs font-medium text-amber-500">
                                    Unsaved changes...
                                </span>
                            )}
                        </div>
                        <textarea
                            value={localNote}
                            onChange={e => setLocalNote(e.target.value)}
                            onBlur={handleSaveNote}
                            placeholder="Approach ideas, mistakes to avoid, links to revisit..."
                            className="h-40 w-full resize-none rounded-xl border border-line bg-app/60 p-4 text-sm leading-relaxed text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none"
                        />
                        <p className="mt-2 text-right text-xs text-subtle">
                            Click outside to save automatically
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayDetails;
