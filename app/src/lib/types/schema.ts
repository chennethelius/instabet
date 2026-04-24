import { z } from 'zod';

// Market schema generated from natural-language event description
export const MarketSchema = z.object({
  eventName: z.string().describe('Short human-readable name of the event'),
  eventType: z
    .enum([
      'scoreboard_game',
      'multi_player_contest',
      'binary_outcome',
      'counted_items',
      'tournament_bracket',
      'timed_challenge',
      'custom',
    ])
    .describe('The category of event'),
  outcomes: z
    .array(z.string())
    .min(2)
    .describe('All possible outcomes users can bet on. Always include a tie/void option when appropriate.'),
  resolutionCriteria: z
    .string()
    .describe('Plain-English description of how the winner is determined'),
  visualCuesToTrack: z
    .array(z.string())
    .describe('What the camera needs to see to determine the outcome (e.g., "Final scoreboard", "Empty plate")'),
  finalStateConditions: z
    .array(z.string())
    .describe('Specific conditions that signal the event is over and resolvable'),
  cameraSetupInstructions: z
    .string()
    .describe('Instructions for the streamer on how to position the camera'),
  ambiguityRisks: z
    .array(z.string())
    .describe('Things that could make the outcome unclear or contested'),
  estimatedDurationMinutes: z.number().describe('How long the event is expected to last'),
  minStakeUsdc: z.number().default(1).describe('Minimum bet size in USDC'),
  maxStakeUsdc: z.number().default(20).describe('Maximum bet size per position in USDC'),
});

export type Market = z.infer<typeof MarketSchema>;

// Schema describing what the camera sees during calibration
export const CalibrationRegionSchema = z.object({
  bbox: z
    .array(z.number())
    .length(4)
    .describe('Bounding box as [x, y, width, height] in pixels relative to the source image'),
  type: z
    .enum(['home_score', 'away_score', 'clock', 'period', 'player_score', 'timer', 'counter', 'other'])
    .describe('Semantic type of this region'),
  label: z.string().describe('Human-readable label for this region (e.g., "Trojans score")'),
  currentValue: z.string().nullable().describe('Current value visible in this region'),
  confidence: z.number().min(0).max(100).describe('Model confidence 0-100'),
});

export const CalibrationResultSchema = z.object({
  scoreboardType: z
    .enum(['digital_led', 'handwritten_whiteboard', 'chalkboard', 'analog', 'mixed', 'none_visible'])
    .describe('What kind of scoreboard is visible'),
  sport: z.string().describe('Sport or event type inferred from the scene'),
  regions: z.array(CalibrationRegionSchema),
  concerns: z.array(z.string()).describe('Any lighting, visibility, or clarity issues to flag'),
  overallConfidence: z.number().min(0).max(100),
});

export type CalibrationResult = z.infer<typeof CalibrationResultSchema>;
export type CalibrationRegion = z.infer<typeof CalibrationRegionSchema>;

// Single live reading from a cropped region
export const RegionReadingSchema = z.object({
  value: z.string().describe('The value read from this region (e.g., "42", "2:15", "Q3")'),
  confidence: z.number().min(0).max(100),
  notes: z.string().optional().describe('Any caveats about the reading'),
});

export type RegionReading = z.infer<typeof RegionReadingSchema>;

// Triple-LLM resolution result
export const TripleVerifyResultSchema = z.object({
  geminiReading: RegionReadingSchema,
  claudeReading: RegionReadingSchema,
  gptReading: RegionReadingSchema,
  consensus: z.enum(['triple_verified', 'majority_verified', 'disputed']),
  consensusValue: z.string().nullable(),
  reasoning: z.string(),
});

export type TripleVerifyResult = z.infer<typeof TripleVerifyResultSchema>;
