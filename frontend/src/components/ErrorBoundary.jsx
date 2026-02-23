import { Component } from 'react';

/** React only supports error boundaries as classes. */
export default class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Unhandled UI error:', error, info);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="rounded-2xl border border-line bg-panel p-8 text-center">
                <h2 className="mb-2 text-xl font-semibold">Something broke</h2>
                <p className="mb-4 text-sm text-subtle">
                    Your saved progress is untouched. Reloading usually fixes it.
                </p>
                <pre className="mx-auto mb-4 max-w-xl whitespace-pre-wrap font-mono text-xs text-rose-400">
                    {String(this.state.error?.message || this.state.error)}
                </pre>
                <button
                    onClick={() => this.setState({ error: null })}
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hi"
                >
                    Try again
                </button>
            </div>
        );
    }
}
