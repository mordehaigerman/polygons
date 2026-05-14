import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

/** Wire shape returned by `GET /api/polygons`. */
export type Polygon = components['schemas']['PolygonOut'];
export type PolygonInput = components['schemas']['PolygonIn'];

/**
 * A server-confirmed polygon as it lives in the cache. Optional flags mark
 * in-flight mutations so the UI can grayed-out / label the row without losing
 * its position:
 *   - `deleting`: an optimistic delete is mid-flight; row stays until the
 *     server confirms removal or the mutation rolls back.
 *   - `renaming`: an optimistic rename is mid-flight; the polygon already
 *     shows the new name and the row carries a "Renaming" label.
 *
 * Both flags are stripped on success, reverted on error, and never persisted
 * to localStorage.
 */
export type SavedPolygon = Polygon & { deleting?: true; renaming?: true };

const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

/**
 * Typed HTTP client for the backend. The OpenAPI paths already include the
 * `/api` prefix; we issue requests to the page's own origin and let the Vite
 * dev proxy route `/api/*` to the backend in development. An absolute baseUrl
 * is also required so that Node's fetch can parse the URL during tests.
 */
export const api = createClient<paths>({ baseUrl });

/**
 * A polygon that has not been confirmed by the server. `pending` is in flight;
 * `failed` is a save that errored out and is awaiting a Retry click. Both share
 * the same gray "draft" rendering on canvas.
 */
export type DraftPolygon = Omit<Polygon, 'id'> & {
  id: string;
  status: 'pending' | 'failed';
};

export type AnyPolygon = SavedPolygon | DraftPolygon;

export const isDraft = (p: AnyPolygon): p is DraftPolygon => typeof p.id === 'string';

export const isPending = (p: AnyPolygon): p is DraftPolygon =>
  isDraft(p) && p.status === 'pending';

export const isFailed = (p: AnyPolygon): p is DraftPolygon =>
  isDraft(p) && p.status === 'failed';

/** A saved polygon mid-delete: still in the list (grayed) until the server settles. */
export const isDeleting = (p: AnyPolygon): p is SavedPolygon & { deleting: true } =>
  !isDraft(p) && p.deleting === true;

/** A saved polygon mid-rename: shows the optimistic new name + a Renaming label. */
export const isRenaming = (p: AnyPolygon): p is SavedPolygon & { renaming: true } =>
  !isDraft(p) && p.renaming === true;

/**
 * Either an in-flight save (`pending` draft) or an in-flight delete -- both
 * change the polygon's *shape* on the canvas, so they share the gray /
 * marching-ants treatment. Rename only changes the name and is deliberately
 * excluded: re-coloring the polygon for a 5s metadata change would look like
 * the shape itself is unstable.
 */
export const isInFlight = (p: AnyPolygon): boolean => isPending(p) || isDeleting(p);

/**
 * Extract the human-readable `detail` from a backend error envelope. Handles
 * both plain HTTPException (`detail: string`) and FastAPI validation errors
 * (`detail: ValidationError[]`, whose `.msg` fields get joined). Returns
 * `undefined` if the shape doesn't match, so callers can `?? 'fallback'`.
 */
export const errorDetail = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const detail = (error as { detail?: unknown }).detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) =>
        typeof d === 'object' && d !== null && typeof (d as { msg?: unknown }).msg === 'string'
          ? (d as { msg: string }).msg
          : null,
      )
      .filter((m): m is string => m !== null);
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }
  return undefined;
};

/**
 * Throw a typed Error if the openapi-fetch result is non-2xx. We anchor on
 * `response.ok` rather than `error` truthiness because intermediaries (e.g.
 * the Vite dev proxy on a refused backend) can return non-2xx with an empty
 * body, which openapi-fetch surfaces as `error: ""` -- falsy and easy to miss.
 * The server's `detail` wins when present; otherwise we fall back to a
 * caller-supplied contextual message (e.g. `Failed to save "P1"`).
 */
export const ensureOk = <T>(
  result: { data?: T; error?: unknown; response: Response },
  fallback: string,
): T | undefined => {
  if (!result.response.ok) {
    throw new Error(errorDetail(result.error) ?? fallback);
  }
  return result.data;
};
