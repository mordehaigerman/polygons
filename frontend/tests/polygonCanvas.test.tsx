import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PolygonCanvas } from '../src/components/PolygonCanvas';
import { renderWithClient } from './utils';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

const setupRect = () => {
  const original = Element.prototype.getBoundingClientRect;
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      return {
        left: 0,
        top: 0,
        right: CANVAS_W,
        bottom: CANVAS_H,
        width: CANVAS_W,
        height: CANVAS_H,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    },
  });
  return () => {
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: original,
    });
  };
};

const stubImage = () => {
  const original = window.Image;
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    crossOrigin = '';
    naturalWidth = CANVAS_W;
    naturalHeight = CANVAS_H;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal('Image', StubImage as unknown as typeof window.Image);
  return () => vi.stubGlobal('Image', original);
};

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      arc: vi.fn(),
      measureText: () => ({ width: 10 }),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
    }),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe('PolygonCanvas', () => {
  it('emits image-space points when the user draws three vertices and double-clicks', async () => {
    const restoreRect = setupRect();
    const restoreImage = stubImage();
    // Seed the background-image cache so `useBackgroundImage` short-circuits
    // and never reaches the real network (MSW would reject unhandled hosts).
    localStorage.setItem('polygons:bg-image-v1', 'data:image/png;base64,stub');
    try {
      const onFinish = vi.fn<(points: [number, number][]) => void>();
      renderWithClient(
        <PolygonCanvas
          polygons={[]}
          highlightedId={null}
          tapToStart={false}
          autoSaveRandom={false}
          previewPoints={null}
          onTapToStartChange={() => undefined}
          onAutoSaveRandomChange={() => undefined}
          onHoverChange={() => undefined}
          onFinish={onFinish}
          onAutoSave={() => undefined}
          onImageRefreshError={() => undefined}
        />,
      );

      const newButton = await screen.findByRole('button', { name: /new polygon/i });
      // Wait for the background image to "load" so the button leaves its
      // disabled state.
      await waitFor(() => expect(newButton).not.toBeDisabled());
      await act(async () => {
        newButton.click();
      });

      const canvas = await screen.findByTestId('polygon-canvas');
      await act(async () => {
        fireEvent.click(canvas, { clientX: 100, clientY: 100 });
      });
      await act(async () => {
        fireEvent.click(canvas, { clientX: 200, clientY: 100 });
      });
      await act(async () => {
        fireEvent.click(canvas, { clientX: 150, clientY: 200 });
      });
      await act(async () => {
        fireEvent.doubleClick(canvas);
      });

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));

      const points = onFinish.mock.calls[0][0];
      expect(points).toHaveLength(3);
      // 1920x1080 image into 1920x1080 box: scale = 1 and no letterboxing,
      // so canvas-space and image-space coincide.
      expect(points[0][0]).toBeCloseTo(100, 0);
      expect(points[0][1]).toBeCloseTo(100, 0);
      expect(points[1][0]).toBeCloseTo(200, 0);
      expect(points[2][1]).toBeCloseTo(200, 0);
    } finally {
      restoreRect();
      restoreImage();
    }
  });
});
