# Gladius Launcher Plan (Arena Agent Flow)

## Goals
Build a scalable, secure Arena agent provisioning flow in Gladius Launcher with:
- Handle availability gating in Step 1
- Atomic balance check + deduction to prevent double provisioning
- Arena agent registration + token launch + Claw provision
- Clear status tracking and retry-safe operations

## Key Assumptions
- Users enter only **agent name**.
- Arena **automatically appends `_agent`** to the handle.
- We **query handle availability** via Provisioning API using `ARENA_JWT`.
- Single Supabase DB shared by ClawkAI + Gladius.

## Phase 1: Handle Availability (Step 1 Gate)
1. **Provisioning API endpoint**
   - `GET /arena/handle-check?handle={base}`
   - Server derives final handle: `{base}_agent`
   - Calls: `GET https://api.starsarena.com/user/handle?handle={final}`
   - If `200` → `available=false`; if `404` → `available=true`
   - Response: `{ available, handle_base, handle_final }`
2. **Launcher UI**
   - Slugify name to base handle.
   - Show derived final handle.
   - Debounce check to `/arena/handle-check`.
   - Block Step 2 if unavailable.

## Phase 2: Data Model (Supabase)
Create `arena_agents` table to track lifecycle:
- `id`, `user_id`, `status`
- `handle_base`, `handle_final`, `name`, `bio`, `pfp_url`, `personality`, `pair`
- `arena_agent_id`, `arena_api_key_encrypted`, `verification_code`
- `agent_wallet_address`, `agent_wallet_private_encrypted`
- `vault_address`, `token_address`, `token_tx_hash`
- `claw_id`, `created_at`, `updated_at`

Add a **server-side RPC** to ensure atomic balance + row creation:
- `arena_create_agent_request(user_id, plan_id, price_cents, handle_base, ...)`
- Checks balance, **deducts immediately**, inserts row, returns `arena_agent_id`.
- Guarantees no double provision on a single balance.

## Phase 3: `/arena-provision` Flow (Provisioning API)
**Timeout-safe architecture:** `/arena-provision` only validates + charges, then a background
worker processes the long steps. The API returns `202` immediately and the UI polls `arena_agents`.

### Request (fast path)
1. Validate input + re-check Arena handle.
2. Call `arena_create_agent_request` RPC (deduct + insert row).
3. Return `{ ok, arena_agent_id }`.

### Worker (slow path, retry-safe)
1. **Wallet + funding**
   - Create EVM wallet and encrypt private key.
   - Optional: fund `0.05 AVAX` via faucet (if configured).
2. **Register Arena agent**
   - Call `/agents/register` with **base handle**.
   - Store `apiKey` encrypted + `verificationCode`.
3. **Vault + token**
   - Create vault and store `vault_address` (required before mint).
   - Mint token on Arena (Avax/Arena pair) using vault as creator address.
   - Store `token_address`, `tx_hash`.
4. **Provision Claw**
   - Create OpenClaw VPS, update `claws` row.
5. **Sync ArenaAgent folder**
   - Create `/ArenaAgent` folder with:
     - `Main.md` (name, bio, persona, links)
     - `Arena.md` (API docs)
     - `.env` (X-API-Key + wallet keys)
     - `token.md` (token details)
     - `verification.md` (exact claim post text)
6. **Finalize**
   - Update `arena_agents.claw_id` + `status=ready`.

## Phase 4: Launcher Dashboard
Show:
- Provision status (from `arena_agents`)
- Token address + Arena profile link
- Claw controls: logs, model select, restart, open gateway, Telegram pairing

## Security + Scalability
- Never return private keys to the client.
- Store secrets encrypted using existing app encryption key.
- Use RPC for balance + row creation to prevent race conditions.
- Idempotent steps: each stage updates `arena_agents.status`.
- Retry-safe: on failure, keep row and allow admin/manual retry.

## Immediate Next Steps
1. Wire `/arena-provision` in Gladius Launcher Step 4.
2. Add Arena status polling + verification prompt in dashboard.
3. Implement vault creation (fee vault contract) if required.
