import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-3 mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold tracking-wide uppercase">
            Solana Frontier · 2026
          </div>
          <h1 className="text-5xl font-bold tracking-tight">Instabet</h1>
          <p className="text-xl text-white/70 max-w-xl">
            Peer-to-peer prediction markets for any real-world event. Three AIs watch and judge. No house, no bookmaker.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Link
            href="/create"
            className="group block p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/30 hover:border-cyan-400 transition"
          >
            <div className="text-sm text-cyan-300 mb-2">Create</div>
            <div className="text-xl font-semibold mb-1">Host an event</div>
            <div className="text-sm text-white/60">
              Describe your event in plain English. AI generates the market structure. Print a QR sticker.
            </div>
          </Link>

          <Link
            href="/calibrate"
            className="group block p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/30 hover:border-violet-400 transition"
          >
            <div className="text-sm text-violet-300 mb-2">Calibrate</div>
            <div className="text-xl font-semibold mb-1">Test the camera oracle</div>
            <div className="text-sm text-white/60">
              Point your phone at a scoreboard. See AI identify regions in real-time.
            </div>
          </Link>
        </div>

        <div className="space-y-4 text-sm text-white/60">
          <div className="flex items-baseline gap-3">
            <span className="text-white/30 font-mono w-6">01</span>
            <span>Three models verify every resolution: Gemini 2.5 Pro, Claude Opus 4.7, GPT-5 Vision.</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-white/30 font-mono w-6">02</span>
            <span>Native Solana settlement via Anchor. Sub-cent fees, instant payouts.</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-white/30 font-mono w-6">03</span>
            <span>Creates markets for events Polymarket and Kalshi can&apos;t touch — your local, amateur, long-tail.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
