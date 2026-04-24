import { NextRequest, NextResponse } from 'next/server';
import { generateMarketSchema } from '@/lib/ai/schema-negotiator';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description (string) is required' }, { status: 400 });
    }

    const schema = await generateMarketSchema(description);
    return NextResponse.json({ schema });
  } catch (err) {
    console.error('schema generation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
