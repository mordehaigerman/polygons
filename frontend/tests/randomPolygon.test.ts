import { describe, expect, it } from 'vitest';
import { MIN_POLYGON_VERTICES } from '../src/lib/canvasMath';
import { randomPolygon } from '../src/lib/randomPolygon';

/** Deterministic RNG: cycles through a fixed sequence of values in [0, 1). */
const seqRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
};

describe('randomPolygon', () => {
  it('produces at least MIN_POLYGON_VERTICES vertices', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = seqRng([seed / 50, 1 - seed / 50, seed / 100, 0.5, 0.3]);
      const pts = randomPolygon(1000, 800, rng);
      expect(pts.length).toBeGreaterThanOrEqual(MIN_POLYGON_VERTICES);
    }
  });

  it('produces at most 8 vertices', () => {
    const rng = seqRng([0.99, 0.99, 0.99, 0.99, 0.99]);
    const pts = randomPolygon(1000, 800, rng);
    expect(pts.length).toBeLessThanOrEqual(8);
  });

  it('keeps every vertex inside the image bounding box', () => {
    const w = 1920;
    const h = 1080;
    for (let seed = 0; seed < 100; seed++) {
      const rng = seqRng([
        Math.sin(seed) * 0.5 + 0.5,
        Math.cos(seed) * 0.5 + 0.5,
        Math.sin(seed * 2) * 0.5 + 0.5,
        Math.cos(seed * 2) * 0.5 + 0.5,
        Math.sin(seed * 3) * 0.5 + 0.5,
      ]);
      const pts = randomPolygon(w, h, rng);
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(w);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(h);
      }
    }
  });

  it('is deterministic for a fixed rng', () => {
    const a = randomPolygon(1000, 800, seqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]));
    const b = randomPolygon(1000, 800, seqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]));
    expect(a).toEqual(b);
  });
});
