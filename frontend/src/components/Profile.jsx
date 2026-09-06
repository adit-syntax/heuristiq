import { useState, useEffect, useRef } from 'react';
import {
    UserRound, Camera, Check, ExternalLink, Cloud, CloudOff, Loader2, Link2, RefreshCw, Info,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import useToast from '../hooks/useToast';

// Coding profile links shown as editable handles. value = username/handle.
const CODING_SITES = [
    { key: 'leetcode', label: 'LeetCode', url: (h) => `https://leetcode.com/u/${h}/`, color: 'text-amber-500' },
    { key: 'codeforces', label: 'Codeforces', url: (h) => `https://codeforces.com/profile/${h}`, color: 'text-sky-500' },
    { key: 'codechef', label: 'CodeChef', url: (h) => `https://www.codechef.com/users/${h}`, color: 'text-emerald-500' },
    { key: 'github', label: 'GitHub', url: (h) => `https://github.com/${h}`, color: 'text-fg' },
];

const Profile = ({ markSolvedBatch }) => {
    const { user, isGuest, isFirebaseConfigured } = useAuth();
    const { toast } = useToast();
    const fileRef = useRef(null);

    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    const [handles, setHandles] = useState({});
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Load the profile doc (Firestore for signed-in, localStorage for guests).
    useEffect(() => {
        let live = true;
        const load = async () => {
            let p = {};
            try {
                if (isFirebaseConfigured && user && !isGuest && db) {
                    const snap = await getDoc(doc(db, 'users', user.id, 'data', 'profile'));
                    if (snap.exists()) p = snap.data();
                } else {
                    p = JSON.parse(localStorage.getItem(`preptracker-profile-${user?.id || 'guest'}`) || '{}');
                }
            } catch { /* offline - start empty */ }
            if (!live) return;
            setName(p.name || user?.name || '');
            setBio(p.bio || '');
            setAvatar(p.avatar || user?.photoURL || '');
            setHandles(p.handles || {});
            setLoaded(true);
        };
        load();
        return () => { live = false; };
    }, [user, isGuest, isFirebaseConfigured]);

    const persist = async (next) => {
        // Always keep a local mirror (the sidebar reads it for the avatar);
        // Firestore is the source of truth for signed-in users.
        try {
            localStorage.setItem(`preptracker-profile-${user?.id || 'guest'}`, JSON.stringify(next));
        } catch { /* full */ }
        if (isFirebaseConfigured && user && !isGuest && db) {
            await setDoc(doc(db, 'users', user.id, 'data', 'profile'), next, { merge: true });
        }
    };

    const save = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast('Name cannot be empty', { kind: 'danger' });
            return;
        }
        setSaving(true);
        try {
            const next = { name: trimmed, bio: bio.trim(), avatar, handles, updatedAt: new Date().toISOString() };
            await persist(next);
            // Keep the auth displayName in step
            if (auth?.currentUser && !isGuest) {
                await updateProfile(auth.currentUser, {
                    displayName: trimmed,
                }).catch(() => { /* non-fatal */ });
            }
            // Notify other components (like sidebar) immediately
            window.dispatchEvent(new CustomEvent('profile-updated', { detail: next }));
            toast('Profile saved');
        } catch (e) {
            toast('Could not save profile', { detail: String(e.message || e), kind: 'danger' });
        }
        setSaving(false);
    };

    // Avatar: read file -> downscale to max 256x256 JPEG data URL (~20-40 KB)
    const onAvatarPick = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast('Pick an image file', { kind: 'danger' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 256;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setAvatar(dataUrl);
                toast('Avatar staged - hit Save to keep it', { kind: 'info' });
            };
            img.onerror = () => {
                toast('Could not load image', { kind: 'danger' });
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const cleanHandle = (site, val) => {
        let s = (val || '').trim();
        if (site === 'leetcode') {
            s = s.replace(/^(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([^/?#]+).*$/i, '$1');
        } else if (site === 'codeforces') {
            s = s.replace(/^(?:https?:\/\/)?(?:www\.)?codeforces\.com\/(?:profile\/)?([^/?#]+).*$/i, '$1');
        } else if (site === 'codechef') {
            s = s.replace(/^(?:https?:\/\/)?(?:www\.)?codechef\.com\/(?:users\/)?([^/?#]+).*$/i, '$1');
        } else if (site === 'github') {
            s = s.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+).*$/i, '$1');
        }
        return s.replace(/^@/, '');
    };

    const setHandle = (key, value) => {
        const cleaned = cleanHandle(key, value);
        setHandles((h) => {
            const next = { ...h, [key]: cleaned };
            // Auto-persist handle so user doesn't need to manually click Save changes first
            persist({ name, bio, avatar, handles: next, updatedAt: new Date().toISOString() }).catch(() => {});
            return next;
        });
    };

    const canSync = isFirebaseConfigured && !isGuest;

    const inputClass = 'w-full rounded-xl border border-line bg-raised/40 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none';

    if (!loaded) {
        return <p className="py-24 text-center text-subtle">Loading profile...</p>;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-hi to-accent-deep shadow-lg shadow-accent/20 sm:size-14">
                        <UserRound className="size-6 text-white sm:size-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
                        <p className="flex items-center gap-1.5 text-sm text-subtle">
                            {canSync ? <Cloud className="size-4" /> : <CloudOff className="size-4" />}
                            {canSync ? 'Synced to your account' : 'Saved on this device only'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-50 sm:self-auto"
                >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Save changes
                </button>
            </div>

            {/* Identity card */}
            <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    {/* Avatar */}
                    <div className="relative mx-auto size-24 shrink-0 sm:mx-0">
                        {avatar ? (
                            <img src={avatar} alt="avatar" className="size-full rounded-2xl border border-line object-cover" />
                        ) : (
                            <div className="flex size-full items-center justify-center rounded-2xl border border-line bg-raised font-mono text-2xl font-semibold text-accent-hi">
                                {(name || 'H').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                        )}
                        <button
                            onClick={() => fileRef.current?.click()}
                            title="Upload profile picture"
                            className="absolute -bottom-1.5 -right-1.5 flex size-8 items-center justify-center rounded-xl border border-line bg-panel text-muted shadow-lg transition-colors hover:text-fg"
                        >
                            <Camera className="size-4" />
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
                        {avatar && (
                            <button
                                onClick={() => setAvatar('')}
                                title="Remove picture"
                                className="absolute -bottom-1.5 left-[-1.5] rounded-lg bg-panel px-1.5 py-0.5 text-[10px] text-subtle shadow-lg transition-colors hover:text-rose-400"
                            >
                                clear
                            </button>
                        )}
                    </div>

                    {/* Name + email + bio */}
                    <div className="min-w-0 flex-1 space-y-3.5">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">Display name</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Third-year CSE. Target: backend roles. 300 problems deep."
                                rows={2}
                                className={`${inputClass} resize-y`}
                            />
                        </div>
                        {user?.email && <p className="truncate text-xs text-subtle">{user.email}</p>}
                    </div>
                </div>
            </div>

            {/* Coding profiles */}
            <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                    <Link2 className="size-4 text-accent-hi" />
                    <h2 className="text-sm font-semibold text-muted">Coding profiles</h2>
                    <span className="text-xs text-faint">usernames - links are built for you</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {CODING_SITES.map((s) => {
                        const handle = handles[s.key] || '';
                        return (
                            <div key={s.key}>
                                <label className="mb-1.5 block text-xs font-medium text-muted">{s.label}</label>
                                <div className="relative">
                                    <input
                                        value={handle}
                                        onChange={(e) => setHandle(s.key, e.target.value)}
                                        placeholder={`your ${s.label} username`}
                                        className={`${inputClass} pr-9`}
                                    />
                                    {handle && (
                                        <a
                                            href={s.url(handle)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Open ${s.label} profile`}
                                            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:text-fg"
                                        >
                                            <ExternalLink className="size-3.5" />
                                        </a>
                                    )}
                                </div>
                                {s.key === 'leetcode' && (
                                    <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-relaxed text-amber-400/90">
                                        <Info className="mt-0.5 size-3.5 shrink-0" />
                                        <span>LeetCode only exposes your <strong>last 20 accepted submissions</strong> via public API. Try to sync regularly after solving sessions to keep your profile updated.</span>
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Coding profile sync */}
            <SyncCard handles={handles} markSolvedBatch={markSolvedBatch} toast={toast} />
        </div>
    );
};

/** Pull accepted submissions from the linked coding profiles and mark the
 *  matching questions solved across every sheet and company list (via the
 *  canonical lc:/cf: keys). Imported history never touches streaks. */
const SyncCard = ({ handles, markSolvedBatch, toast }) => {
    const [syncing, setSyncing] = useState(null); // 'leetcode' | 'codeforces'

    const syncLeetcode = async () => {
        let u = (handles.leetcode || '').trim();
        u = u.replace(/^(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([^/?#]+).*$/i, '$1').replace(/^@/, '');
        if (!u) {
            toast('Add your LeetCode username above first', { kind: 'danger' });
            return;
        }
        setSyncing('leetcode');
        try {
            // Public recent-accepted list (the same query leetcode.com uses).
            const r = await fetch('/lc-graphql/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'query($u: String!) { recentAcSubmissionList(username: $u) { titleSlug } }',
                    variables: { u },
                }),
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            if (j.errors && j.errors.length > 0) {
                throw new Error(j.errors[0]?.message || 'GraphQL Error');
            }
            const slugs = (j.data?.recentAcSubmissionList || []).map((s) => s.titleSlug);
            if (slugs.length === 0) throw new Error('No public accepted submissions found for that username');
            const res = markSolvedBatch(slugs.map((s) => `lc:${s}`));
            if (res.added === 0 && res.already === 0) {
                toast(`LeetCode checked ${slugs.length} recent problems`, {
                    detail: `Found your 20 most recent submissions, but none matched questions in the current sheets.`,
                    kind: 'info',
                });
            } else {
                toast(`LeetCode sync: ${res.added} marked solved`, {
                    detail: `${res.already} already solved · scanned your ${slugs.length} most recent accepted problems`,
                    kind: res.added > 0 ? 'success' : 'info',
                });
            }
        } catch (e) {
            toast('LeetCode sync failed', { detail: String(e.message || e).slice(0, 120), kind: 'danger' });
        }
        setSyncing(null);
    };

    const syncCodeforces = async () => {
        const u = handles.codeforces?.trim();
        if (!u) {
            toast('Add your Codeforces handle above first', { kind: 'danger' });
            return;
        }
        setSyncing('codeforces');
        try {
            const r = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(u)}&from=1&count=2000`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            if (j.status !== 'OK') throw new Error(j.comment || 'user not found');
            const keys = j.result
                .filter((s) => s.verdict === 'OK' && s.problem?.contestId && s.problem?.index)
                .map((s) => `cf:${s.problem.contestId}${s.problem.index}`);
            if (keys.length === 0) throw new Error('No accepted submissions found');
            const res = markSolvedBatch(keys);
            toast(`Codeforces sync: ${res.added} marked solved`, {
                detail: `${res.already} already solved · last ${Math.min(keys.length, 2000)} submissions scanned`,
                kind: res.added > 0 ? 'success' : 'info',
            });
        } catch (e) {
            toast('Codeforces sync failed', { detail: String(e.message || e).slice(0, 120), kind: 'danger' });
        }
        setSyncing(null);
    };

    return (
        <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
            <div className="mb-2 flex items-center gap-2">
                <RefreshCw className={`size-4 text-accent-hi ${syncing ? 'animate-spin' : ''}`} />
                <h2 className="text-sm font-semibold text-muted">Sync solved from coding profiles</h2>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-subtle">
                Fetches your accepted submissions and marks matching questions solved across every
                sheet and company list.
                <span className="mt-1 flex items-start gap-1 text-amber-400/90">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    <span><strong>Note on LeetCode:</strong> Syncs your 20 most recent accepted submissions. Sync regularly after practice to ensure all solves are recorded.</span>
                </span>
            </p>
            <div className="flex flex-wrap gap-2.5">
                <button
                    onClick={syncLeetcode}
                    disabled={!!syncing}
                    className="flex items-center gap-2 rounded-xl border border-line bg-raised/50 px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-raised disabled:opacity-50"
                >
                    {syncing === 'leetcode' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Sync LeetCode
                </button>
                <button
                    onClick={syncCodeforces}
                    disabled={!!syncing}
                    className="flex items-center gap-2 rounded-xl border border-line bg-raised/50 px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-raised disabled:opacity-50"
                >
                    {syncing === 'codeforces' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Sync Codeforces
                </button>
                <span className="self-center text-xs text-faint">CodeChef has no public submissions API</span>
            </div>
        </div>
    );
};

export default Profile;
