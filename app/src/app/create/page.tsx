'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Market } from '@/lib/types/schema';

const EXAMPLES = [
  'Basketball game between Trojans and Spartans at Rec Center Court 2. Winner is the team with higher final score.',
  'Dorm floor chess tournament — 8 players, single elimination. Winner is whoever wins the final match.',
  'Wings-eating contest — 3 contestants, whoever clears their plate of 20 wings first wins.',
  'Mario Kart tournament in the common room, 6 racers, best of 5 races, most first-place finishes wins.',
];

export default function CreatePage() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [market, setMarket] = useState<Market | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setMarket(null);
    try {
      const res = await fetch('/api/schema', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate schema');
      setMarket(data.schema);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-cyan-300 text-sm hover:underline mb-8 inline-block">
          ← Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Create a market</h1>
        <p className="text-white/60 mb-8">
          Describe your event in plain English. Claude Opus 4.7 will generate the market structure.
        </p>

        <div className="space-y-4 mb-8">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g., Our dorm is having a Smash Bros tournament, 8 players, single elimination…"
            rows={5}
            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setDescription(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
              >
                {ex.split('—')[0].trim().slice(0, 40)}…
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/10 disabled:text-white/40 text-black font-semibold transition"
          >
            {loading ? 'Generating market schema…' : 'Generate market'}
          </button>
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}
        </div>

        {market && (
          <div className="space-y-6 p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wide mb-1">Event</div>
              <div className="text-2xl font-bold">{market.eventName}</div>
              <div className="text-xs text-cyan-300 mt-1">{market.eventType}</div>
            </div>

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Outcomes</div>
              <div className="flex flex-wrap gap-2">
                {market.outcomes.map(o => (
                  <span key={o} className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-sm">
                    {o}
                  </span>
                ))}
              </div>
            </div>

            <Field label="Resolution criteria" value={market.resolutionCriteria} />
            <Field label="Camera setup" value={market.cameraSetupInstructions} />

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Visual cues to track</div>
              <ul className="space-y-1">
                {market.visualCuesToTrack.map((c, i) => (
                  <li key={i} className="text-sm text-white/80">
                    · {c}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Final-state conditions</div>
              <ul className="space-y-1">
                {market.finalStateConditions.map((c, i) => (
                  <li key={i} className="text-sm text-white/80">
                    · {c}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Ambiguity risks</div>
              <ul className="space-y-1">
                {market.ambiguityRisks.map((c, i) => (
                  <li key={i} className="text-sm text-yellow-300/80">
                    ⚠ {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-4 text-sm text-white/60">
              <div>
                Duration: <span className="text-white">{market.estimatedDurationMinutes}m</span>
              </div>
              <div>
                Stake: <span className="text-white">${market.minStakeUsdc}–${market.maxStakeUsdc} USDC</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-white/40 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm text-white/80">{value}</div>
    </div>
  );
}
