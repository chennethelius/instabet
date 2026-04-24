# Instabet — Tech Stack

## Decisions (locked for v1)

### Frontend
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Industry standard, Vercel-native, PWA-ready, server components |
| UI Runtime | **React 19** | Latest stable |
| Language | **TypeScript** | Type safety, AI SDK integration |
| Styling | **Tailwind CSS v4** | Fast iteration, mobile-first |
| Components | **shadcn/ui** | Accessible, composable, customizable |
| PWA | **@serwist/next** | Next.js 16-compatible service worker |

### Camera
| Concern | Choice |
|---|---|
| Access API | **Native `getUserMedia`** (no wrapper lib) |
| React pattern | `useRef` + `<video>` + `useEffect` |
| Capture | `canvas.toBlob()` for frames, `HTMLVideoElement.captureStream()` for streaming |
| Wake-lock | Native `navigator.wakeLock` API |
| Photo constraints | `{ video: { facingMode: 'environment', width: 1280, height: 720 } }` |

Why no library: `react-webcam` is fine but limits flexibility. We need custom overlays, region cropping, and frame-rate control — all easier with native APIs directly.

### AI / LLMs
| Purpose | Stack |
|---|---|
| Unified LLM interface | **Vercel AI SDK 5** (`ai`, `@ai-sdk/*`) |
| Schema reasoning (NL → market schema) | **Claude Opus 4.7** via `@ai-sdk/anthropic` |
| Primary vision oracle | **Gemini 2.5 Pro** via `@ai-sdk/google` |
| Verifier #2 | **Claude Opus 4.7 Vision** |
| Verifier #3 | **GPT-5 Vision** via `@ai-sdk/openai` |
| Structured output | `generateObject` + Zod schemas |
| Env access | Google AI Studio API key, Anthropic API key, OpenAI API key |

Why AI SDK: one API for all three vision models. Swap providers with a line change. Structured output via `generateObject` is clean.

### Image processing
| Concern | Choice |
|---|---|
| Client-side cropping | **Canvas API** (crop to bounding boxes before upload) |
| Server-side (if needed) | **sharp** (for resizing/compression) |
| Bounding box overlay | **Custom SVG** over `<video>` element (simpler than any lib) |
| Optical flow (v2 anti-loop) | TBD — probably `opencv.js` in browser or `opencv-python` server-side |

### Storage (deferred per user — in-memory for v1 scaffold)
| Eventual | Choice |
|---|---|
| Frames | **Vercel Blob** |
| State | **Neon Postgres** + Prisma |
| Live cache | **Upstash Redis** |

### Solana (deferred, Phase 2)
| Concern | Choice |
|---|---|
| Program framework | **Anchor** (Rust) |
| JS client | **@solana/web3.js** + `@coral-xyz/anchor` |
| Wallet primary | **Phantom Embedded Wallet** (Frontier sponsor) |
| Wallet secondary | **Privy** (Frontier sponsor, email-first) |
| On-ramp (v2) | **MoonPay** (Frontier sponsor) |

### Deploy
| Concern | Choice |
|---|---|
| Hosting | **Vercel** |
| Env vars | Vercel env |
| Domain | TBD (instabet.app / instabet.gg / skip for now) |

---

## Package list (initial `package.json`)

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "ai": "^5.0.0",
    "@ai-sdk/google": "^2.0.0",
    "@ai-sdk/anthropic": "^2.0.0",
    "@ai-sdk/openai": "^2.0.0",
    "zod": "^3.23.0",
    "tailwindcss": "^4.0.0",
    "@serwist/next": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0"
  }
}
```

(Actual versions resolved at install — using latest as of 2026-04-23.)

---

## Why NOT certain alternatives

- **react-webcam** — adequate but inflexible for custom overlays. Going native.
- **react-image-annotate** — overkill; we only need bounding boxes, not polygons.
- **OpenAI SDK directly** — fine for one provider but AI SDK is better for 3-provider setup.
- **LangChain** — heavy, unnecessary abstraction.
- **Replicate / HuggingFace vision APIs** — slower, less accurate than frontier LLMs.
- **Supabase / Firebase** — Next.js + Neon + Blob is lighter and Vercel-native.
- **Wagmi / RainbowKit** — Ethereum-first; not relevant for Solana.

---

## API Key requirements (for local dev)

```bash
# .env.local
GEMINI_API_KEY=...       # Google AI Studio
ANTHROPIC_API_KEY=...    # Anthropic Console
OPENAI_API_KEY=...       # OpenAI Platform

# Later (Phase 2+)
NEXT_PUBLIC_PRIVY_APP_ID=...
PHANTOM_EMBEDDED_KEY=...
SOLANA_RPC=https://api.devnet.solana.com
```

---

## File structure (target)

```
instabet/
├── app/
│   ├── page.tsx                # Landing
│   ├── layout.tsx              # Root layout, PWA manifest
│   ├── create/page.tsx         # NL → market schema
│   ├── event/[id]/page.tsx     # Event detail / bet placement
│   ├── stream/[id]/page.tsx    # Streamer camera view
│   ├── me/page.tsx             # User's bets
│   └── api/
│       ├── schema/route.ts     # POST: NL → market schema
│       ├── calibrate/route.ts  # POST: image → bounding boxes
│       ├── read/route.ts       # POST: cropped image → score reading
│       └── resolve/route.ts    # POST: final frames → triple-LLM consensus
├── components/
│   ├── CameraStream.tsx        # Video element + getUserMedia
│   ├── BboxOverlay.tsx         # SVG overlay for regions
│   ├── CreateEventForm.tsx     # Textarea + generated schema preview
│   └── ui/                     # shadcn components
├── lib/
│   ├── ai/
│   │   ├── schema-negotiator.ts  # Claude: NL → schema
│   │   ├── vision-calibrate.ts   # Gemini: image → bboxes
│   │   ├── vision-read.ts        # Gemini: cropped → value
│   │   └── triple-verify.ts      # Parallel Gemini+Claude+GPT5
│   ├── types/
│   │   └── schema.ts            # Zod schemas for market, bets, resolutions
│   └── utils/
│       ├── canvas.ts            # Crop image to bbox
│       └── frames.ts            # Frame upload helpers
├── public/
│   ├── manifest.json            # PWA manifest
│   └── icons/
├── PRD.md
├── TECH_STACK.md
├── TIMELINE.md
└── README.md
```

---

## Development principles

1. **Ship end-to-end first, polish later.** Every phase ends in a working demo.
2. **Single-provider each for v1, multi-provider at resolution only.** Gemini for setup + reads; all three for final resolution.
3. **Structured output everywhere.** No free-form parsing; Zod + `generateObject` or equivalent.
4. **Defer DB/auth until needed.** In-memory state is fine through Phase 1-2.
5. **Mobile-first always.** Every page tested on an actual phone first.
6. **One working integration beats three half-integrations.** Only one agent/venue/sport for v1 demo.
