import { isDeleting, isDraft, isInFlight, type AnyPolygon } from '../api/client';
import {
  centroid,
  imageToCanvas,
  MIN_POLYGON_VERTICES,
  type ImageBox,
  type Point,
} from './canvasMath';
import { colorForId, fillColorForId } from './colors';

// Neutral "loading" palette for anything not yet confirmed by the server. Using
// slate-400 keeps it visually distinct from any id-derived hue (which always
// run at full saturation) so the swap to the final color reads as "loading →
// done" rather than "color A → color B".
const DRAFT_STROKE = '#94a3b8';
const DRAFT_FILL = 'rgba(148, 163, 184, 0.2)';

/** Trace `points` as a closed path in canvas coords. */
const tracePath = (ctx: CanvasRenderingContext2D, points: Point[], box: ImageBox) => {
  ctx.beginPath();
  points.forEach((p, i) => {
    const [cx, cy] = imageToCanvas(p, box);
    if (i === 0) {
      ctx.moveTo(cx, cy);
    } else {
      ctx.lineTo(cx, cy);
    }
  });
  ctx.closePath();
};

/**
 * Dashed gray stroke. When `animate` is true the dash offset advances with
 * `now` (marching ants -- conveys "in flight"); when false the dashes are
 * static (conveys "stalled, awaiting Retry").
 */
const strokeDraft = (ctx: CanvasRenderingContext2D, now: number, animate: boolean) => {
  ctx.lineWidth = 2;
  ctx.strokeStyle = DRAFT_STROKE;
  ctx.setLineDash([8, 5]);
  ctx.lineDashOffset = animate ? -(now / 50) : 0;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
};

export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  polygon: AnyPolygon,
  box: ImageBox,
  highlighted: boolean,
  now: number,
) {
  const pts = polygon.points as Point[];
  if (pts.length === 0) {
    return;
  }
  tracePath(ctx, pts, box);
  // Drafts (pending/failed creates) and in-flight deletes share the neutral
  // gray treatment. Marching ants animate while something is actually in
  // flight; failed saves freeze the dashes to communicate "stalled".
  if (isDraft(polygon) || isDeleting(polygon)) {
    ctx.fillStyle = DRAFT_FILL;
    ctx.fill();
    strokeDraft(ctx, now, isInFlight(polygon));
  } else {
    const fillAlpha = highlighted ? 0.35 : 0.25;
    ctx.fillStyle = fillColorForId(polygon.id, fillAlpha);
    ctx.fill();
    ctx.lineWidth = highlighted ? 3 : 2;
    ctx.strokeStyle = colorForId(polygon.id);
    ctx.stroke();
  }

  // Label at the centroid.
  const [cx, cy] = imageToCanvas(centroid(pts), box);
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  const padding = 4;
  const metrics = ctx.measureText(polygon.name);
  ctx.fillRect(cx - metrics.width / 2 - padding, cy - 9, metrics.width + padding * 2, 18);
  ctx.fillStyle = '#fff';
  ctx.fillText(polygon.name, cx, cy);
}

/**
 * Renders the polygon the user just drew while the name dialog is open. It
 * uses the same "pending" treatment as in-flight saves -- gray fill, marching-
 * ants stroke -- so the visual stays continuous all the way through to the
 * server confirming the create.
 */
export function drawPreview(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  box: ImageBox,
  now: number,
) {
  if (points.length === 0) {
    return;
  }
  tracePath(ctx, points, box);
  ctx.fillStyle = DRAFT_FILL;
  ctx.fill();
  strokeDraft(ctx, now, true);
}

export function drawInProgress(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  cursor: Point | null,
  box: ImageBox,
) {
  if (points.length === 0 && !cursor) {
    return;
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#34d399'; // emerald-400
  ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';

  ctx.beginPath();
  const drawn = [...points];
  if (cursor) {
    drawn.push(cursor);
  }
  drawn.forEach((p, i) => {
    const [cx, cy] = imageToCanvas(p, box);
    if (i === 0) {
      ctx.moveTo(cx, cy);
    } else {
      ctx.lineTo(cx, cy);
    }
  });
  ctx.stroke();
  if (points.length >= MIN_POLYGON_VERTICES) {
    // Fill preview if we already have a closeable polygon.
    ctx.beginPath();
    points.forEach((p, i) => {
      const [cx, cy] = imageToCanvas(p, box);
      if (i === 0) {
        ctx.moveTo(cx, cy);
      } else {
        ctx.lineTo(cx, cy);
      }
    });
    ctx.closePath();
    ctx.fill();
  }

  for (const [i, p] of points.entries()) {
    const [cx, cy] = imageToCanvas(p, box);
    const isFirst = i === 0;
    ctx.beginPath();
    ctx.arc(cx, cy, isFirst ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isFirst ? '#10b981' : '#34d399';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  }
}
