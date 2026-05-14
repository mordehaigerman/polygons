import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';
import { isPending, type AnyPolygon } from '../api/client';
import { drawInProgress, drawPolygon, drawPreview } from '../lib/canvasDraw';
import {
  canvasToImage,
  distance,
  imageOffset,
  imageToCanvas,
  MIN_POLYGON_VERTICES,
  pointInPolygon,
  type ImageBox,
  type Point,
} from '../lib/canvasMath';

const FINISH_SNAP_PX = 10;

type DrawingMode =
  | { kind: 'idle' }
  | { kind: 'drawing'; points: Point[]; cursor: Point | null };

interface Options {
  polygons: AnyPolygon[];
  highlightedId: number | string | null;
  tapToStart: boolean;
  image: HTMLImageElement | null;
  /** The just-drawn polygon, shown as a "loading" preview while the name dialog is open. */
  previewPoints: Point[] | null;
  onFinish: (points: [number, number][]) => void;
  onHoverChange: (id: number | string | null) => void;
}

export interface PolygonCanvasController {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isDrawing: boolean;
  canStart: boolean;
  start: () => void;
  pointerHandlers: {
    onClick: (event: MouseEvent<HTMLCanvasElement>) => void;
    onMouseMove: (event: MouseEvent<HTMLCanvasElement>) => void;
    onMouseLeave: () => void;
    onDoubleClick: (event: MouseEvent<HTMLCanvasElement>) => void;
  };
}

/**
 * Owns every concern of the polygon canvas *except* fetching the background
 * image (that lives in :func:`useBackgroundImage`): container sizing, drawing
 * state machine, keyboard shortcuts, canvas rendering, and pointer translation.
 * The view component reads from the returned controller and doesn't keep state
 * of its own.
 */
export const usePolygonCanvas = ({
  polygons,
  highlightedId,
  tapToStart,
  image,
  previewPoints,
  onFinish,
  onHoverChange,
}: Options): PolygonCanvasController => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<DrawingMode>({ kind: 'idle' });

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<DrawingMode>({ kind: 'idle' });
  // Ticks once per animation frame whenever the canvas has something to
  // animate (preview / saving polygons). We keep it as state so the render
  // effect picks it up via its dependency array.
  const [pulse, setPulse] = useState(0);
  const hasPendingVisual = previewPoints !== null || polygons.some(isPending);

  useEffect(() => {
    if (!hasPendingVisual) {
      return;
    }
    let raf = 0;
    const tick = () => {
      setPulse((t) => t + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasPendingVisual]);

  // Mirror `mode` into a ref so the global keyboard listener can read the
  // latest value without re-registering on every mousemove.
  modeRef.current = mode;

  const box = useMemo<ImageBox | null>(() => {
    if (!image || containerSize.width === 0 || containerSize.height === 0) {
      return null;
    }
    return {
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      canvasWidth: containerSize.width,
      canvasHeight: containerSize.height,
    };
  }, [image, containerSize]);

  const start = useCallback(() => {
    setMode({ kind: 'drawing', points: [], cursor: null });
  }, []);

  const cancel = useCallback(() => {
    setMode({ kind: 'idle' });
  }, []);

  const finish = useCallback(() => {
    const current = modeRef.current;
    if (current.kind !== 'drawing' || current.points.length < MIN_POLYGON_VERTICES) {
      return;
    }
    setMode({ kind: 'idle' });
    onFinish(current.points.map(([x, y]) => [x, y]));
  }, [onFinish]);

  const popVertex = useCallback(() => {
    setMode((current) =>
      current.kind === 'drawing' && current.points.length > 0
        ? { kind: 'drawing', points: current.points.slice(0, -1), cursor: current.cursor }
        : current,
    );
  }, []);

  const canvasPointAt = (event: MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };

  const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
    // Native dblclick fires after two clicks; ignore the click pair so we
    // don't append phantom vertices before `onDoubleClick` finishes.
    if (event.detail > 1) {
      return;
    }
    if (!box) {
      return;
    }
    const canvasPoint = canvasPointAt(event);
    if (!canvasPoint) {
      return;
    }
    const imagePoint = canvasToImage(canvasPoint, box);

    // Tap-to-start: a click in idle mode both enters drawing and places the
    // first vertex. One gesture instead of two.
    if (mode.kind === 'idle') {
      if (!tapToStart) {
        return;
      }
      onHoverChange(null);
      setMode({ kind: 'drawing', points: [imagePoint], cursor: imagePoint });
      return;
    }

    if (mode.points.length >= MIN_POLYGON_VERTICES) {
      const firstCanvas = imageToCanvas(mode.points[0], box);
      if (distance(canvasPoint, firstCanvas) <= FINISH_SNAP_PX) {
        finish();
        return;
      }
    }

    setMode({ kind: 'drawing', points: [...mode.points, imagePoint], cursor: imagePoint });
  };

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!box) {
      return;
    }
    const canvasPoint = canvasPointAt(event);
    if (!canvasPoint) {
      return;
    }
    const imagePoint = canvasToImage(canvasPoint, box);

    if (mode.kind === 'drawing') {
      setMode({ ...mode, cursor: imagePoint });
      return;
    }

    // Hover detection: top-most (last-drawn) polygon wins. Skips pending
    // polygons -- they don't yet have a stable id to highlight against.
    let hovered: number | string | null = null;
    for (let i = polygons.length - 1; i >= 0; i--) {
      const polygon = polygons[i];
      if (isPending(polygon)) {
        continue;
      }
      if (pointInPolygon(imagePoint, polygon.points)) {
        hovered = polygon.id;
        break;
      }
    }
    onHoverChange(hovered);
  };

  const onMouseLeave = () => {
    if (mode.kind === 'idle') {
      onHoverChange(null);
    }
  };

  const onDoubleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    // Suppress the browser's native double-click text/word selection, which can
    // steal focus from the dialog that this gesture opens.
    event.preventDefault();
    if (mode.kind === 'drawing') {
      finish();
    }
  };

  // Track the container's CSS size for aspect-preserving canvas sizing.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render (DPR-aware) whenever inputs change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !box) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = box.canvasWidth * dpr;
    canvas.height = box.canvasHeight * dpr;
    canvas.style.width = `${box.canvasWidth}px`;
    canvas.style.height = `${box.canvasHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.canvasWidth, box.canvasHeight);

    const { x, y, scale } = imageOffset(box);
    ctx.drawImage(image, x, y, box.imageWidth * scale, box.imageHeight * scale);

    const now = Date.now();
    for (const polygon of polygons) {
      drawPolygon(ctx, polygon, box, polygon.id === highlightedId, now);
    }
    if (previewPoints) {
      drawPreview(ctx, previewPoints, box, now);
    }
    if (mode.kind === 'drawing') {
      drawInProgress(ctx, mode.points, mode.cursor, box);
    }
    // `pulse` is in the dep array only so the marching-ants animation keeps
    // advancing while a preview/saving polygon is on the canvas.
  }, [image, box, polygons, mode, highlightedId, previewPoints, pulse]);

  // Keyboard shortcuts (Esc / Enter / Backspace) — only act while drawing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const current = modeRef.current;
      if (current.kind !== 'drawing') {
        return;
      }
      if (event.key === 'Escape') {
        cancel();
      } else if (event.key === 'Enter') {
        finish();
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        popVertex();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancel, finish, popVertex]);

  return {
    containerRef,
    canvasRef,
    isDrawing: mode.kind === 'drawing',
    canStart: image !== null,
    start,
    pointerHandlers: { onClick, onMouseMove, onMouseLeave, onDoubleClick },
  };
};
