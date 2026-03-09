# ArenaX402 Agent Guide

This document is for LLM agents that **only use API calls** to create x402 APIs, pay for access, and retrieve content.

## Quick facts
- **Network:** Avalanche C-Chain (chain_id: 43114)
- **Flow:** Request → 402 payment instructions → on-chain payment → poll with session header
- **Agent endpoint:** `/api/<apiId>`
- **Human endpoint:** `/<apiId>` (not for agents)
- **Supported payment tokens (full contract addresses):**
  - **AVAX (native):** `0x0000000000000000000000000000000000000000`
  - **ARENA (ERC-20):** `0xB8d7710f7d8349A506b75dD184F05777c82dAd0C`
  - **GLADIUS (ERC-20):** `0x34a1D2105dd1b658A48EAD516A9CE3032082799C`

## 1) Create an x402 API (masked endpoint)
Create a paywalled endpoint by calling:

```
POST /api/402/apis
Content-Type: application/json

{
  "p_name": "My API",                        // optional description
  "p_api_url": "https://upstream.example.com/data",  // required
  "p_merchant_wallet": "0x...",              // required, EVM address receiving payments
  "p_token_address": "0x...",                // required, AVAX=0x000...000 (native) or ERC-20
  "p_amount_wei": "100000000000000000",      // required, amount in wei
  "p_valid_for_sec": 300,                    // required, session duration (seconds)
  "p_chain_id": 43114,                       // required, Avalanche C-Chain
  "p_fee_bps_snapshot": 100                  // optional
}
```

Response:
```
{ "apiId": "<id>" }
```

Use the **agent URL**:
```
GET /api/<apiId>
```

## 2) Agent access flow (payment → unlock)

### Step A: Request without session
```
GET /api/<apiId>
```
Response: **HTTP 402** with payment instructions:
```
{
  "code": "payment_required",
  "data": {
    // After paying, retry the same endpoint with:
    //   headers: { "X-402-Session": session_id }
    "session_id": "0x...",
    "network": { "chain_id": 43114, "name": "Avalanche C-Chain" },
    "contract": "0x...",               // x402 payment contract
    "amount_wei": "...",
    "merchant_wallet": "0x...",
    "token_address": "0x...",
    "calls": {
      "native": {
        "fn": "payNativeFor(bytes32 sessionId, address merchant)",
        "value": "<amount_wei>",
        "args": ["<session_id>", "<merchant_wallet>"]
      },
      "erc20_approve_then_pay": {
        "approve": { "spender": "<contract>", "amount": "<amount_wei>" },
        "payFor": {
          "fn": "payFor(bytes32 sessionId, address merchant, address token, uint256 amount)",
          "args": ["<session_id>", "<merchant_wallet>", "<token_address>", "<amount_wei>"]
        }
      }
    }
  }
}
```

### Step B: Make the on-chain payment
Use the payment data above:
- **AVAX (native):** call `payNativeFor(sessionId, merchant)` with `value=amount_wei`
- **ERC-20:** approve contract, then call `payFor(sessionId, merchant, token, amount)`

### Step C: Poll with the session header
```
GET /api/<apiId>
X-402-Session: 0x<session_id>
```
On success (**HTTP 200**):
```
{
  "code": "successful",
  "data": {
    "api": { /* full apis_402 row */ },
    "session": {
      "id": <number>,
      "session_id_hex": "0x...",
      "expires_at": "<ISO>"
    },
    "upstream": {
      "status": <http_status>,
      "content_type": "<mime>",
      "body": <json|string|{ image_url: string }>
    }
  }
}
```

If the session expires, you’ll receive **HTTP 402** with `code: "session_expired"` and a new `session_id` to re-purchase.

## 3) One-shot (token mint) APIs
Some APIs are **one-shot** (used once after paid). If already consumed:

- **HTTP 410**
```
{
  "code": "only_once_consumed",
  "data": { "minted": { /* stored mint info, if available */ } },
  "message": "This API has already been used once."
}
```

If the upstream call is a token mint, the `upstream.body` typically includes:
```
{
  "ok": true,
  "hash": "<tx_hash>",
  "communityId": "<uuid>",
  "tokenAddress": "<token_contract_address | null>"
}
```

## 4) Required headers
- **`X-402-Session`**: required after payment to unlock content

## 5) Agent responsibilities
- Persist the `session_id` while polling
- Handle 402 responses by paying and retrying
- Handle 410 `only_once_consumed` for one-shot endpoints

That’s it. All agent actions happen through the API endpoints above.
