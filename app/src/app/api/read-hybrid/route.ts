import { NextRequest, NextResponse } from 'next/server';
import { readAllRegions } from '@/lib/vision/hybrid-oracle';
import type { CalibrationRegion } from '@/lib/types/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Hybrid OCR endpoint — the live monitoring workhorse.
 *
 * Input:
 *   { frameDataUrl, regions: CalibrationRegion[], scoreboardType }
 *
 * Output:
 *   { readings: Array<{ regionLabel, value, confidence, strategy }> }
 *
 * Routes each region to Tesseract (digits) or Gemini (fuzzy) based on type.
 */
export async function POST(req: NextRequest) {
  try {
    const { frameDataUrl, regions, scoreboardType } = await req.json();
    if (!frameDataUrl || !Array.isArray(regions)) {
      return NextResponse.json(
        { error: 'frameDataUrl and regions[] required' },
        { status: 400 },
      );
    }

    const readings = await readAllRegions(
      frameDataUrl,
      regions as CalibrationRegion[],
      scoreboardType,
    );
    return NextResponse.json({ readings });
  } catch (err) {
    console.error('hybrid read failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
