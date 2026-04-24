import { NextRequest, NextResponse } from 'next/server';
import { readRegion } from '@/lib/ai/vision-read';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, regionType, regionLabel } = await req.json();
    if (!imageDataUrl || !regionType || !regionLabel) {
      return NextResponse.json(
        { error: 'imageDataUrl, regionType, regionLabel required' },
        { status: 400 },
      );
    }

    const reading = await readRegion(imageDataUrl, regionType, regionLabel);
    return NextResponse.json({ reading });
  } catch (err) {
    console.error('read failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
