import sharp from 'sharp';

/**
 * Image preprocessing for OCR accuracy.
 *
 * Takes a raw JPEG/PNG buffer + a bounding box, returns a cropped, normalized
 * grayscale PNG suitable for Tesseract ssd/seven-segment recognition.
 */

export type Bbox = [number, number, number, number]; // [x, y, width, height]

type PreprocessOptions = {
  /** Upscale factor for small regions (default 3x — Tesseract works best on ~50px-tall text) */
  upscale?: number;
  /** Apply inversion (white-on-black LED → black-on-white) */
  invert?: boolean;
  /** Apply adaptive threshold / normalization (default true) */
  threshold?: boolean;
};

export async function cropAndPreprocess(
  sourceBuffer: Buffer | Uint8Array,
  bbox: Bbox,
  opts: PreprocessOptions = {},
): Promise<Buffer> {
  const { upscale = 3, invert = false, threshold = true } = opts;
  const [x, y, w, h] = bbox.map(Math.round) as Bbox;

  let pipeline = sharp(Buffer.from(sourceBuffer))
    .extract({ left: x, top: y, width: w, height: h })
    .greyscale();

  if (threshold) {
    pipeline = pipeline.normalise(); // stretch to full 0-255 range
  }

  if (invert) {
    pipeline = pipeline.negate();
  }

  if (upscale > 1) {
    pipeline = pipeline.resize(w * upscale, h * upscale, {
      kernel: 'lanczos3',
    });
  }

  return pipeline.png().toBuffer();
}

/**
 * Decode a base64 data URL (from the browser) into a Buffer for sharp.
 */
export function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  return Buffer.from(match[2], 'base64');
}

/**
 * Apply a 3x3 homography to an image (perspective correction).
 * Sharp doesn't natively support arbitrary homography, so for v1 we use
 * an affine fallback via sharp.affine(). For full projective transform,
 * OpenCV.js on the client (pre-warp before upload) or server-side
 * @napi-rs/canvas would be next step.
 *
 * For the hackathon MVP: client computes and applies the warp, server
 * receives the already-rectified image. This function is a stub for v2.
 */
export async function applyHomography(
  sourceBuffer: Buffer,
  matrix: number[], // flattened 3x3
): Promise<Buffer> {
  // Affine approximation using sharp — accurate when perspective is mild.
  // For full homography, use OpenCV.js on client side before upload.
  if (matrix.length !== 9) throw new Error('Matrix must be 3x3 (9 elements)');
  // For now, pass through — client handles warping.
  return sourceBuffer;
}
