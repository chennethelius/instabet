import { generateText, Output } from 'ai';
import {
  RegionReadingSchema,
  TripleVerifyResultSchema,
  type RegionReading,
  type TripleVerifyResult,
} from '@/lib/types/schema';

const FINAL_READ_SYSTEM_PROMPT = `You are the final judge of a prediction market.

Read the value from the provided image. This is a critical reading that determines real payouts. Be conservative — if anything is unclear, say so with a low confidence score.

Return the reading as a string value.`;

async function readWithModel(model: string, imageInput: string, regionLabel: string): Promise<RegionReading> {
  const { output } = await generateText({
    model,
    system: FINAL_READ_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Read the final value for the "${regionLabel}" region. This determines market resolution.`,
          },
          { type: 'image', image: imageInput },
        ],
      },
    ],
    output: Output.object({ schema: RegionReadingSchema }),
  });

  return output;
}

function computeConsensus(
  gemini: RegionReading,
  claude: RegionReading,
  gpt: RegionReading,
): Pick<TripleVerifyResult, 'consensus' | 'consensusValue' | 'reasoning'> {
  const values = [gemini.value.trim(), claude.value.trim(), gpt.value.trim()];

  // All 3 agree?
  if (values[0] === values[1] && values[1] === values[2]) {
    return {
      consensus: 'triple_verified',
      consensusValue: values[0],
      reasoning: `All three models (Gemini, Claude, GPT-5) read "${values[0]}" independently. Triple-verified.`,
    };
  }

  // 2/3 agree?
  const counts = values.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  const [top, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (topCount >= 2) {
    const dissenter = values.findIndex(v => v !== top);
    const dissenterName = ['Gemini', 'Claude', 'GPT-5'][dissenter];
    return {
      consensus: 'majority_verified',
      consensusValue: top,
      reasoning: `Two of three models agreed on "${top}". ${dissenterName} dissented with "${values[dissenter]}". Proceeding with majority.`,
    };
  }

  return {
    consensus: 'disputed',
    consensusValue: null,
    reasoning: `All three models disagreed: Gemini="${values[0]}", Claude="${values[1]}", GPT-5="${values[2]}". Escalating to dispute.`,
  };
}

/**
 * Runs Gemini, Claude, and GPT-5 in parallel on the same image and computes consensus.
 * Used at final-state resolution time — this is the core trust layer.
 */
export async function tripleVerify(imageInput: string, regionLabel: string): Promise<TripleVerifyResult> {
  const [gemini, claude, gpt] = await Promise.all([
    readWithModel('google/gemini-2.5-pro', imageInput, regionLabel),
    readWithModel('anthropic/claude-sonnet-4.5', imageInput, regionLabel),
    readWithModel('openai/gpt-5', imageInput, regionLabel),
  ]);

  const { consensus, consensusValue, reasoning } = computeConsensus(gemini, claude, gpt);

  return {
    geminiReading: gemini,
    claudeReading: claude,
    gptReading: gpt,
    consensus,
    consensusValue,
    reasoning,
  };
}
