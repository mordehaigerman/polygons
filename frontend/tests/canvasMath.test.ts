import { describe, expect, it } from 'vitest';
import {
  canvasToImage,
  centroid,
  distance,
  fitScale,
  imageOffset,
  imageToCanvas,
  pointInPolygon,
  type ImageBox,
  type Point,
} from '../src/lib/canvasMath';

describe('canvasMath', () => {
  describe('fitScale', () => {
    it('scales by width when width is the constraint', () => {
      const box: ImageBox = {
        imageWidth: 1920,
        imageHeight: 1080,
        canvasWidth: 960,
        canvasHeight: 1080,
      };
      // Constrained by width: 960 / 1920 = 0.5
      expect(fitScale(box)).toBeCloseTo(0.5);
    });

    it('scales by height when height is the constraint', () => {
      const box: ImageBox = {
        imageWidth: 1920,
        imageHeight: 1080,
        canvasWidth: 1920,
        canvasHeight: 270,
      };
      // Constrained by height: 270 / 1080 = 0.25
      expect(fitScale(box)).toBeCloseTo(0.25);
    });
  });

  describe('imageOffset', () => {
    it('centers the image vertically when canvas is taller than the scaled image', () => {
      const box: ImageBox = {
        imageWidth: 1920,
        imageHeight: 1080,
        canvasWidth: 1920,
        canvasHeight: 1280, // taller than 1080
      };
      const { x, y, scale } = imageOffset(box);
      expect(scale).toBe(1);
      expect(x).toBe(0);
      expect(y).toBeCloseTo(100); // (1280 - 1080) / 2
    });
  });

  describe('imageToCanvas / canvasToImage round-trip', () => {
    it('is the identity when the image fills the canvas exactly', () => {
      const box: ImageBox = {
        imageWidth: 1920,
        imageHeight: 1080,
        canvasWidth: 1920,
        canvasHeight: 1080,
      };
      expect(imageToCanvas([100, 200], box)).toEqual([100, 200]);
      expect(canvasToImage([100, 200], box)).toEqual([100, 200]);
    });

    it('accounts for letterboxing and scale', () => {
      const box: ImageBox = {
        imageWidth: 1920,
        imageHeight: 1080,
        canvasWidth: 960, // half-scale
        canvasHeight: 720, // taller than scaled-image height (540)
      };
      // Scale = 0.5; offset y = (720 - 540)/2 = 90; offset x = 0.
      expect(imageToCanvas([400, 200], box)).toEqual([200, 190]);
      expect(canvasToImage([200, 190], box)).toEqual([400, 200]);
    });
  });

  describe('centroid', () => {
    it('returns the mean of vertex coordinates', () => {
      expect(
        centroid([
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ]),
      ).toEqual([5, 5]);
    });
  });

  describe('distance', () => {
    it('returns the Euclidean distance', () => {
      expect(distance([0, 0], [3, 4])).toBe(5);
    });
  });

  describe('pointInPolygon', () => {
    const square: Point[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    it('returns true for a point in the interior', () => {
      expect(pointInPolygon([5, 5], square)).toBe(true);
    });

    it('returns false for a point outside the polygon', () => {
      expect(pointInPolygon([20, 5], square)).toBe(false);
      expect(pointInPolygon([5, -5], square)).toBe(false);
    });

    it('returns false for a degenerate polygon (fewer than 3 vertices)', () => {
      expect(pointInPolygon([5, 5], [[0, 0], [10, 10]])).toBe(false);
      expect(pointInPolygon([0, 0], [])).toBe(false);
    });

    it('handles concave polygons correctly', () => {
      // L-shape: filled in the bottom-left and right strips, hollow top-right.
      const lShape: Point[] = [
        [0, 0],
        [10, 0],
        [10, 5],
        [5, 5],
        [5, 10],
        [0, 10],
      ];
      expect(pointInPolygon([2, 2], lShape)).toBe(true); // bottom-left
      expect(pointInPolygon([7, 2], lShape)).toBe(true); // bottom-right
      expect(pointInPolygon([2, 7], lShape)).toBe(true); // top-left
      expect(pointInPolygon([7, 7], lShape)).toBe(false); // hollow corner
    });
  });
});
