/**
 * Helpers for mapping between image-space (where polygons are stored) and
 * canvas-space (where the user clicks). The canvas displays the image scaled
 * to fit its container while preserving aspect ratio.
 */

export type Point = readonly [number, number];

/** Minimum vertices required to form a polygon (a triangle). */
export const MIN_POLYGON_VERTICES = 3;

export interface ImageBox {
  /** Width of the image in natural pixels. */
  imageWidth: number;
  /** Height of the image in natural pixels. */
  imageHeight: number;
  /** Width of the rendered canvas in CSS pixels. */
  canvasWidth: number;
  /** Height of the rendered canvas in CSS pixels. */
  canvasHeight: number;
}

/** Scale at which the image is drawn to fit inside the canvas. */
export const fitScale = (box: ImageBox): number =>
  Math.min(box.canvasWidth / box.imageWidth, box.canvasHeight / box.imageHeight);

/** The offsets at which the (scaled) image is drawn inside the canvas. */
export const imageOffset = (box: ImageBox): { x: number; y: number; scale: number } => {
  const scale = fitScale(box);
  const drawW = box.imageWidth * scale;
  const drawH = box.imageHeight * scale;
  return {
    x: (box.canvasWidth - drawW) / 2,
    y: (box.canvasHeight - drawH) / 2,
    scale,
  };
};

/** Map an image-space point to canvas-space (accounts for scale + offset). */
export const imageToCanvas = (p: Point, box: ImageBox): Point => {
  const { x, y, scale } = imageOffset(box);
  return [p[0] * scale + x, p[1] * scale + y];
};

/** Map a canvas-space point to image-space (inverse of {@link imageToCanvas}). */
export const canvasToImage = (p: Point, box: ImageBox): Point => {
  const { x, y, scale } = imageOffset(box);
  return [(p[0] - x) / scale, (p[1] - y) / scale];
};

/** Euclidean distance between two points. */
export const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Mean of the vertex coordinates (returns `[NaN, NaN]` for an empty array). */
export const centroid = (points: readonly Point[]): Point => {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  return [cx / points.length, cy / points.length];
};

/**
 * Ray-casting point-in-polygon test. Returns `true` if `point` lies strictly
 * inside the polygon defined by `polygon`. Behaviour on an edge or vertex is
 * intentionally unspecified -- close enough for hover detection on integer
 * pixel coordinates.
 */
export const pointInPolygon = (point: Point, polygon: readonly Point[]): boolean => {
  if (polygon.length < MIN_POLYGON_VERTICES) {
    return false;
  }
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const straddlesY = (yi > y) !== (yj > y);
    if (straddlesY) {
      const xIntersection = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < xIntersection) {
        inside = !inside;
      }
    }
  }
  return inside;
};
