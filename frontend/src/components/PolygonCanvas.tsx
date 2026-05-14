import { type AnyPolygon } from '../api/client';
import { useBackgroundImage } from '../hooks/useBackgroundImage';
import { usePolygonCanvas } from '../hooks/usePolygonCanvas';
import { randomPolygon } from '../lib/randomPolygon';
import { PolygonCanvasDrawing } from './PolygonCanvasDrawing';
import { PolygonCanvasImageControls } from './PolygonCanvasImageControls';
import { PolygonCanvasStatus } from './PolygonCanvasStatus';

interface Props {
  polygons: AnyPolygon[];
  highlightedId: number | string | null;
  tapToStart: boolean;
  autoSaveRandom: boolean;
  previewPoints: [number, number][] | null;
  onTapToStartChange: (next: boolean) => void;
  onAutoSaveRandomChange: (next: boolean) => void;
  onFinish: (points: [number, number][]) => void;
  onAutoSave: (points: [number, number][]) => void;
  onHoverChange: (id: number | string | null) => void;
  onImageRefreshError: (error: Error) => void;
}

export const PolygonCanvas = ({
  polygons,
  highlightedId,
  tapToStart,
  autoSaveRandom,
  previewPoints,
  onTapToStartChange,
  onAutoSaveRandomChange,
  onFinish,
  onAutoSave,
  onHoverChange,
  onImageRefreshError,
}: Props) => {
  const bg = useBackgroundImage({ onRefreshError: onImageRefreshError });
  const canvas = usePolygonCanvas({
    polygons,
    highlightedId,
    tapToStart,
    image: bg.image,
    previewPoints,
    onFinish,
    onHoverChange,
  });

  const idleCursor = tapToStart ? 'cursor-crosshair' : 'cursor-default';

  const handleRandom = () => {
    if (!bg.image) {
      return;
    }
    const points = randomPolygon(bg.image.naturalWidth, bg.image.naturalHeight);
    if (autoSaveRandom) {
      onAutoSave(points);
    } else {
      onFinish(points);
    }
  };

  return (
    <div ref={canvas.containerRef} className="relative h-full w-full">
      <PolygonCanvasStatus loading={!bg.image && !bg.error} error={bg.error} />

      <canvas
        ref={canvas.canvasRef}
        className={`block ${canvas.isDrawing ? 'cursor-crosshair' : idleCursor}`}
        data-testid="polygon-canvas"
        {...canvas.pointerHandlers}
      />

      {bg.image
        ? (
            <PolygonCanvasImageControls
              refreshing={bg.refreshing}
              drawing={canvas.isDrawing}
              autoSaveRandom={autoSaveRandom}
              onRefresh={bg.refresh}
              onRandom={handleRandom}
              onAutoSaveRandomChange={onAutoSaveRandomChange}
            />
          )
        : null}

      <PolygonCanvasDrawing
        drawing={canvas.isDrawing}
        canStart={canvas.canStart}
        tapToStart={tapToStart}
        onTapToStartChange={onTapToStartChange}
        onStart={canvas.start}
      />
    </div>
  );
};
