import { useCallback, useState } from 'react';

const STORAGE_KEY = 'polygons:tap-to-start';

const readInitial = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
};

/**
 * When enabled, a click on the canvas in idle mode both enters drawing mode
 * and places the first vertex (one gesture instead of two). The preference is
 * persisted to localStorage so it survives reloads. Defaults to `true`.
 */
export const useTapToStart = (): readonly [boolean, (next: boolean) => void] => {
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
