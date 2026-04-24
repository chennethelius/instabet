import { createWorker, PSM, type Worker } from 'tesseract.js';

/**
 * Tesseract-based OCR for digital / seven-segment / printed-numeric regions.
 *
 * We keep a pool of workers warm so each read is fast (~50-150ms).
 * Uses `letsgodigital` or `ssd` data if available, falls back to `eng`
 * with tight whitelist (digits + colon for clocks).
 */

const MAX_WORKERS = 3;
const pool: Worker[] = [];
const busy: Set<Worker> = new Set();
let initPromise: Promise<void> | null = null;

async function ensurePool() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    for (let i = 0; i < MAX_WORKERS; i++) {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789:',
        tessedit_pageseg_mode: PSM.SINGLE_LINE, // treat image as single text line
      });
      pool.push(worker);
    }
  })();
  return initPromise;
}

async function acquire(): Promise<Worker> {
  await ensurePool();
  // Find free worker
  for (const w of pool) {
    if (!busy.has(w)) {
      busy.add(w);
      return w;
    }
  }
  // All busy — wait briefly and retry
  await new Promise(r => setTimeout(r, 50));
  return acquire();
}

function release(worker: Worker) {
  busy.delete(worker);
}

export type DigitReading = {
  value: string;
  confidence: number;
  rawText: string;
};

/**
 * Read a single numeric region (score, clock) from a cropped image buffer.
 * Input: a small cropped PNG/JPEG buffer (ideally preprocessed: grayscale + high contrast).
 */
export async function readDigit(imageBuffer: Buffer | Uint8Array): Promise<DigitReading> {
  const worker = await acquire();
  try {
    const { data } = await worker.recognize(Buffer.from(imageBuffer));
    const rawText = data.text.trim();
    // Strip non-digit/colon chars, collapse whitespace
    const cleaned = rawText.replace(/[^\d:]/g, '');
    return {
      value: cleaned,
      confidence: data.confidence ?? 0,
      rawText,
    };
  } finally {
    release(worker);
  }
}

/**
 * Normalize a digit reading to a specific format.
 * For "mm:ss" clocks, "1415" becomes "14:15". For scores, just digits.
 */
export function normalizeReading(value: string, format: 'integer' | 'clock'): string {
  if (format === 'integer') {
    return value.replace(/:/g, '');
  }
  // clock format
  if (value.includes(':')) return value;
  if (value.length === 3) return `${value[0]}:${value.slice(1)}`;
  if (value.length === 4) return `${value.slice(0, 2)}:${value.slice(2)}`;
  return value;
}
