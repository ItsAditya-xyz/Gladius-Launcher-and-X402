/**
 * Gladius Launcher - Arena end-to-end test script (no DB, no env)
 *
 * What it does:
 * 1) Create a random wallet
 * 2) Fund it from a faucet wallet
 * 3) Register agent on Arena (returns apiKey + verificationCode)
 * 4) Create external community on Arena
 * 5) Mint token on-chain
 *
 * ⚠️ This prints PRIVATE KEYS to stdout. Do not share logs.
 *
 * Requirements:
 * - Node 18+ (fetch)
 * - `ethers` installed in this package:
 *   `pnpm add ethers` (run in GladiusLauncher)
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

// -----------------------------
// Configuration (fill these)
// -----------------------------
const CONFIG = {
  // Arena
  ARENA_IMAGE_HOST: "https://static.starsarena.com/uploads",
  ARENA_TOKEN_SALT:
    "b8ba6b3c61e154d3c7d9386935e532933f6780d4fc14045b0f3f5d0ae13451ae",

  // Avalanche
  AVAX_RPC_URL: "https://avalanche-c-chain-rpc.publicnode.com",

  // Faucet (funds the new wallet for gas)
  FAUCET_PRIVATE_KEY: process.env.FAUCET_PRIVATE_KEY ,
  FAUCET_AMOUNT_AVAX: "0.05",

  // Bank vault (required for minting)
  BANK_CONTRACT_ADDRESS: process.env.BANK_CONTRACT_ADDRESS || "",
  BANK_RPC_URL: process.env.BANK_RPC_URL || "",
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY || "",
  ADMIN_ADDRESS: process.env.ADMIN_ADDRESS || "",
  BANK_SALT_SEED: process.env.BANK_SALT_SEED || "",
  BANK_FEE_BPS: Number(process.env.BANK_FEE_BPS || 0),
  BANK_TREASURY_ADDRESS:
    process.env.BANK_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS || "",
  BANK_SET_TREASURY: process.env.BANK_SET_TREASURY === "1",

  // Optional: reuse a fixed test wallet (skip create + funding)
  TEST_AGENT_PRIVATE_KEY: process.env.TEST_AGENT_PRIVATE_KEY || "",
  TEST_AGENT_ADDRESS: process.env.TEST_AGENT_ADDRESS || "",
  TEST_AGENT_API_KEY: process.env.TEST_AGENT_API_KEY || "",
  TEST_AGENT_VAULT: process.env.TEST_AGENT_VAULT || "",

  // Arena contracts
  ARENA_CONTRACT_ADDRESS:
    "0x2196E106Af476f57618373ec028924767c758464",
  AVAX_CONTRACT_ADDRESS: "0x8315f1eb449Dd4B779495C3A0b05e5d194446c6e",

  // AVAX curve params (required when pair === "avax")
  AVAX_A_PARAM: 901,
  AVAX_B_PARAM: 0,
  AVAX_CURVE_SCALER: 232210432401,
  AVAX_TOKEN_SPLIT: 73
};

const AGENT = {
  name: "Nova Sentinel",
  handleBase: "nova-sentinel",
  bio: "A high-signal trader focused on structured liquidity flows.",
  profilePictureUrl: "https://static.starsarena.com/uploads/428c084a-b296-0382-4a8b-81ab67318ae81770725187373.jpeg",
  tokenName: "Nova Sentinel",
  tokenSymbol: "NOVA",
  pair: "avax" // "avax" or "arena"
};

// -----------------------------
// Arena token params (defaults)
// -----------------------------
const TOKEN_PARAMS = {
  aParam: 677781,
  bParam: 0,
  curveScaler: 41408599077,
  creatorFeeBps: 0,
  tokenSplit: 73,
  amount: 0
};

const AVAX_TOKEN_PARAMS = {
  aParam: Number(CONFIG.AVAX_A_PARAM),
  bParam: Number(CONFIG.AVAX_B_PARAM),
  curveScaler: Number(CONFIG.AVAX_CURVE_SCALER),
  tokenSplit: Number(CONFIG.AVAX_TOKEN_SPLIT)
};

function loadAbiJson(relativePath) {
  try {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) return null;
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load ABI:", relativePath, error?.message || error);
    return null;
  }
}

const AVAX_ABI = loadAbiJson("tokne-launch-script/avaxABI.json");

const ARENA_ABI = [
  {
    inputs: [
      { internalType: "uint32", name: "a", type: "uint32" },
      { internalType: "uint8", name: "b", type: "uint8" },
      { internalType: "uint128", name: "curveScaler", type: "uint128" },
      { internalType: "uint8", name: "creatorFeeBasisPoints", type: "uint8" },
      { internalType: "address", name: "creatorAddress", type: "address" },
      { internalType: "uint256", name: "tokenSplit", type: "uint256" },
      { internalType: "string", name: "tokenName", type: "string" },
      { internalType: "string", name: "tokenSymbol", type: "string" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "createToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "tokenIdentifier",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "getTokenParameters",
    outputs: [
      {
        components: [
          { internalType: "uint128", name: "curveScaler", type: "uint128" },
          { internalType: "uint16", name: "a", type: "uint16" },
          { internalType: "uint8", name: "b", type: "uint8" },
          { internalType: "bool", name: "lpDeployed", type: "bool" },
          { internalType: "uint8", name: "lpPercentage", type: "uint8" },
          { internalType: "uint8", name: "salePercentage", type: "uint8" },
          { internalType: "uint8", name: "creatorFeeBasisPoints", type: "uint8" },
          { internalType: "address", name: "creatorAddress", type: "address" },
          { internalType: "address", name: "pairAddress", type: "address" },
          { internalType: "address", name: "tokenContractAddress", type: "address" }
        ],
        internalType: "struct TokenParameters",
        name: "params",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "tokenId", type: "uint256" },
      {
        indexed: false,
        name: "params",
        type: "tuple",
        components: [
          { name: "curveScaler", type: "uint128" },
          { name: "a", type: "uint32" },
          { name: "b", type: "uint8" },
          { name: "lpPercentage", type: "uint8" },
          { name: "salePercentage", type: "uint8" },
          { name: "creatorFeeBasisPoints", type: "uint8" },
          { name: "creatorAddress", type: "address" },
          { name: "pairAddress", type: "address" },
          { name: "tokenContractAddress", type: "address" }
        ]
      },
      { indexed: false, name: "tokenSupply", type: "uint256" }
    ],
    name: "TokenCreated",
    type: "event"
  }
];

const BANKER_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "salt", type: "bytes32" }],
    name: "createAddress",
    outputs: [{ internalType: "address", name: "vaultAddr", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "uint16", name: "feeBps", type: "uint16" }
    ],
    name: "createAddressWithFee",
    outputs: [{ internalType: "address", name: "vaultAddr", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "salt", type: "bytes32" }],
    name: "predictAddress",
    outputs: [{ internalType: "address", name: "predicted", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "vault", type: "address" }],
    name: "isVault",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "newTreasury", type: "address" }],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const TOKEN_CREATED_EVENT_ABIS = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        name: "params",
        type: "tuple",
        components: [
          { name: "a", type: "uint32" },
          { name: "b", type: "uint8" },
          { name: "curveScaler", type: "uint128" },
          { name: "lpPercentage", type: "uint8" },
          { name: "salePercentage", type: "uint8" },
          { name: "creatorFeeBasisPoints", type: "uint8" },
          { name: "creatorAddress", type: "address" },
          { name: "pairAddress", type: "address" },
          { name: "tokenContractAddress", type: "address" }
        ]
      },
      { indexed: false, name: "tokenSupply", type: "uint256" }
    ],
    name: "TokenCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "tokenId", type: "uint256" },
      {
        indexed: false,
        name: "params",
        type: "tuple",
        components: [
          { name: "curveScaler", type: "uint128" },
          { name: "a", type: "uint32" },
          { name: "b", type: "uint8" },
          { name: "lpPercentage", type: "uint8" },
          { name: "salePercentage", type: "uint8" },
          { name: "creatorFeeBasisPoints", type: "uint8" },
          { name: "creatorAddress", type: "address" },
          { name: "pairAddress", type: "address" },
          { name: "tokenContractAddress", type: "address" }
        ]
      },
      { indexed: false, name: "tokenSupply", type: "uint256" }
    ],
    name: "TokenCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        name: "params",
        type: "tuple",
        components: [
          { name: "a", type: "uint16" },
          { name: "b", type: "uint8" },
          { name: "curveScaler", type: "uint128" },
          { name: "lpPercentage", type: "uint8" },
          { name: "salePercentage", type: "uint8" },
          { name: "creatorFeeBasisPoints", type: "uint8" },
          { name: "creatorAddress", type: "address" },
          { name: "pairAddress", type: "address" },
          { name: "tokenContractAddress", type: "address" }
        ]
      },
      { indexed: false, name: "tokenSupply", type: "uint256" }
    ],
    name: "TokenCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "tokenId", type: "uint256" },
      {
        indexed: false,
        name: "params",
        type: "tuple",
        components: [
          { name: "curveScaler", type: "uint128" },
          { name: "a", type: "uint16" },
          { name: "b", type: "uint8" },
          { name: "lpPercentage", type: "uint8" },
          { name: "salePercentage", type: "uint8" },
          { name: "creatorFeeBasisPoints", type: "uint8" },
          { name: "creatorAddress", type: "address" },
          { name: "pairAddress", type: "address" },
          { name: "tokenContractAddress", type: "address" }
        ]
      },
      { indexed: false, name: "tokenSupply", type: "uint256" }
    ],
    name: "TokenCreated",
    type: "event"
  }
];

const OWNERSHIP_TRANSFERRED_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: "previousOwner", type: "address" },
    { indexed: true, name: "newOwner", type: "address" }
  ],
  name: "OwnershipTransferred",
  type: "event"
};

function getContractAddress(pair) {
  return pair === "arena" ? CONFIG.ARENA_CONTRACT_ADDRESS : CONFIG.AVAX_CONTRACT_ADDRESS;
}

function getTokenParams(pair) {
  let aParam = TOKEN_PARAMS.aParam;
  let bParam = TOKEN_PARAMS.bParam;
  let curveScaler = TOKEN_PARAMS.curveScaler;
  let tokenSplit = TOKEN_PARAMS.tokenSplit;
  if (pair === "avax") {
    if (Number.isFinite(AVAX_TOKEN_PARAMS.aParam)) aParam = AVAX_TOKEN_PARAMS.aParam;
    if (Number.isFinite(AVAX_TOKEN_PARAMS.bParam)) bParam = AVAX_TOKEN_PARAMS.bParam;
    if (Number.isFinite(AVAX_TOKEN_PARAMS.curveScaler))
      curveScaler = AVAX_TOKEN_PARAMS.curveScaler;
    if (Number.isFinite(AVAX_TOKEN_PARAMS.tokenSplit))
      tokenSplit = AVAX_TOKEN_PARAMS.tokenSplit;
    if (!Number.isFinite(aParam)) {
      throw new Error("AVAX_A_PARAM is required for avax pair.");
    }
    if (aParam < 0 || aParam > 65535) {
      throw new Error("AVAX_A_PARAM must be between 0 and 65535.");
    }
    if (!Number.isFinite(bParam)) {
      throw new Error("AVAX_B_PARAM is required for avax pair.");
    }
    if (!Number.isFinite(curveScaler)) {
      throw new Error("AVAX_CURVE_SCALER is required for avax pair.");
    }
    if (!Number.isFinite(tokenSplit)) {
      throw new Error("AVAX_TOKEN_SPLIT is required for avax pair.");
    }
  }
  return {
    aParam,
    bParam,
    curveScaler,
    creatorFeeBps: TOKEN_PARAMS.creatorFeeBps,
    tokenSplit,
    amount: TOKEN_PARAMS.amount
  };
}

function extractPictureSlug(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const parts = (parsed.pathname || "").split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    const parts = String(url).split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }
}

function buildPictureUrl() {
  const slug = extractPictureSlug(AGENT.profilePictureUrl);
  const host = String(CONFIG.ARENA_IMAGE_HOST || "").replace(/\/+$/, "");
  return `${host}/${slug}`;
}

function normalizeAddress(addr) {
  if (!addr || typeof addr !== "string") return null;
  if (addr.toLowerCase() === "0x0000000000000000000000000000000000000000") {
    return null;
  }
  return addr;
}

function extractTokenAddressFromReceipt(receipt, contractAddress) {
  const logs = receipt?.logs || [];
  for (const log of logs) {
    for (const abi of TOKEN_CREATED_EVENT_ABIS) {
      try {
        const iface = new ethers.Interface([abi]);
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TokenCreated") {
          const candidate = normalizeAddress(
            parsed?.args?.params?.tokenContractAddress || null
          );
          if (candidate) return candidate;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  for (const log of logs) {
    try {
      const iface = new ethers.Interface([OWNERSHIP_TRANSFERRED_EVENT_ABI]);
      const parsed = iface.parseLog(log);
      if (parsed?.name === "OwnershipTransferred") {
        const addr = normalizeAddress(log.address);
        if (
          addr &&
          contractAddress &&
          addr.toLowerCase() !== contractAddress.toLowerCase()
        ) {
          return addr;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveBankSalt(seed, recipientId) {
  const payload = `${seed || ""}|${recipientId || ""}`;
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

async function ensureVault({ handleFinal }) {
  if (!CONFIG.BANK_CONTRACT_ADDRESS || !CONFIG.ADMIN_PRIVATE_KEY) {
    throw new Error("Missing BANK_CONTRACT_ADDRESS or ADMIN_PRIVATE_KEY.");
  }
  const bankRpc = CONFIG.BANK_RPC_URL || CONFIG.AVAX_RPC_URL;
  if (!bankRpc) {
    throw new Error("Missing BANK_RPC_URL or AVAX_RPC_URL.");
  }
  if (!CONFIG.BANK_SALT_SEED) {
    throw new Error("Missing BANK_SALT_SEED.");
  }

  const provider = new ethers.JsonRpcProvider(bankRpc);
  const signer = new ethers.Wallet(CONFIG.ADMIN_PRIVATE_KEY, provider);
  if (
    CONFIG.ADMIN_ADDRESS &&
    signer.address.toLowerCase() !== CONFIG.ADMIN_ADDRESS.toLowerCase()
  ) {
    throw new Error("ADMIN_ADDRESS does not match ADMIN_PRIVATE_KEY.");
  }

  const contract = new ethers.Contract(
    CONFIG.BANK_CONTRACT_ADDRESS,
    BANKER_ABI,
    signer
  );
  const salt = deriveBankSalt(CONFIG.BANK_SALT_SEED, handleFinal);
  const predicted = await contract.predictAddress(salt);

  let exists = false;
  try {
    exists = await contract.isVault(predicted);
  } catch {
    exists = false;
  }

  if (CONFIG.BANK_SET_TREASURY && CONFIG.BANK_TREASURY_ADDRESS) {
    try {
      const current = await contract.treasury();
      if (current?.toLowerCase() !== CONFIG.BANK_TREASURY_ADDRESS.toLowerCase()) {
        const tx = await contract.setTreasury(CONFIG.BANK_TREASURY_ADDRESS);
        await tx.wait();
      }
    } catch (error) {
      throw new Error(`Failed to set treasury: ${error?.message || error}`);
    }
  }

  if (!exists) {
    const feeBps = Number.isFinite(CONFIG.BANK_FEE_BPS) ? CONFIG.BANK_FEE_BPS : 0;
    const tx =
      feeBps > 0
        ? await contract.createAddressWithFee(salt, feeBps)
        : await contract.createAddress(salt);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("Bank vault creation failed.");
    }
  }

  return predicted;
}

async function registerArenaAgent({ walletAddress }) {
  const payload = {
    name: AGENT.name,
    handle: AGENT.handleBase,
    address: walletAddress,
    bio: AGENT.bio || "",
    profilePictureUrl: AGENT.profilePictureUrl || ""
  };
  if (!payload.profilePictureUrl) {
    delete payload.profilePictureUrl;
  }
  const response = await fetch("https://api.starsarena.com/agents/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Arena register payload:", payload);
    console.error("Arena register response:", data);
    throw new Error(data?.error || `Arena register failed (HTTP ${response.status})`);
  }
  return data;
}

async function createCommunityExternal({
  apiKey,
  creatorAddress,
  pictureUrl,
  tokenName,
  tokenSymbol
}) {
  const handleFinal = `${AGENT.handleBase}_agent`;
  const digest = `${creatorAddress}${handleFinal}${pictureUrl}${tokenSymbol}${tokenName}${CONFIG.ARENA_TOKEN_SALT}`;
  const messageHash = ethers.hashMessage(digest);
  const paymentToken = AGENT.pair === "arena" ? "arena" : "avax";

  const response = await fetch(
    "https://api.starsarena.com/communities/create-community-external",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hash: messageHash,
        name: handleFinal,
        photoURL: pictureUrl,
        ticker: tokenSymbol,
        tokenName,
        address: creatorAddress,
        paymentToken
      })
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error || `Arena create-community failed (HTTP ${response.status})`
    );
  }
  return data;
}

async function mintToken({ wallet, communityId, creatorAddress }) {
  const pair = AGENT.pair === "arena" ? "arena" : "avax";
  const contractAddress = getContractAddress(pair);
  if (!contractAddress) {
    throw new Error("Missing contract address for token minting.");
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.AVAX_RPC_URL);
  const signer = wallet.connect(provider);
  const abi = pair === "avax" && Array.isArray(AVAX_ABI) ? AVAX_ABI : ARENA_ABI;
  const iface = new ethers.Interface(abi);
  const params = getTokenParams(pair);

  const baseData = iface.encodeFunctionData("createToken", [
    params.aParam,
    params.bParam,
    params.curveScaler,
    params.creatorFeeBps,
    creatorAddress,
    params.tokenSplit,
    AGENT.tokenName,
    AGENT.tokenSymbol,
    params.amount
  ]);
  const idHex = Buffer.from(String(communityId), "utf8").toString("hex");
  const data = `${baseData}${idHex}`;

  const contract = new ethers.Contract(contractAddress, abi, provider);
  let beforeTokenId = null;
  try {
    beforeTokenId = await contract.tokenIdentifier();
  } catch {
    beforeTokenId = null;
  }

  let gasLimit;
  try {
    const estimate = await signer.estimateGas({ to: contractAddress, data });
    gasLimit = (estimate * 12n) / 10n;
  } catch {
    gasLimit = undefined;
  }

  const tx = await signer.sendTransaction({ to: contractAddress, data, gasLimit });
  const receipt = await tx.wait();
  if (receipt?.status === 0) {
    throw new Error(`Mint transaction reverted: ${receipt?.hash || tx?.hash || ""}`);
  }

  let tokenAddress = null;
  const maxChecks = 10;
  for (let attempt = 0; attempt < maxChecks; attempt++) {
    const currentReceipt =
      attempt === 0 ? receipt : await provider.getTransactionReceipt(tx.hash);
    if (currentReceipt?.status === 0) {
      throw new Error(
        `Mint transaction reverted: ${currentReceipt?.hash || tx?.hash || ""}`
      );
    }

    tokenAddress = extractTokenAddressFromReceipt(currentReceipt, contractAddress);

    if (!tokenAddress) {
      try {
        const afterTokenId = await contract.tokenIdentifier();
        if (
          afterTokenId &&
          (beforeTokenId === null || afterTokenId > beforeTokenId)
        ) {
          const params = await contract.getTokenParameters(afterTokenId);
          tokenAddress = normalizeAddress(
            params?.tokenContractAddress || params?.[0]?.tokenContractAddress
          );
        }
      } catch {
        // ignore fallback errors
      }
    }

    if (tokenAddress) break;
    if (attempt < maxChecks - 1) {
      console.log("Token address not found yet; retrying...");
      await sleep(2000);
    }
  }

  if (!tokenAddress) {
    throw new Error(
      "Token mint succeeded but token address missing after retries."
    );
  }

  return { tokenAddress, txHash: receipt?.hash || tx?.hash || null };
}

async function main() {
  console.log("=== Arena E2E Test Script ===");
  console.log("Agent:", AGENT);

  // 1) Create or reuse wallet
  let wallet;
  const hasTestWallet =
    Boolean(CONFIG.TEST_AGENT_PRIVATE_KEY) && Boolean(CONFIG.TEST_AGENT_ADDRESS);
  if (hasTestWallet) {
    wallet = new ethers.Wallet(CONFIG.TEST_AGENT_PRIVATE_KEY);
    if (
      wallet.address.toLowerCase() !==
      String(CONFIG.TEST_AGENT_ADDRESS || "").toLowerCase()
    ) {
      throw new Error("TEST_AGENT_ADDRESS does not match TEST_AGENT_PRIVATE_KEY.");
    }
    console.log("Using test wallet from .env");
    console.log("Wallet address:", wallet.address);
    console.log("Wallet private key:", wallet.privateKey);
  } else {
    wallet = ethers.Wallet.createRandom();
    console.log("Wallet address:", wallet.address);
    console.log("Wallet private key:", wallet.privateKey);
    console.log("Wallet mnemonic:", wallet.mnemonic?.phrase || "n/a");
  }

  // 2) Fund wallet (skip when test wallet is provided)
  if (!hasTestWallet) {
    const provider = new ethers.JsonRpcProvider(CONFIG.AVAX_RPC_URL);
    const faucet = new ethers.Wallet(CONFIG.FAUCET_PRIVATE_KEY, provider);
    console.log("Funding wallet with faucet...");
    const fundTx = await faucet.sendTransaction({
      to: wallet.address,
      value: ethers.parseEther(String(CONFIG.FAUCET_AMOUNT_AVAX))
    });
    const fundReceipt = await fundTx.wait();
    console.log("Faucet tx hash:", fundReceipt?.hash || fundTx?.hash);
  } else {
    console.log("Skipping faucet funding (test wallet supplied).");
  }

  const handleFinal = `${AGENT.handleBase}_agent`;

  // 3) Register Arena agent (skip when API key supplied)
  let apiKey = "";
  if (CONFIG.TEST_AGENT_API_KEY) {
    apiKey = String(CONFIG.TEST_AGENT_API_KEY).trim();
    console.log("Using TEST_AGENT_API_KEY from .env");
  } else {
    console.log("Registering Arena agent...");
    const registerResp = await registerArenaAgent({ walletAddress: wallet.address });
    console.log("Arena register response:", registerResp);
    apiKey = String(registerResp?.apiKey || "").trim();
    const verificationCode = String(registerResp?.verificationCode || "").trim();
    const arenaAgentId = String(
      registerResp?.agentId || registerResp?.user?.id || ""
    ).trim();
    if (!apiKey || !verificationCode || !arenaAgentId) {
      throw new Error("Arena registration missing apiKey/verificationCode/agentId.");
    }
    console.log("Arena apiKey:", apiKey);
    console.log("Arena verificationCode:", verificationCode);
    console.log("Arena agentId:", arenaAgentId);
  }

  // 4) Create fee vault (required for minting)
  const vaultAddress = wallet.address;
  console.log("Using agent wallet address as creator:", vaultAddress);

  // 5) Create external community
  const pictureUrl = buildPictureUrl();
  console.log("Creating external community...");
  const communityResp = await createCommunityExternal({
    apiKey,
    creatorAddress: vaultAddress,
    pictureUrl,
    tokenName: AGENT.tokenName,
    tokenSymbol: AGENT.tokenSymbol
  });
  console.log("Community response:", communityResp);
  const communityId =
    communityResp?.community?.id || communityResp?.communityId || null;
  if (!communityId) {
    throw new Error("Community id missing.");
  }
  console.log("Community ID:", communityId);

  // 6) Mint token
  console.log("Minting token...");
  const mintResp = await mintToken({
    wallet,
    communityId,
    creatorAddress: vaultAddress
  });
  console.log("Token minted:", mintResp);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exitCode = 1;
});
