# Instabet

Solana-native peer-to-peer prediction markets with vision-LLM oracle.

Scan a QR at any event. Bet on the outcome. Three AIs watch and judge. Settled in seconds.

**Status:** Building for Solana Frontier Hackathon (submission May 11, 2026)

## Stack
- Next.js 16 PWA + TypeScript + Tailwind
- Vercel AI SDK 5 (Gemini 2.5 Pro + Claude Opus 4.7 + GPT-5 Vision)
- Solana + Anchor (Phase 2)
- Phantom Embedded Wallet / Privy

## Dev
```bash
pnpm install
cp .env.example .env.local  # add API keys
pnpm dev
```

See [`PRD.md`](./PRD.md) and [`TECH_STACK.md`](./TECH_STACK.md) for details.
