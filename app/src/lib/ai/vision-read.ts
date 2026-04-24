import { generateText, Output } from 'ai';
import { RegionReadingSchema, type RegionReading } from '@/lib/types/schema';

const READ_SYSTEM_PROMPT = `You are reading a single value from a cropped image of a scoreboard region.

The image contains ONE data point — a number, time, or short label. Read it carefully.

Return the value as a string. If the image is blurry, occluded, or unclear, set confidence below 50 and note why.

Never guess. Unclear readings should be marked as such.`;

/**
 * Reads a single value (e.g., a score number, a clock time) from a cropped image.
 * Used for live monitoring — called repeatedly on each region during a game.
 */
export async function readRegion(imageInput: string, regionType: string, regionLabel: string): Promise<RegionReading> {
  const { output } = await generateText({
    model: 'google/gemini-2.5-pro',
    system: READ_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `This is a cropped region showing the "${regionLabel}" (type: ${regionType}). What is the current value?`,
          },
          { type: 'image', image: imageInput },
        ],
      },
    ],
    output: Output.object({ schema: RegionReadingSchema }),
  });

  return output;
}
