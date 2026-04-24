import { readDigit, normalizeReading } from '@/lib/ai/ocr-digit';
import { readRegion } from '@/lib/ai/vision-read';
import { cropAndPreprocess, dataUrlToBuffer, type Bbox } from '@/lib/vision/preprocess';
import type { CalibrationRegion, RegionReading } from '@/lib/types/schema';

/**
 * The hybrid oracle — the core of Instabet's vision pipeline.
 *
 * Routes each region to its optimal reader:
 *   - Digital/LED scores, clocks → Tesseract with tight digit whitelist (fast, cheap, accurate)
 *   - Handwritten, chalkboard, any fuzzy region → Gemini Vision (adaptive, semantic)
 *   - Period/label regions → Tesseract with broader charset + dictionary
 *
 * This is the live-monitoring path. Triple-LLM consensus runs only at final resolution.
 */

type ReaderStrategy = 'tesseract_digits' | 'tesseract_text' | 'gemini_vision';

function pickStrategy(region: CalibrationRegion, scoreboardType?: string): ReaderStrategy {
  // Digital displays with numeric content → Tesseract
  const numericTypes = ['home_score', 'away_score', 'player_score', 'counter', 'timer', 'clock'];
  if (scoreboardType === 'digital_led' && numericTypes.includes(region.type)) {
    return 'tesseract_digits';
  }
  // Clocks regardless of scoreboard type
  if (region.type === 'clock') return 'tesseract_digits';
  // Fuzzy / handwritten / unclear → VLM
  if (scoreboardType === 'handwritten_whiteboard' || scoreboardType === 'chalkboard') {
    return 'gemini_vision';
  }
  // Default for period labels etc.
  return 'gemini_vision';
}

/**
 * Read one region from a full-frame image.
 *
 * @param frameDataUrl  Full-frame JPEG as base64 data URL (from client)
 * @param region        The calibrated region with bbox
 * @param scoreboardType Type info from calibration to pick OCR strategy
 */
export async function readRegionHybrid(
  frameDataUrl: string,
  region: CalibrationRegion,
  scoreboardType?: string,
): Promise<RegionReading & { strategy: ReaderStrategy }> {
  const strategy = pickStrategy(region, scoreboardType);
  const frameBuffer = dataUrlToBuffer(frameDataUrl);
  const bbox: Bbox = region.bbox as Bbox;

  if (strategy === 'tesseract_digits') {
    try {
      const cropped = await cropAndPreprocess(frameBuffer, bbox, {
        upscale: 3,
        threshold: true,
        invert: scoreboardType === 'digital_led', // LED is white-on-black
      });
      const result = await readDigit(cropped);
      const format: 'integer' | 'clock' = region.type === 'clock' ? 'clock' : 'integer';
      const value = normalizeReading(result.value, format);

      // If confidence is too low, fall back to VLM
      if (result.confidence < 50 || !value) {
        return readWithVlm(frameDataUrl, region, 'gemini_vision_fallback' as ReaderStrategy);
      }
      return { value, confidence: Math.round(result.confidence), strategy };
    } catch (err) {
      // Preprocessing or OCR failure → fall back to VLM
      console.warn('Tesseract failed, falling back to VLM:', err);
      return readWithVlm(frameDataUrl, region, 'gemini_vision_fallback' as ReaderStrategy);
    }
  }

  return readWithVlm(frameDataUrl, region, strategy);
}

async function readWithVlm(
  frameDataUrl: string,
  region: CalibrationRegion,
  strategy: ReaderStrategy,
): Promise<RegionReading & { strategy: ReaderStrategy }> {
  // For the VLM path, we still crop first to save tokens
  const frameBuffer = dataUrlToBuffer(frameDataUrl);
  const cropped = await cropAndPreprocess(frameBuffer, region.bbox as Bbox, {
    upscale: 2,
    threshold: false, // VLMs handle raw colors better
  });
  const croppedDataUrl = `data:image/png;base64,${cropped.toString('base64')}`;
  const reading = await readRegion(croppedDataUrl, region.type, region.label);
  return { ...reading, strategy };
}

/**
 * Read ALL regions in a frame. Called every 5 seconds during live monitoring.
 */
export async function readAllRegions(
  frameDataUrl: string,
  regions: CalibrationRegion[],
  scoreboardType?: string,
): Promise<Array<RegionReading & { regionLabel: string; strategy: ReaderStrategy }>> {
  const results = await Promise.all(
    regions.map(async r => ({
      regionLabel: r.label,
      ...(await readRegionHybrid(frameDataUrl, r, scoreboardType)),
    })),
  );
  return results;
}
