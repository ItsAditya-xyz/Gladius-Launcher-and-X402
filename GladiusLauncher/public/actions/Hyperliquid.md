# Hyperliquid API Usage (LLM-Executable)


Note: Generate wallet interally and store it securely. This will be the wallet to trade via a burner accoutn managed by Agent. Agent can only give address to their owner/in-chat. Never privte key. 
Store that in HyperliquidTradingAgent folder or any similar folder.


This document describes the Hyperliquid APIs used by this repo, how to call them, and what each parameter means so an LLM can place and manage trades without relying on this codebase. It is scoped to the exact methods and request shapes used in `src/hyperliquid/`.

If you need full Hyperliquid API coverage or on-chain contract addresses, consult official Hyperliquid docs. This repo does not include contract addresses or direct on-chain calls.

**Scope**

- SDK: `hyperliquid` npm package
- Trading: `exchange.placeOrder`, `exchange.cancelOrder`, `exchange.updateLeverage`
- Market data: `info.getCandleSnapshot`
- Account data: `info.perpetuals.getClearinghouseState`, `info.getUserOpenOrders`
- WebSocket: `subscriptions.subscribeToCandle`

**Networks and Authentication**

- The SDK supports `testnet: true|false`.
- Trading and private account data require a wallet `privateKey` and its `address`.
- Public market data does not require signing.

Environment variables used in this repo

- `AGENT_PRIVATE_KEY_TEST`: private key used for trading and private info.
- `AGENT_ADDRESS`: address used for trading (matches the private key).
- `PUBLIC_ADDRESS`: address used for info lookups in `marketInfo.js`.
- `NETWORK_TYPE`: when set to `testnet`, SDK uses testnet; otherwise mainnet.

**SDK Initialization**

```js
const { Hyperliquid } = require("hyperliquid")

const sdk = new Hyperliquid({
  privateKey: "0x...",   // required for trading and private data
  address: "0x...",      // wallet address that matches the private key
  testnet: true,          // true for testnet, false for mainnet
  enableWs: false         // true if you plan to use subscriptions
})

await sdk.connect()
// ... make API calls ...
await sdk.disconnect()
```

Constructor parameters

- `privateKey` (string): Hex private key used to sign trading actions.
- `address` (string): Wallet address for the account.
- `testnet` (boolean): `true` for testnet, `false` for mainnet.
- `enableWs` (boolean): `true` to enable WebSocket subscriptions.

**Trading API**

`exchange.placeOrder(orderRequest)`

Order request fields used in this repo

- `coin` (string): Market symbol, e.g., `"BTC-PERP"`.
- `is_buy` (boolean): `true` for buy orders, `false` for sell orders.
- `sz` (number): Order size. Must be a positive number.
- `limit_px` (number): Limit price for the order.
- `order_type` (object): In this repo it is always a limit order with GTC.
- `order_type.limit.tif` (string): Time-in-force. This repo uses `"Gtc"`.
- `reduce_only` (boolean): `true` to only reduce/close an existing position.
- `cloid` (string, optional): Client order id. Shown in repo comments but not used.

Example: open a long (aggressive limit to simulate market buy)

```js
const orderRequest = {
  coin: "BTC-PERP",
  is_buy: true,
  sz: 0.01,
  limit_px: 50250,
  order_type: { limit: { tif: "Gtc" } },
  reduce_only: false
}

const order = await sdk.exchange.placeOrder(orderRequest)
```

Example: close a long (reduce-only sell)

```js
const orderRequest = {
  coin: "BTC-PERP",
  is_buy: false,
  sz: 0.01,
  limit_px: 49900,
  order_type: { limit: { tif: "Gtc" } },
  reduce_only: true
}

const order = await sdk.exchange.placeOrder(orderRequest)
```

Example: take-profit for long (reduce-only limit sell)

```js
const orderRequest = {
  coin: "BTC-PERP",
  is_buy: false,
  sz: 0.01,
  limit_px: 51500,
  order_type: { limit: { tif: "Gtc" } },
  reduce_only: true
}

const order = await sdk.exchange.placeOrder(orderRequest)
```

Example: open a short (aggressive limit to simulate market sell)

```js
const orderRequest = {
  coin: "BTC-PERP",
  is_buy: false,
  sz: 0.01,
  limit_px: 49800,
  order_type: { limit: { tif: "Gtc" } },
  reduce_only: false
}

const order = await sdk.exchange.placeOrder(orderRequest)
```

