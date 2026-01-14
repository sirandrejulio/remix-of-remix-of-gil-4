import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to persist tab state and data in sessionStorage
 * Prevents data loss when navigating away from pages
 */
export function useTabPersistence<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from sessionStorage or use initial value
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error(`Error reading from sessionStorage for key ${key}:`, error);
    }
    return initialValue;
  });

  // Update sessionStorage when state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error writing to sessionStorage for key ${key}:`, error);
    }
  }, [key, state]);

  // Clear function to reset state
  const clear = useCallback(() => {
    sessionStorage.removeItem(key);
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setState, clear];
}

/**
 * Hook to persist multiple related states for a page
 */
export function usePageStatePersistence<T extends Record<string, unknown>>(
  pageKey: string,
  initialState: T
): {
  state: T;
  updateState: <K extends keyof T>(key: K, value: T[K]) => void;
  resetState: () => void;
} {
  const [state, setState, clear] = useTabPersistence<T>(pageKey, initialState);

  const updateState = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, [setState]);

  return {
    state,
    updateState,
    resetState: clear,
  };
}
