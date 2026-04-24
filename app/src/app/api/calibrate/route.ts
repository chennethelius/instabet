import { NextRequest, NextResponse } from 'next/server';
import { calibrateFromImage } from '@/lib/ai/vision-calibrate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json({ error: 'imageDataUrl (base64 data URL) is required' }, { status: 400 });
    }

    const calibration = await calibrateFromImage(imageDataUrl);
    return NextResponse.json({ calibration });
  } catch (err) {
    console.error('calibration failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
