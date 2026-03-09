# Arena Token Minting (API + Contract Guide)

This document describes how to mint a token on Arena without relying on this codebase. It covers the exact API calls, the hashing format, and the on-chain transaction format.

**Network**: Avalanche C-Chain (mainnet)

**Default Arena contract**: `0x2196E106Af476f57618373ec028924767c758464`

## Inputs You Need
- Arena auth token: `ARENA_JWT`/`API KEY` (Bearer token for Arena APIs)
- Token metadata: `token_name`, `token_symbol`
- Image file (or a previously uploaded `picture_slug`)
- `handle` (Arena community handle)
- `salt` (Arena community salt)
- `creator_address` (address receiving creator routing)
- `signer_private_key` (signs the on-chain transaction)
- RPC endpoint for Avalanche C-Chain

## Step 1: Upload Image (Get `picture_slug`)

**1) Request an upload policy**

`GET https://api.starsarena.com/uploads/getUploadPolicy?fileType={URL_ENCODED_MIME}&fileName={URL_ENCODED_FILENAME}`

Headers:
- `Authorization: Bearer <ARENA_JWT>`
- `Content-Type: application/json`
- `User-Agent: <any browser UA>`
- `Referrer: https://arena.social`

Response includes `uploadPolicy` with fields required for the upload, including a `key`.

**2) Upload the image to GCS**

`POST https://storage.googleapis.com/starsarena-s3-01/`

Multipart form fields:
- All fields from `uploadPolicy`
- `Content-Type` (same MIME type as file)
- `file` (the image bytes)

Success response code is `204`.

**3) Derive `picture_slug`**

Take the upload policy `key` (for example `uploads/<uuid>.jpeg`) and set:
- `picture_slug` = the final segment after the last `/` (example `<uuid>.jpeg`)
- `picture_url` = `https://static.starsarena.com/uploads/<picture_slug>`

If you already have `picture_slug`, you can skip the upload steps.

## Step 2: Create Community (Arena API)

**Digest format** (string concatenation in this exact order, no separators):

`digest = creator_address + handle + picture_url + token_symbol + token_name + salt`

**EIP-191 hash** of `digest`:

```
message = "\\x19Ethereum Signed Message:\\n" + len(digest) + digest
hash = keccak256(message)
```

**Request**

`POST https://api.starsarena.com/communities/create-community-external`

Headers:
- `Authorization: Bearer <ARENA_JWT>`
- `Content-Type: application/json`

JSON payload:
```json
{
  "hash": "0x...",
  "name": "<handle>",
  "photoURL": "<picture_url>",
  "ticker": "<token_symbol>",
  "tokenName": "<token_name>",
  "address": "<creator_address>",
  "paymentToken": "arena"
}
```

Response includes `communityId` or `community.id`. Use that value in the on-chain step.

## Step 3: On-Chain Mint (Contract Call)

**Chain**: Avalanche C-Chain  
**ChainId**: `43114`

**Contract**: `0x2196E106Af476f57618373ec028924767c758464`

**Method**: `createToken(...)` plus appended `communityId`

Parameters used by the launcher contract in this integration:
- `A_PARAM = 677781`
- `B_PARAM = 0`
- `CURVE_SCALER = 41408599077`
- `CREATOR_FEE_BPS = 0`
- `TOKEN_SPLIT = 73`
- `AMOUNT = 0`

**Calldata construction**
1. ABI-encode the function call:

`createToken(A_PARAM, B_PARAM, CURVE_SCALER, CREATOR_FEE_BPS, creator_address, TOKEN_SPLIT, token_name, token_symbol, AMOUNT)`

2. Append the `communityId` to the encoded data as UTF-8 hex (no `0x` prefix), then prefix the whole payload with `0x`.
Example: `communityId = "1234"` -> UTF-8 hex `31323334`, so `data = <encoded_createToken> + 31323334`.

This is a legacy format where the `communityId` is appended to the calldata rather than passed as a formal ABI argument.

**Transaction**
- `to`: Arena contract address
- `from`: signer address derived from `signer_private_key`
- `data`: calldata constructed above
- `value`: `0`
- Gas: estimate and add buffer, or set a fixed gas limit

