import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** The sign-in / register card (email + Google OAuth). Rendered inside the
 *  landing page's auth section. */
const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, signup, loginWithGoogle, continueAsGuest } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email || !password || (!isLogin && !name)) {
            setError('Please fill in all fields');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setIsLoading(false);
            return;
        }

        let result;
        if (isLogin) {
            result = await login(email, password);
        } else {
            result = await signup(name, email, password);
        }

        if (!result.success) {
            setError(result.error);
        }

        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        const result = await loginWithGoogle();
        if (!result.success) {
            setError(result.error);
        }
        setIsLoading(false);
    };

    const inputClass = 'w-full rounded-xl border border-line bg-app/60 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none';

    return (
        <div className="w-full max-w-md animate-fade-in">
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-2xl sm:p-8">
                <h2 className="text-lg font-semibold">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="mt-1 text-sm text-subtle">
                    {isLogin ? 'Sign in to sync your progress' : 'Start tracking in minutes'}
                </p>

                {/* Google OAuth */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-raised/50 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-raised disabled:opacity-50"
                >
                    <svg viewBox="0 0 18 18" className="size-4.5" aria-hidden="true">
                        <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.91-2.258c-.805.54-1.835.859-3.046.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"/>
                        <path fill="#FBBC05" d="M3.963 10.706A5.414 5.414 0 0 1 3.681 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.345l2.581-2.581C13.464.892 11.427 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"/>
                    </svg>
                    Continue with Google
                </button>

                <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-xs text-subtle">or with email</span>
                    <span className="h-px flex-1 bg-line" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted">Full name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ada Lovelace"
                                    className={`${inputClass} pl-10`}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className={`${inputClass} pl-10`}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 6 characters"
                                className={`${inputClass} pl-10`}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-50"
                    >
                        {isLoading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
                        {!isLoading && <ArrowRight className="size-4" />}
                    </button>
                </form>

                <div className="mt-5 text-center text-sm text-subtle">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="font-medium text-accent-hi hover:underline"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </div>
            </div>

            <button
                onClick={continueAsGuest}
                className="mt-4 w-full rounded-xl border border-dashed border-line py-2.5 text-sm text-subtle transition-colors hover:border-accent/40 hover:text-fg"
            >
                Continue as guest — data stays on this device
            </button>
        </div>
    );
};

export default AuthPage;
