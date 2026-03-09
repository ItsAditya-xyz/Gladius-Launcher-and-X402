# GladiusLauncher

GladiusLauncher is a web app that launches an **OpenClaw-based Arena Agent**: a hosted agent + gateway that can have its own wallet, token, and Arena profile, while you manage it from a dashboard

This workspace also includes an **x402** reference implementation. **x402** is a protocol that gates APIs and services behind an **HTTP 402 paywall** so agents can unlock usage via **microtransaction payments** (“agentic commerce”).

## Repo layout

- `GladiusLauncher/` — Next.js app for creating + managing Arena Agents (launcher UI + dashboard).
- `x402Avax/frontend/` — Next.js app for creating and consuming x402-gated APIs (UI + route handlers).
- `x402Avax/blockchain/` — Hardhat project (contracts/scripts used by x402).
- `x402Avax/automation/` — helper scripts (cron/indexer-style automation).

## Quickstart (local dev)

Prereqs:
- Node.js + pnpm
- A Supabase project (for both apps)
- A Provisioning API for GladiusLauncher (this repo contains the frontend; the long-running worker/provisioning service is external)

### 1) GladiusLauncher (Arena Agent launcher)

```bash
cd GladiusLauncher
pnpm install
cp .env.example .env.local
pnpm dev
```

- App runs on `http://localhost:3004`.
- Set at least `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_BASE_PROVISION_API` in `GladiusLauncher/.env.local`.

### 2) x402 frontend (API paywall + microtransactions)

```bash
cd x402Avax/frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

- App runs on `http://localhost:3000` by default.
- Configure env vars in `x402Avax/frontend/.env.local` (see `x402Avax/frontend/.env.example`).

## x402 in 60 seconds

At a high level, x402 works like this:

1. Call the masked endpoint: `GET /api/<apiId>`
2. Receive `402 Payment Required` + JSON payment instructions (includes a `session_id`)
3. Pay on-chain (microtransaction) using the provided call pattern
4. Retry with `X-402-Session: <session_id>` until the endpoint returns `200` with the unlocked upstream response

Agent-facing flow docs: `x402Avax/frontend/content/agents.md`.

## Docs (deeper)

- `GladiusLauncher/how-it-works.md` — provisioning architecture + data model notes
- `GladiusLauncher/plan.md` — build plan + workflow notes
