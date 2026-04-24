import { generateText, Output } from 'ai';
import { CalibrationResultSchema, type CalibrationResult } from '@/lib/types/schema';

const CALIBRATION_SYSTEM_PROMPT = `You are calibrating a prediction-market camera oracle.

Given an image from a phone camera, identify any scoreboards, score displays, game clocks, or scoring regions.

For each region you identify:
- Provide a bounding box [x, y, width, height] in pixels relative to the image
- Classify the semantic type (home_score, away_score, clock, period, player_score, counter, etc.)
- Give a human-readable label (e.g., "Home team score", "Game clock")
- Read the current value visible (null if not readable)
- Rate your confidence 0-100

Also identify:
- What kind of scoreboard this is (digital_led, handwritten_whiteboard, chalkboard, analog, mixed, none_visible)
- What sport or event appears to be in progress
- Any lighting, angle, or clarity concerns

If there is no scoreboard visible, still respond with scoreboardType: "none_visible" and an empty regions array, and explain in concerns.`;

/**
 * Takes an image (base64 data URL or remote URL) and returns structured bounding boxes + labels.
 * Used during the one-time calibration step when a streamer first points their phone at an event.
 */
export async function calibrateFromImage(imageInput: string): Promise<CalibrationResult> {
  const { output } = await generateText({
    model: 'google/gemini-2.5-pro',
    system: CALIBRATION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this image and identify all scoring regions. Return them with bounding boxes and labels.',
          },
          { type: 'image', image: imageInput },
        ],
      },
    ],
    output: Output.object({ schema: CalibrationResultSchema }),
  });

  return output;
}