After submission, wait for the receipt. Parse `TokenCreated` events to extract the new `tokenAddress` and `tokenId`. If events are missing, you may need a fallback lookup using `tokenIdentifier()` and `getTokenParameters(tokenId)`.

## Optional Gas Configuration (If You Build Your Own Client)
- Prefer EIP-1559 if baseFee is available.
- Allow overrides for `maxFeePerGas` and `maxPriorityFeePerGas`.
- If the network does not support baseFee or your client requires legacy gas, use `gasPrice`.

## Example Requests

### Upload Policy
```bash
curl -sS   -H "Authorization: Bearer $ARENA_JWT"   -H "Content-Type: application/json"   -H "User-Agent: Mozilla/5.0"   -H "Referrer: https://arena.social"   "https://api.starsarena.com/uploads/getUploadPolicy?fileType=image%2Fjpeg&fileName=token.jpeg"
```

### Create Community
```bash
curl -sS   -H "Authorization: Bearer $ARENA_JWT"   -H "Content-Type: application/json"   -d '{
    "hash":"0x...",
    "name":"myhandle",
    "photoURL":"https://static.starsarena.com/uploads/<picture_slug>",
    "ticker":"TICK",
    "tokenName":"My Token",
    "address":"0x...",
    "paymentToken":"arena"
  }'   https://api.starsarena.com/communities/create-community-external
```

## Contract ABI
Minimal ABI required to mint and optionally resolve the token address:

```json
[
  {
    "inputs": [
      {"internalType": "uint32", "name": "a", "type": "uint32"},
      {"internalType": "uint8", "name": "b", "type": "uint8"},
      {"internalType": "uint128", "name": "curveScaler", "type": "uint128"},
      {"internalType": "uint8", "name": "creatorFeeBasisPoints", "type": "uint8"},
      {"internalType": "address", "name": "creatorAddress", "type": "address"},
      {"internalType": "uint256", "name": "tokenSplit", "type": "uint256"},
      {"internalType": "string", "name": "tokenName", "type": "string"},
      {"internalType": "string", "name": "tokenSymbol", "type": "string"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "createToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenIdentifier",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "getTokenParameters",
    "outputs": [
      {
        "components": [
          {"internalType": "uint128", "name": "curveScaler", "type": "uint128"},
          {"internalType": "uint16", "name": "a", "type": "uint16"},
          {"internalType": "uint8", "name": "b", "type": "uint8"},
          {"internalType": "bool", "name": "lpDeployed", "type": "bool"},
          {"internalType": "uint8", "name": "lpPercentage", "type": "uint8"},
          {"internalType": "uint8", "name": "salePercentage", "type": "uint8"},
          {"internalType": "uint8", "name": "creatorFeeBasisPoints", "type": "uint8"},
          {"internalType": "address", "name": "creatorAddress", "type": "address"},
          {"internalType": "address", "name": "pairAddress", "type": "address"},
          {"internalType": "address", "name": "tokenContractAddress", "type": "address"}
        ],
        "internalType": "struct TokenParameters",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "name": "tokenId", "type": "uint256"},
      {
        "indexed": false,
        "name": "params",
        "type": "tuple",
        "components": [
          {"name": "curveScaler", "type": "uint128"},
          {"name": "a", "type": "uint32"},
          {"name": "b", "type": "uint8"},
          {"name": "lpPercentage", "type": "uint8"},
          {"name": "salePercentage", "type": "uint8"},
          {"name": "creatorFeeBasisPoints", "type": "uint8"},
          {"name": "creatorAddress", "type": "address"},
          {"name": "pairAddress", "type": "address"},
          {"name": "tokenContractAddress", "type": "address"}
        ]
      },
      {"indexed": false, "name": "tokenSupply", "type": "uint256"}
    ],
    "name": "TokenCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "previousOwner", "type": "address"},
      {"indexed": true, "name": "newOwner", "type": "address"}
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  }
]
```

Note: The `TokenCreated` event has multiple historical signatures on-chain. If your client fails to decode it, fall back to `tokenIdentifier()` and `getTokenParameters(tokenId)` to find the new token address.