Example: close a short (reduce-only buy)

```js
const orderRequest = {
  coin: "BTC-PERP",
  is_buy: true,
  sz: 0.01,
  limit_px: 50300,
  order_type: { limit: { tif: "Gtc" } },
  reduce_only: true
}

const order = await sdk.exchange.placeOrder(orderRequest)
```

`exchange.cancelOrder(orderId)`

- `orderId` (string or number): The id returned by `placeOrder`.

Example

```js
await sdk.exchange.cancelOrder(orderId)
```

`exchange.updateLeverage(symbol, leverageMode, leverageAmount)`

- `symbol` (string): Market symbol, e.g., `"BTC-PERP"`.
- `leverageMode` (string): Mode name. This repo uses `"isolated"` in comments.
- `leverageAmount` (number): Leverage multiplier, e.g., `20` for 20x.

Example

```js
await sdk.exchange.updateLeverage("BTC-PERP", "isolated", 20)
```

**Market Data API**

`info.getCandleSnapshot(symbol, interval, startTimeMs, endTimeMs, flag)`

- `symbol` (string): Market symbol, e.g., `"BTC-PERP"`.
- `interval` (string): Candle interval. Supported values in this repo: `1m` `3m` `5m` `10m` `15m` `30m` `1h` `4h` `1d`.
- `startTimeMs` (number): Start timestamp in milliseconds.
- `endTimeMs` (number): End timestamp in milliseconds.
- `flag` (boolean): This repo always passes `true` without further interpretation.

Example: get last 100 1m candles

```js
const interval = "1m"
const count = 100
const intervalMs = 60 * 1000
const endTimeMs = Date.now()
const startTimeMs = endTimeMs - count * intervalMs

const candles = await sdk.info.getCandleSnapshot(
  "BTC-PERP",
  interval,
  startTimeMs,
  endTimeMs,
  true
)
```

Candle object fields (as used in this repo)

- `t`: open time (ms)
- `T`: close time (ms)
- `s`: symbol
- `i`: interval
- `o`: open price
- `c`: close price
- `h`: high price
- `l`: low price
- `v`: volume
- `n`: number of trades

**Account Data API**

`info.perpetuals.getClearinghouseState(address)`

- `address` (string): Wallet address.
- Returns an object that includes `assetPositions`.

`info.getUserOpenOrders(address)`

- `address` (string): Wallet address.
- Returns a list of open orders.

**WebSocket Candle Stream**

`subscriptions.subscribeToCandle(ticker, timeframe, callback)`

- `ticker` (string): Market symbol, e.g., `"BTC-PERP"`.
- `timeframe` (string): Candle interval string such as `"1m"`.
- `callback` (function): Receives candle updates.

Example

```js
const sdk = new Hyperliquid({ enableWs: true })
await sdk.connect()

sdk.subscriptions.subscribeToCandle("BTC-PERP", "1m", (data) => {
  // data uses the candle fields listed above
  console.log(data)
})
```

**Execution Recipes (LLM-Oriented)**

Open a long

1. Fetch current price with `getCandleSnapshot` for `1m` and use the latest close.
2. Set `limit_px` slightly above current price to get filled quickly.
3. Call `exchange.placeOrder` with `is_buy: true` and `reduce_only: false`.

Close a long

1. Fetch current price with `getCandleSnapshot` for `1m`.
2. Set `limit_px` slightly below current price.
3. Call `exchange.placeOrder` with `is_buy: false` and `reduce_only: true`.

Open a short

1. Fetch current price with `getCandleSnapshot` for `1m`.
2. Set `limit_px` slightly below current price.
3. Call `exchange.placeOrder` with `is_buy: false` and `reduce_only: false`.

Close a short

1. Fetch current price with `getCandleSnapshot` for `1m`.
2. Set `limit_px` slightly above current price.
3. Call `exchange.placeOrder` with `is_buy: true` and `reduce_only: true`.

Take profit orders

1. Place a separate reduce-only limit order in the opposite direction of the open position.
2. Use a target `limit_px` that represents your desired take-profit price.

**Operational Notes From This Repo**

- Orders are rate-limited locally to 1 request per 10 seconds via an in-process limiter.
- On HTTP 429 errors, the code retries with exponential backoff (1s, 2s, 4s).
- All trading orders are sent as limit orders with `tif: "Gtc"`.
- Market-like execution is simulated by using aggressive limit prices around the current price.
