import { MIN_POLYGON_VERTICES } from './canvasMath';

/** Min and max vertex counts for a generated polygon (inclusive). */
const MIN_VERTICES = MIN_POLYGON_VERTICES;
const MAX_VERTICES = 8;
/** Fraction of the image kept as a margin so shapes never sit on the edge. */
const EDGE_MARGIN = 0.2;
/**
 * Base radius as a fraction of the smaller image dimension. Pick small enough
 * that the per-vertex jittered max radius (`BASE_RADIUS_FRACTION * 2`) fits
 * inside `EDGE_MARGIN`, otherwise a vertex can fall outside the image bounds.
 */
const BASE_RADIUS_FRACTION = 0.08;

/**
 * Generate a non-self-intersecting polygon with `MIN_VERTICES..MAX_VERTICES`
 * vertices arranged at sorted angles around a random center. Points are in
 * image coordinate space (`[0..width] × [0..height]`). Returning sorted-angle
 * vertices guarantees a simple polygon, while per-vertex radius/angle jitter
 * keeps the shapes from looking like regular n-gons.
 *
 * `rng` is injectable so tests can pin the output.
 */
export const randomPolygon = (
  imageWidth: number,
  imageHeight: number,
  rng: () => number = Math.random,
): [number, number][] => {
  const cx = imageWidth * (EDGE_MARGIN + rng() * (1 - 2 * EDGE_MARGIN));
  const cy = imageHeight * (EDGE_MARGIN + rng() * (1 - 2 * EDGE_MARGIN));
  const count = MIN_VERTICES + Math.floor(rng() * (MAX_VERTICES - MIN_VERTICES + 1));
  const baseR = Math.min(imageWidth, imageHeight) * BASE_RADIUS_FRACTION;
  const points: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const r = baseR * (0.7 + rng() * 1.3);
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return points;
};
