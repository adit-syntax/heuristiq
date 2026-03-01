import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

// Firestore rejects documents over 1 MiB. Stay under it and keep the local copy.
const MAX_CLOUD_BYTES = 900_000;

const localKey = (name, userId) => `preptracker-${name}-${userId || 'guest'}`;

const readLocal = (name, userId, fallback) => {
    try {
        const stored = localStorage.getItem(localKey(name, userId));
        return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
    } catch {
        return fallback;
    }
};

const writeLocal = (name, userId, value) => {
    try {
        localStorage.setItem(localKey(name, userId), JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Local save failed (storage full?):', e);
        return false;
    }
};

/**
 * localStorage-first document that debounce-syncs to
 * `users/{uid}/data/{name}` for signed-in users. Guests stay local.
 *
 * Values must be JSON-serialisable and free of nested arrays (Firestore
 * rejects those) - callers store complex shapes as JSON strings.
 */
export default function useSyncedDoc(name, defaultValue) {
    const { user, isGuest } = useAuth();
    const userId = user?.id || 'guest';
    const cloudEnabled = Boolean(user && !isGuest && db);

    const [value, setValue] = useState(() => defaultValue);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('idle'); // idle | syncing | error | too-large
    const timerRef = useRef(null);
    const readyRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        readyRef.current = false;
        setLoading(true);

        const load = async () => {
            const local = readLocal(name, userId, defaultValue);

            if (!cloudEnabled) {
                if (!cancelled) setValue(local);
            } else {
                try {
                    const snap = await getDoc(doc(db, 'users', userId, 'data', name));
                    const next = snap.exists() ? { ...defaultValue, ...snap.data() } : local;
                    if (!cancelled) setValue(next);
                    writeLocal(name, userId, next);
                } catch (error) {
                    console.error(`Load "${name}" failed, using local copy:`, error);
                    if (!cancelled) setValue(local);
                }
            }

            if (!cancelled) {
                setLoading(false);
                readyRef.current = true;
            }
        };

        load();
        return () => {
            cancelled = true;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // defaultValue is a caller-owned constant; re-running on identity change
        // would reload on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, userId, cloudEnabled]);

    const push = useCallback(async (next) => {
        if (JSON.stringify(next).length > MAX_CLOUD_BYTES) {
            setStatus('too-large');
            return;
        }
        setStatus('syncing');
        try {
            await setDoc(doc(db, 'users', userId, 'data', name), next);
            setStatus('idle');
        } catch (error) {
            console.error(`Sync "${name}" failed:`, error);
            setStatus('error');
        }
    }, [name, userId]);

    const update = useCallback((updater) => {
        setValue((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            writeLocal(name, userId, next);

            if (cloudEnabled && readyRef.current) {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => push(next), 1000);
            }
            return next;
        });
    }, [name, userId, cloudEnabled, push]);

    return [value, update, { loading, status }];
}
