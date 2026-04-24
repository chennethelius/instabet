# Instabet — Product Requirements Document

**Version:** 1.0
**Date:** April 23, 2026
**Submission Target:** Solana Frontier Hackathon — May 11, 2026

---

## TL;DR

Instabet is a Solana-native peer-to-peer prediction market platform that lets anyone create a live market on any real-world event they can physically witness. A vision-LLM triple-oracle (Gemini 2.5 Pro + Claude Opus 4.7 + GPT-5 Vision) reads scoreboards and visible cues to settle markets in seconds with cryptographic verifiability. A physical QR sticker at the venue or a single URL spins up a live market. No app install. No house. No bookmaker.

---

## Vision

> Every observable event is a market. Anyone can create one. Three AIs watch and judge. Money moves in seconds.

---

## The Problem

- Prediction markets today (Polymarket, Kalshi) cover only events with pre-existing data oracles (politics, macro, pro sports).
- Local and amateur events — 1000× more numerous — have no oracle and therefore no market.
- Creating a custom market today requires technical skill, trusted escrow, and manual resolution.
- Peer-to-peer social betting is a $multi-billion cash/Venmo category with zero trust infrastructure.

---

## Target Users

**Bettors (primary):**
- College students (intramural sports, dorm games, social contests)
- Rec-league players / parents at youth sports
- Casual participants in informal competitions

**Event Creators (secondary):**
- Students organizing floor/club events
- League organizers and tournament hosts
- Venues (coffee shops, pool halls) hosting recurring competitions

**Streamers (supporting role):**
- Volunteers at the venue (phone on tripod)
- Paid streamers earning 1% of protocol fee
- Future: permanently installed cameras at fixed venues

---

## Legal / Regulatory Framing

### The peer-to-peer / contract framing

Instabet is a P2P prediction-contract protocol, not a bookmaker. The protocol never takes the opposite side of any bet. All positions are matched between users. There is no house edge, no bookmaker margin — only a small protocol fee (like an exchange, not a casino).

This positions Instabet closer to futures/derivatives markets than to gambling, which is the same framing Polymarket and Kalshi use.

### Scope limits for v1

- Cap individual positions at $20
- Amateur and local events only (no pro leagues)
- No explicit sportsbook marketing language
- 18+ age gate
- Devnet USDC for hackathon (no real stakes)
- Protocol is open-source, decentralized on Solana

### Honest caveats

- US regulation is a state-by-state patchwork
- CFTC may claim jurisdiction over event contracts
- A real business would pursue DCM application or jurisdictional partnership
- Not a topic for v1 demo, but will be addressed post-hackathon

---

## Core Features (v1 MVP)

### 1. Create Custom Event (Natural Language → Market)
- Creator types event description in plain English
- AI parses into structured market schema (outcomes, resolution criteria, visual cues)
- User reviews + confirms
- QR sticker + shareable URL generated

### 2. Camera Calibration (Scoreboard Recognition)
- Streamer points phone at scoreboard / visible event element
- AI (Gemini Vision) describes what it sees with bounding boxes
- User taps to confirm / relabel / reject regions
- Schema saved with regions-of-interest

### 3. Place Bet
- User scans QR or opens event URL
- Sees live odds, pool size, time remaining
- Picks outcome, enters amount (max $20 v1), confirms via Phantom Embedded Wallet
- Position locked on-chain

### 4. Live Stream + Monitor
- Streamer phone uploads frames every 5 seconds
- Backend crops frames to saved regions
- Gemini reads cropped regions → timeline stored
- Multi-frame consensus ensures stability

### 5. Multi-LLM Resolution (Core Feature)
- At final state, three LLMs read in parallel: **Gemini 2.5 Pro + Claude Opus 4.7 + GPT-5 Vision**
- 2/3 majority required to auto-resolve
- "Triple Verified" badge when 3/3 agree
- Disagreement → dispute window

### 6. Payout + Claim
- Resolution written on-chain
- Winners auto-notified
- One-tap claim → USDC transferred to user wallet

### 7. Dispute Window
- 10 minutes after proposed resolution
- Any participant can dispute with 10% position stake
- Dispute triggers 4th-LLM re-read + manual admin review (v1)

---

## Features Out of Scope (v1)

- Professional sports (regulated, complex)
- Mainnet real-money operations (devnet only for hackathon)
- Native iOS/Android apps (PWA only)
- Multi-language support (English only v1)
- Credit extension
- Mobile wallet integration beyond Phantom Embedded/Privy
- Real-time websockets (polling every 10s is fine for v1)

---

## Architecture

