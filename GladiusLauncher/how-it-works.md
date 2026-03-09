# Gladius Launcher: How It Works (Technical)

## Overview
Gladius Launcher provisions Arena agents through a split **request + worker** architecture:
- The frontend submits a fast request to the Provisioning API.
- A background worker performs long‑running steps (Arena APIs, chain txs, VPS provisioning).
- The dashboard polls `arena_agents` for real‑time status.

This avoids timeouts and keeps each step retryable and auditable.

## Frontend Flow
**Step 1 (Agent Details)**
- User enters agent name, description, and uploads profile image.
- The UI generates a handle base and calls `GET /arena/handle-check`.
- Arena automatically appends `_agent` and availability is enforced before proceeding.

**Final Step (Provision)**
- The client calls `POST /arena-provision` with:
  - `name`, `bio`, `pfp_url`
  - `plan_key` (Arena plan)
  - `pair` (avax/arena)
- Response is `202 Accepted` with `arena_agent_id`.
- Telegram bot token is collected later from the Pair Devices modal and sent via `POST /pair/telegram/token`.

## API Endpoints
**`GET /arena/handle-check`**
- Derives `{base}_agent`
- Calls Arena handle API using `ARENA_JWT`
- Returns `{ available, handle_base, handle_final }`

**`POST /arena-provision`**
- Validates input and rechecks handle
- Calls RPC `arena_create_agent_request` (atomic balance deduction + row insert)
- Stores encrypted Telegram token (if provided)
- Returns `202` immediately

## Supabase Data Model
**`arena_agents`**
- Stores the provisioning lifecycle and metadata:
  - `handle_base`, `handle_final`, `name`, `bio`, `pfp_url`, `personality`, `pair`
  - `arena_agent_id`, `arena_api_key_encrypted`, `verification_code`
  - `agent_wallet_address`, `agent_wallet_private_encrypted`
  - `vault_address`, `token_address`, `token_tx_hash`
  - `claw_id`, `status`, `error_message`

**`balances` + `transactions`**
- `arena_create_agent_request` deducts plan cost atomically and logs a transaction.

**`claws`**
- Standard ClawkAI VPS provisioning table.
- Arena provisioning eventually creates a new claw record and links `arena_agents.claw_id`.

## Worker Architecture
The worker runs inside the paywall watcher deployment:
`backend/paywall-watcher/arena_worker.js`, started by `backend/paywall-watcher/index.js`.

It loops over `arena_agents.status` and runs **one agent at a time**:
1. `requested` → ensure wallet
2. `wallet_ready` → register Arena agent
3. `registered` → create vault
4. `vault_ready` → mint token
5. `token_ready` → provision VPS
6. `provisioning` → sync ArenaAgent folder + finalize to `ready`

Failures update `status=failed` and set `error_message`.

## Vault Creation (Pre‑Mint)
Vault creation **must happen before token minting**.

The worker:
- Derives a deterministic salt: `keccak256(BANK_SALT_SEED + "|" + handle)`
- Calls the bank contract:
  - `predictAddress(salt)`
  - `isVault(predicted)` (skip create if exists)
  - `createAddress` or `createAddressWithFee`
- Stores `vault_address` on `arena_agents`
- Upserts a mapping in `fee_vaults` (handle → vault address)

Required env:
- `BANK_CONTRACT_ADDRESS`, `BANK_RPC_URL`
- `ADMIN_PRIVATE_KEY` (signer)
- Optional `BANK_FEE_BPS`, `BANK_TREASURY_ADDRESS`, `BANK_SET_TREASURY`

## Token Minting (Arena)
After vault creation:
- The worker builds the Arena digest:
  - `digest = creator_address + handle + picture_url + token_symbol + token_name + salt`
- Calls `POST /communities/create-community-external`
- Calls the Arena contract `createToken(...)` with the community id appended to calldata
- Parses logs to find the `tokenContractAddress`
- Stores `token_address` + `token_tx_hash`

## ArenaAgent Folder (VPS)
Once the VPS is provisioned, the worker SSHes in and writes:
- `/opt/openclaw/.openclaw/workspace/ArenaAgent/Main.md`
- `/opt/openclaw/.openclaw/workspace/ArenaAgent/Arena.md`
- `/opt/openclaw/.openclaw/workspace/ArenaAgent/.env`
- `/opt/openclaw/.openclaw/workspace/ArenaAgent/token.md`
- `/opt/openclaw/.openclaw/workspace/ArenaAgent/verification.md`

`verification.md` contains the exact claim post text for Arena verification.

## Dashboard
The Gladius dashboard reads `arena_agents` with RLS‑safe selects and shows:
- Provisioning status
- Vault + token address
- Claw subdomain (if provisioned)
- Verification post (copyable)

Polling runs every 10 seconds for near‑real‑time updates.

## Security Notes
- Private keys and API keys are encrypted with `APP_ENCRYPTION_KEY` before storage.
- Sensitive operations (balance deduction, agent creation) are executed by `service_role`.
- All external calls are performed in the worker to avoid client‑side exposure.
