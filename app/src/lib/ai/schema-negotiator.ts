import { generateText, Output } from 'ai';
import { MarketSchema, type Market } from '@/lib/types/schema';

const SCHEMA_SYSTEM_PROMPT = `You are helping design a peer-to-peer prediction market for a real-world event.

Given a natural-language description of an event, produce a structured market schema that includes:
- The possible outcomes (always include a tie/void option when reasonable)
- How the winner is determined (resolution criteria)
- What a camera needs to see to verify the outcome (visual cues)
- Final-state conditions that indicate the event is over
- Camera setup instructions for the streamer
- Ambiguity risks (what could go wrong)
- Estimated duration

Be specific and practical. Assume this will be used by real people at real venues with phones as cameras.`;

/**
 * Takes a natural-language event description and returns a structured market schema.
 *
 * @example
 *   await generateMarketSchema("Our dorm is having a chess tournament, 4 players, whoever wins the final match wins")
 */
export async function generateMarketSchema(description: string): Promise<Market> {
  const { output } = await generateText({
    model: 'anthropic/claude-sonnet-4.5',
    system: SCHEMA_SYSTEM_PROMPT,
    prompt: `Event description from user:\n\n"${description}"\n\nGenerate the market schema.`,
    output: Output.object({ schema: MarketSchema }),
  });

  return output;
}
