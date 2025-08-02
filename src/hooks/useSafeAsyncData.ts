/**
 * Universal Safe Async Data Hook
 * Eliminates async data fetching duplication across components
 * Prevents infinite loops, handles errors, provides loading states
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncDataState<T> {
    _data: T;
    loading: boolean;
    _error: string | null;
    refetch: () => Promise<void>;
    isStale: boolean;
}

interface AsyncDataOptions {
    retryCount?: number;
    retryDelay?: number;
    onError?: (_error: Error) => void;
    onSuccess?: (_data: unknown) => void;
    enabled?: boolean;
    staleTime?: number; // ms
}

/**
 * Safe async data fetching hook that prevents the patterns causing infinite loops
 * in team/page.tsx, use-dashboard-data.ts, useSubscription.ts, etc.
 */
export function useSafeAsyncData<T>(
    fetchFn: () => Promise<T>,
    dependencies: React.DependencyList,
    defaultValue: T,
    options: AsyncDataOptions = {}
): AsyncDataState<T> {
    const [_data, setData] = useState<T>(defaultValue);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [isStale, setIsStale] = useState(true);

    const isMountedRef = useRef(true);
    const retryCountRef = useRef(0);
    const lastFetchRef = useRef<number>(0);

    const {
        retryCount = 3,
        retryDelay = 1000,
        onError,
        onSuccess,
        enabled = true,
        staleTime = 5 * 60 * 1000 // 5 minutes default
    } = options;

    // Stable fetch function that prevents infinite loops
    const fetchData = useCallback(async () => {
        if (!isMountedRef.current || !enabled) return;

        try {
            setLoading(true);
            setError(null);

            const result = await fetchFn();

            if (isMountedRef.current) {
                setData(_result);
                setIsStale(false);
                lastFetchRef.current = Date.now();
                retryCountRef.current = 0;
                onSuccess?.(_result);
            }
        } catch (err) {
            if (!isMountedRef.current) return;

            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

            // Retry logic with exponential backoff
            if (retryCountRef.current < retryCount) {
                retryCountRef.current++;
                console.warn(`Retrying request (${retryCountRef.current}/${retryCount}):`, errorMessage);

                setTimeout(() => {
                    if (isMountedRef.current) {
                        fetchData();
                    }
                }, retryDelay * Math.pow(2, retryCountRef.current - 1)); // Exponential backoff
            } else {
                setError(errorMessage);
                onError?.(err instanceof Error ? err : new Error(errorMessage));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [fetchFn, retryCount, retryDelay, onError, onSuccess, enabled]);

    // Effect with proper dependency management - prevents infinite loops
    useEffect(() => {
        isMountedRef.current = true;

        // Check if data is stale
        const now = Date.now();
        const dataAge = now - lastFetchRef.current;

        if (dataAge > staleTime) {
            setIsStale(true);
        }

        // Only fetch if enabled and (no data or data is stale)
        if (enabled && (data === defaultValue || isStale)) {
            fetchData();
        }

        return () => {
            isMountedRef.current = false;
        };
    }, [...dependencies, enabled, isStale]); // Carefully controlled dependencies

    // Manual refetch function
    const refetch = useCallback(async () => {
        retryCountRef.current = 0;
        setIsStale(true);
        await fetchData();
    }, [fetchData]);

    // Mark data as stale after staleTime
    useEffect(() => {
        if (!isStale) {
            const timer = setTimeout(() => {
                setIsStale(true);
            }, staleTime);

            return () => clearTimeout(timer);
        }
    }, [isStale, staleTime]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return { _data, loading, _error, refetch, isStale };
}

/**
 * Hook specifically for Firestore real-time subscriptions
 * Prevents the subscription loops in use-dashboard-data.ts
 */
export function useSafeFirestoreSubscription<T>(
    subscriptionFn: (callback: (_data: T) => void) => () => void,
    dependencies: React.DependencyList,
    defaultValue: T,
    options: Pick<AsyncDataOptions, 'onError' | 'onSuccess' | 'enabled'> = {}
): Omit<AsyncDataState<T>, 'refetch'> {
    const [_data, setData] = useState<T>(defaultValue);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);

    const isMountedRef = useRef(true);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const { onError, onSuccess, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        isMountedRef.current = true;
        setLoading(true);
        setError(null);

        console.log('🔄 Setting up Firestore subscription');

        try {
            const unsubscribe = subscriptionFn((newData: T) => {
                if (isMountedRef.current) {
                    setData(newData);
                    setLoading(false);
                    setError(null);
                    onSuccess?.(newData);
                    console.log('📊 Data updated via subscription');
                }
            });

            unsubscribeRef.current = unsubscribe;

            return () => {
                isMountedRef.current = false;
                if (unsubscribeRef.current) {
                    console.log('🔌 Unsubscribing from Firestore');
                    unsubscribeRef.current();
                    unsubscribeRef.current = null;
                }
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Subscription failed';
            setError(errorMessage);
            setLoading(false);
            onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
    }, [...dependencies, enabled]);

    return { _data, loading, _error, isStale: false };
}

/**
 * Safe property access utilities - prevents undefined access in NeuroSEODashboard.tsx
 */
export const safeAccess = {
    array: <T>(arr: T[] | undefined | null): T[] => arr || [],
    length: (arr: unknown[] | undefined | null): number => arr?.length || 0,
    property: <T>(obj: unknown, path: string, fallback: T): T => {
        return path.split('.').reduce((curr, _key) => curr?.[key], obj) ?? fallback;
    },
    number: (_value: unknown, fallback = 0): number => {
        const num = Number(_value);
        return isNaN(num) ? fallback : num;
    },
    string: (_value: unknown, fallback = ''): string => {
        return value?.toString() || fallback;
    }
};
