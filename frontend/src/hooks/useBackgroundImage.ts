import { useCallback, useEffect, useState } from 'react';

const SOURCE_URL = 'https://picsum.photos/1920';
const CACHE_KEY = 'polygons:bg-image-v1';

interface State {
  image: HTMLImageElement | null;
  error: string | null;
  /** True while a *replacement* fetch is in-flight; the current image is still shown. */
  refreshing: boolean;
}

export interface BackgroundImage extends State {
  refresh: () => void;
}

interface Options {
  /** Invoked when a *refresh* (not the initial load) fails. The current image
   * stays visible; the caller typically surfaces this as a toast. */
  onRefreshError?: (error: Error) => void;
}

const decode = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode cached image'));
    img.src = dataUrl;
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });

const fetchFresh = async (): Promise<string> => {
  // Cache-bust so picsum returns a different image each call.
  const response = await fetch(`${SOURCE_URL}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return blobToDataUrl(await response.blob());
};

const readCached = (): string | null => {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
};

const writeCached = (dataUrl: string): void => {
  try {
    localStorage.setItem(CACHE_KEY, dataUrl);
  } catch {
    // Quota or disabled storage; the image still works in memory.
  }
};

/**
 * Loads the canvas background image, persisting it as a data URL so reloads
 * are instant. `refresh()` swaps in a new image *without* clearing the current
 * one -- the consumer should disable the trigger while `refreshing` is true.
 *
 * Refresh failures keep the existing image and are surfaced through the
 * optional `onRefreshError` callback (intended for a toast).
 */
export const useBackgroundImage = ({ onRefreshError }: Options = {}): BackgroundImage => {
  const [state, setState] = useState<State>({ image: null, error: null, refreshing: false });

  const replace = useCallback(async (initial: boolean) => {
    setState((prev) => ({ ...prev, refreshing: !initial, error: null }));
    try {
      const dataUrl = await fetchFresh();
      const img = await decode(dataUrl);
      writeCached(dataUrl);
      setState({ image: img, error: null, refreshing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load background image';
      setState((prev) => ({ ...prev, error: prev.image ? null : message, refreshing: false }));
      if (!initial) {
        onRefreshError?.(err instanceof Error ? err : new Error(message));
      }
    }
  }, [onRefreshError]);

  // Initial load: prefer the cached image (instant), fetch only on cache miss.
  useEffect(() => {
    const cached = readCached();
    if (cached) {
      decode(cached)
        .then((img) => setState({ image: img, error: null, refreshing: false }))
        .catch(() => {
          // Cached payload is corrupt; fall back to a network fetch.
          void replace(true);
        });
      return;
    }
    void replace(true);
  }, [replace]);

  const refresh = useCallback(() => {
    void replace(false);
  }, [replace]);

  return { ...state, refresh };
};
