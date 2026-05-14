import { useCallback, useState } from 'react';

const STORAGE_KEY = 'polygons:auto-save-random';

const readInitial = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Defaults to `false` so a fresh user sees the dialog the first time and
    // understands what "Random polygon" did.
    return stored === null ? false : stored === 'true';
  } catch {
    return false;
  }
};

/**
 * Whether "Random polygon" should skip the name dialog and save immediately
 * with the default name. Persisted to localStorage. Defaults to `false`.
 */
export const useAutoSaveRandom = (): readonly [boolean, (next: boolean) => void] => {
  const [enabled, setEnabled] = useState<boolean>(readInitial);

  const update = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // localStorage may be disabled or quota-exceeded; the in-memory state
      // still wins for the current session, which is acceptable degradation.
    }
  }, []);

  return [enabled, update] as const;
};
