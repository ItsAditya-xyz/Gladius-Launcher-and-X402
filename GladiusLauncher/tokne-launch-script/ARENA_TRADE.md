# Arena Token Trading (Buy/Sell)

This document explains how to purchase and sell Arena tokens directly by calling the Arena contract on Avalanche C-Chain. It is based on the on-chain ABI available in this repo. (This is only for tokens pre LP deployment (i.e, tokens during bonding curve), as the buy/sell functions differ for LP vs non-LP tokens.)

**Network**: Avalanche C-Chain (mainnet)  
**ChainId**: `43114`  
**Arena contract**: `0x2196E106Af476f57618373ec028924767c758464`

## What You Need
- A wallet with AVAX for gas and purchases.
- The `tokenId` of the Arena token you want to trade.
- An Avalanche C-Chain RPC endpoint.

## How To Find `tokenId`
- If you minted the token, use the `tokenId` from the mint transaction event.
- If you are purchasing an existing token, you must resolve its `tokenId` from your own indexing or the Arena UI.

## Pricing (Quotes)
Use these view functions to estimate buy cost or sell reward:
- `calculateCost(amountInToken, tokenId)` returns the raw buy cost.
- `calculateCostWithFees(amountInToken, tokenId)` returns the buy cost including fees.
- `calculateReward(amount, tokenId)` returns the raw sell reward.
- `calculateRewardWithFees(amount, tokenId)` returns the sell reward after fees.
- `calculateRewardAndSupply(amount, tokenId)` returns reward and updated supply.
- `getFeeData(tokenId, rawCosts, user)` returns fee breakdown for a given raw cost and user.

## Buy Flow
1. Decide how many tokens you want to buy (in token base units).
2. Call `calculateCostWithFees(amountInToken, tokenId)` to get the `value` (AVAX) to send.
3. Send a payable transaction to `buyAndCreateLpIfPossible(amountInToken, tokenId)` with `value` set to the quote.
4. Listen for the `Buy` event in the receipt to confirm `cost`, `creatorFee`, `referralFee`, and `protocolFee`.

## Sell Flow
1. Decide how many tokens you want to sell (in token base units).
2. Call `calculateRewardWithFees(amount, tokenId)` to estimate the reward.
3. Send a transaction to `sell(amount, tokenId)` from the token-holding address.
4. Listen for the `Sell` event in the receipt to confirm `reward` and fees.

## Token Metadata Lookup
Use `getTokenParameters(tokenId)` to resolve on-chain metadata, including `tokenContractAddress`.
You can call ERC-20 methods (like `decimals` and `symbol`) on that token contract if needed.

## Example JSON-RPC Calls

### Quote Buy Cost
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_call",
  "params": [
    {
      "to": "0x2196E106Af476f57618373ec028924767c758464",
      "data": "0x<encoded_calculateCostWithFees(amountInToken, tokenId)>"
    },
    "latest"
  ]
}
```

### Submit Buy Transaction
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "eth_sendRawTransaction",
  "params": ["0x<signed_tx_payload>"]
}
```

## Minimal ABI (Trade + Quotes + Events)
```json
[
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
    ],
    "name": "buyAndCreateLpIfPossible",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
    ],
    "name": "sell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountInToken", "type": "uint256"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
    ],
    "name": "calculateCost",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountInToken", "type": "uint256"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
    ],
    "name": "calculateCostWithFees",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
    ],
    "name": "calculateReward",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
    ],
    "name": "calculateRewardWithFees",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
    ],
    "name": "calculateRewardAndSupply",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"},
      {"internalType": "uint256", "name": "_rawCosts", "type": "uint256"},
      {"internalType": "address", "name": "_user", "type": "address"}
    ],
    "name": "getFeeData",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "protocolFee", "type": "uint256"},
          {"internalType": "uint256", "name": "creatorFee", "type": "uint256"},
          {"internalType": "uint256", "name": "referralFee", "type": "uint256"},
          {"internalType": "uint256", "name": "totalFeeAmount", "type": "uint256"},
          {"internalType": "address", "name": "tokenCreator", "type": "address"},
          {"internalType": "address", "name": "referrerAddress", "type": "address"}
        ],
        "internalType": "struct TokenManager.FeeData",
        "name": "feeData",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
    "name": "tokenSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
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
        "internalType": "struct TokenManager.TokenParameters",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
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
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "cost", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "tokenSupply", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "referrerAddress", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "referralFee", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "creatorFee", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "protocolFee", "type": "uint256"}
    ],
    "name": "Buy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "reward", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "tokenSupply", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "referrerAddress", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "referralFee", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "creatorFee", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "protocolFee", "type": "uint256"}
    ],
    "name": "Sell",
    "type": "event"
  }
]
```


