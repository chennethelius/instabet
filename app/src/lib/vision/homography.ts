import { loadOpenCV } from './opencv-loader';

export type Point = { x: number; y: number };
export type Corners = { tl: Point; tr: Point; br: Point; bl: Point };

/**
 * Minimal OpenCV.js subset we use.
 * We keep this loose — full typings live on @types/opencv.js if we add them later.
 */
type Cv = {
  Mat: new () => unknown;
  matFromArray: (rows: number, cols: number, type: number, data: number[]) => unknown;
  CV_32FC2: number;
  CV_8UC4: number;
  CV_8UC1: number;
  getPerspectiveTransform: (src: unknown, dst: unknown) => unknown;
  warpPerspective: (
    src: unknown,
    dst: unknown,
    M: unknown,
    size: { width: number; height: number },
  ) => void;
  imread: (img: HTMLImageElement | HTMLCanvasElement) => unknown;
  imshow: (canvas: HTMLCanvasElement, mat: unknown) => void;
  Size: new (w: number, h: number) => { width: number; height: number };
};

/**
 * Given 4 corners on a source image, compute the 3x3 homography matrix
 * that warps the quadrilateral into a rectangle of the given target size.
 *
 * Returns a flat array of 9 numbers (row-major).
 */
export async function computeHomography(
  corners: Corners,
  targetWidth: number,
  targetHeight: number,
): Promise<number[]> {
  const cv = (await loadOpenCV()) as unknown as Cv;

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners.tl.x, corners.tl.y,
    corners.tr.x, corners.tr.y,
    corners.br.x, corners.br.y,
    corners.bl.x, corners.bl.y,
  ]);
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    targetWidth, 0,
    targetWidth, targetHeight,
    0, targetHeight,
  ]);

  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const data = (M as { data64F: Float64Array }).data64F;
  const matrix = Array.from(data);

  // Clean up
  (srcPts as { delete: () => void }).delete();
  (dstPts as { delete: () => void }).delete();
  (M as { delete: () => void }).delete();

  return matrix;
}

/**
 * Apply a homography to an image, returning the warped result as a data URL.
 * Used to pre-rectify frames client-side before uploading, so OCR gets
 * a nice orthogonal view of the scoreboard.
 */
export async function warpImage(
  sourceCanvas: HTMLCanvasElement,
  matrix: number[],
  targetWidth: number,
  targetHeight: number,
): Promise<string> {
  const cv = (await loadOpenCV()) as unknown as Cv;

  const src = cv.imread(sourceCanvas);
  const dst = new cv.Mat();
  const M = cv.matFromArray(3, 3, 6 /* CV_64F */, matrix);

  cv.warpPerspective(src, dst, M, new cv.Size(targetWidth, targetHeight));

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  cv.imshow(outputCanvas, dst);

  (src as { delete: () => void }).delete();
  (dst as { delete: () => void }).delete();
  (M as { delete: () => void }).delete();

  return outputCanvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Default corners for initial calibration UI — roughly inset 20% from edges.
 */
export function defaultCorners(width: number, height: number): Corners {
  const mx = width * 0.2;
  const my = height * 0.3;
  return {
    tl: { x: mx, y: my },
    tr: { x: width - mx, y: my },
    br: { x: width - mx, y: height - my },
    bl: { x: mx, y: height - my },
  };
}