```
    ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
    │  Bettor     │◄────►│              │◄────►│ Solana      │
    │  (PWA)      │      │   Instabet   │      │ Mainnet/    │
    └─────────────┘      │   Backend    │      │ Devnet      │
                         │              │      └─────────────┘
    ┌─────────────┐      │  ┌─────────┐ │      ┌─────────────┐
    │  Streamer   │─────►│  │ Oracle  │ │◄────►│ Triple LLM  │
    │  (PWA)      │      │  │ Service │ │      │ (Gemini,    │
    └─────────────┘      │  └─────────┘ │      │  Claude,    │
                         │              │      │  GPT-5)     │
    ┌─────────────┐      │              │      └─────────────┘
    │  Creator    │─────►│              │      ┌─────────────┐
    │  (PWA)      │      │              │◄────►│ Claude      │
    └─────────────┘      └──────────────┘      │ (schema     │
                                               │  reasoning) │
                                               └─────────────┘
```

Components:

- **A. Frontend (PWA, Next.js 16)** — event pages, streamer page, creator page, camera + wallet integration
- **B. Backend (Next.js API routes on Vercel)** — schema negotiator, frame ingestion, oracle orchestration
- **C. Oracle Service** — Gemini schema + live frame reads, triple-LLM consensus, resolution proposer
- **D. Data Layer (deferred v1)** — in-memory only; Postgres + Blob + Redis in v1.5
- **E. On-Chain (Anchor program)** — market creation, betting, resolution, claims, disputes

---

## Wallet + Payments Stack

- **Primary:** Phantom Embedded Wallet (Frontier primary sponsor, Solana-native)
- **Secondary:** Privy (Frontier sponsor, email-first fallback)
- **On-ramp:** MoonPay Apple Pay (Frontier sponsor, v2)
- **Proof-of-humanity:** World ID (Frontier sponsor, v2 high-stakes markets)

---

## The Triple-LLM Oracle — Core Innovation

Every market resolution runs through three frontier vision models in parallel:

```
Final 30-sec of frames → crop to regions → parallel call:
  ├── Gemini 2.5 Pro Vision
  ├── Claude Opus 4.7 Vision
  └── GPT-5 Vision
          ↓
   Consensus Engine:
     3/3 agree → "Triple Verified" (gold badge)
     2/3 agree → "Majority Verified" (passes with soft-flag)
     Split    → Dispute window + admin review
          ↓
   Anchor instruction → on-chain settlement
          ↓
   10-minute dispute window
          ↓
   Final settlement + payouts
```

Cost per resolution: ~$0.01 (trivial). The three-model agreement is the product's trust layer — the thing that makes the oracle credible to users and judges.

---

## Custom Event System (The Big Unlock)

v1 doesn't hard-code sports templates. Creators describe events in natural language:

> "Our dorm is having a Smash Bros tournament, 8 players, single elimination. Winner is whoever wins the final bracket match."

Claude (reasoning model) parses into:
- Outcomes (8 possible winners)
- Resolution criteria (bracket final)
- Visual cues (game-screen state, winner announcement)
- Setup instructions (camera on TV, capture winner screen)
- Ambiguity risks (player disconnections, rule disputes)

Creator reviews the schema, confirms, and the market goes live.

**This turns every observable event into a market.** Intramural basketball is v1. Everything else follows.

---

## Non-Functional Requirements

- **Performance:** Frame read within 3 seconds of upload. Bet placement < 15 seconds end-to-end. Resolution < 10 seconds after final state detected.
- **Availability:** 99% uptime during active markets (best-effort for hackathon demo).
- **Security:** Frame hash chains, anti-replay, streamer bonds, multi-LLM validation.
- **Privacy:** User wallets pseudonymous; markets public by default; Arcium integration for private markets v2.
- **Accessibility:** Works on any mobile browser with HTTPS. Tested on iOS Safari + Android Chrome.

---

## Success Criteria (Hackathon)

- 3+ real events created and settled end-to-end
- 10+ unique real users placing real bets
- Oracle accuracy > 90% on digital scoreboards
- Demo video cinematic, filmable in 1-2 takes
- Submitted to Colosseum before May 11

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Gemini misreads scoreboard | High | Multi-frame consensus + 3-LLM verification |
| Pre-recorded loop attacks | Medium | Optical flow + phone sensor signatures |
| Regulatory exposure | Medium | Small caps, amateur events, open-source framing |
| Custom event fails on ambiguous events | Medium | User confirmation + low-confidence flags |
| Streamer mid-game abandonment | Medium | Auto-pause + grace period + refund fallback |
| Real-venue demo logistics | High | Multiple backup scenarios (park, dorm, staged) |

---

## Development Timeline

See `TIMELINE.md`.

---

## Open Questions

- Streamer bond sizing: fixed $5 vs. proportional 10%? (v1: fixed $5 for simplicity)
- Tie handling: void vs. split? (v1: always include tie/void outcome, split evenly)
- Protocol fee split: (v1: 1% total; 0.3% streamer, 0.3% creator, 0.4% protocol)
- LLM disagreement threshold: 2/3 vs. 3/3? (v1: 2/3 passes with "Majority" badge, 3/3 is "Triple")
