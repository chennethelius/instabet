import { NextRequest, NextResponse } from 'next/server';
import { tripleVerify } from '@/lib/ai/triple-verify';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, regionLabel } = await req.json();
    if (!imageDataUrl || !regionLabel) {
      return NextResponse.json({ error: 'imageDataUrl, regionLabel required' }, { status: 400 });
    }

    const result = await tripleVerify(imageDataUrl, regionLabel);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('triple-verify failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
