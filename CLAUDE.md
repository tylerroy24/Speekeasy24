# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Vite frontend on :5173 (proxies /api,/webhooks,/health to :3001)
npm run dev:server  # Express backend on :3001 with node --watch
npm run dev:all     # Both concurrently (use this for full-stack work)
npm run build       # vite build → dist/
npm start           # NODE_ENV=production node server.js (serves dist/ + API)
node cluster.js     # Multi-worker production process (one worker per CPU)
```

There is no test suite, linter, or typechecker configured — do not invent commands for them.

## Architecture

This is a **dual-deploy** SaaS: the same `server.js` Express app runs either as a long-lived Node process (self-host / `cluster.js`) **or** as a Vercel serverless function (`api/index.js` re-exports `server.js`, and `vercel.json` rewrites `/api/*` and `/webhooks/*` to it). The `if (process.env.VERCEL !== '1')` guard at the bottom of `server.js` is what prevents `app.listen` from running on Vercel — preserve it.

**Frontend / backend split.** React 18 SPA in `src/` (React Router routes in `src/App.jsx`, protected by `ProtectedRoute`). In dev, `vite.config.js` proxies `/api`, `/webhooks`, `/health` and `/ws` to `localhost:3001`. In production, Express serves the built `dist/` itself when `NODE_ENV=production` and `VERCEL !== '1'`; on Vercel, the static build is served by the platform and only `/api/*` hits the function.

**ElevenLabs proxy pattern.** The ElevenLabs API key lives **only** server-side as `ELEVENLABS_API_KEY`. The browser never touches it. `src/lib/elevenlabs.js` exposes a `useElevenLabs(token)` hook that fetches `/api/el/*` on our own backend; `server.js` adds the `xi-api-key` header via the internal `elFetch()` helper and forwards to `https://api.elevenlabs.io/v1`. Always add new ElevenLabs functionality as a new `/api/el/*` route — never call ElevenLabs from the client.

**Auth — dual mode, gated by env presence.** Supabase is the production auth/DB layer, but the app degrades to localStorage when Supabase env vars are missing or contain `"placeholder"`:
- Client: `src/context/AuthContext.jsx` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. If unset → localStorage user.
- Server: `requireAuth` middleware in `server.js` **skips auth entirely when `NODE_ENV !== 'production'`** so local dev works without Supabase. In production it validates the `Authorization: Bearer <jwt>` against Supabase. The client passes the Supabase JWT through `useElevenLabs(token)`.
- Same gating in `src/lib/storage.js`: `IS_SUPABASE` flips reads/writes between Supabase tables and localStorage (keyed per-user via `userKey()`).

**Database.** Two Supabase tables (see `supabase-schema.sql`, both RLS-protected by `auth.uid() = user_id`):
- `calls` — every outbound/inbound call, queried by `/api/analytics` and `src/hooks/useCalls.js`.
- `user_agents` — ownership map from Supabase user → ElevenLabs `agent_id`. ElevenLabs itself has no concept of per-user agents, so `/api/el/agents/mine` filters the global agent list against this table. New agent creation must call `/api/el/agents/:id/register` to record ownership, or the user won't see their own agent.

**Live events — polling, not WebSockets.** The repo previously used Socket.IO/WS but switched to polling for Vercel compatibility (see git log: "replace WebSocket with polling"). `server.js` keeps an in-memory `eventQueue` (last 100 events); `src/hooks/useCallEvents.js` polls `/api/events?since=<ts>` every 4s. The queue is per-instance — on Vercel or multi-worker `cluster.js`, events broadcast on one instance won't reach pollers on another. Do not reintroduce WebSockets without addressing the Vercel constraint.

**Webhooks → broadcast → CRM fan-out.** `/webhooks/elevenlabs` and `/webhooks/twilio/status` verify signatures, then call `broadcast()` (pushes to `eventQueue` for the Live Monitor) **and** `fireCRMWebhooks()` which POSTs to each user-registered webhook in the in-memory `crmWebhooks` Map. That Map is also per-instance and resets on cold start — fine for a hobby tier but not durable. Note: `verifyElevenLabsSignature` and `verifyTwilioSignature` are *called* but not defined in the file at the lines shown; check whether they were lost in a refactor before relying on the verification.

**Rate limiting & idempotency.** `express-rate-limit` with separate buckets (`standardLimiter`, `chatLimiter`, `contactLimiter`, `callLimiter`). When `REDIS_URL` is set, state is shared across workers via `rate-limit-redis` + `ioredis`; otherwise per-instance memory. Mutating routes (`/api/el/agents` POST, `/api/el/call`, `/api/transfer`) accept an `Idempotency-Key` header backed by an in-memory map with 24h TTL.

**Design system.** Tailwind config in `tailwind.config.js`; CSS tokens in `src/index.css`. Palette: `--ink` `#0A0A0F`, `--surface` `#111118`, `--panel` `#16161F`, `--lime` `#C8F53A` (primary accent), `--coral` `#FF5C3A`, `--violet` `#7B5CF0`, `--cream` `#F0EEE6`. Fonts: Syne (display), DM Sans (body), DM Mono (mono).

## Environment variables

Server-side (never `VITE_`-prefixed):
- `ELEVENLABS_API_KEY` — required for any `/api/el/*` route to work.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — required in production for `requireAuth` and per-user filtering.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — for `/api/transfer` and `/api/sms/send`.
- `ANTHROPIC_API_KEY` — for `/api/chat` (landing-page chatbot, uses `claude-haiku-4-5-20251001`).
- `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`, `CONTACT_EMAILS` (comma-separated) — for `/api/contact`.
- `REDIS_URL` — optional, enables cross-instance rate-limit state.
- `ALLOWED_ORIGIN` — CORS lockdown in prod; dev is open. `INTERNAL_SECRET` gates `/health/internal`.

Client-side (must be `VITE_`-prefixed to be bundled):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — flips the app from localStorage mode to Supabase mode.

## Conventions worth knowing

- Pure-JS React (no TypeScript). `.jsx` files, ESM (`"type": "module"`).
- One Express app, ~800 lines in `server.js` — keep adding routes there rather than splitting, the Vercel entry assumes a single default export.
- New protected dashboard pages: add to `src/App.jsx` wrapped in `<ProtectedRoute>` and to `src/components/Sidebar.jsx`.
- `restore_el_routes.cjs` and `fix_requireauth.cjs` are one-shot migration scripts kept around for history; don't extend them.
