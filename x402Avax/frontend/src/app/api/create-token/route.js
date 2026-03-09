import { NextResponse } from "next/server";
import { ethers } from "ethers";
import launcherAbi from "../../../../abis/launcher.json";

const CONTRACT_ADDRESS = "0x2196E106Af476f57618373ec028924767c758464";
const AVALANCHE_RPC = "https://api.avax.network/ext/bc/C/rpc";
const ARENA_IMAGE_HOST = "https://static.starsarena.com/uploads/";
const ARENA_PAYMENT_TOKEN = "arena";
const ARENA_BASE_URL = "https://api.starsarena.com";

const A = 677_781; // uint32
const B = 0; // uint8
const CURVE_SCALER = 41_408_599_077n;
const CREATOR_FEE_BPS = 0; // uint8 (creator fees disabled)
const TOKEN_SPLIT = 73n; // uint256
const AMOUNT = 0n; // uint256

const REQUIRED_ENV_VARS = [
  "PRIVATE_KEY",
  "ADDRESS",
  "HANDLE",
  "SALT",
  "ARENA_JWT",
];

const LEGACY_LAUNCHER_ABI = [
  "function createToken(uint32,uint8,uint128,uint8,address,uint256,string,string,uint256)",
];
const TOKEN_QUERY_ABI = [
  "function tokenIdentifier() view returns (uint256)",
  "function getTokenParameters(uint256) view returns (tuple(uint128 curveScaler,uint16 a,uint8 b,bool lpDeployed,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params)",
];
const TOKEN_CREATED_EVENT_ABIS = [
  // Legacy launcher (no tokenId), struct order: a, b, curveScaler
  "event TokenCreated((uint32 a,uint8 b,uint128 curveScaler,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
  // Legacy launcher with tokenId, struct order: curveScaler, a, b
  "event TokenCreated(uint256 tokenId,(uint128 curveScaler,uint32 a,uint8 b,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
  // Newer launcher (no tokenId), struct order: a, b, curveScaler
  "event TokenCreated((uint16 a,uint8 b,uint128 curveScaler,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
  // Newer launcher with tokenId, struct order: curveScaler, a, b
  "event TokenCreated(uint256 tokenId,(uint128 curveScaler,uint16 a,uint8 b,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
];

function validatePictureSlug(slug) {
  if (!slug) return null;
  const normalized = slug.replace(/^\/+/, "");
  return /^[A-Za-z0-9._-]+$/.test(normalized) ? normalized : null;
}

function ensureEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (!ARENA_BASE_URL) missing.push("ARENA_BASE_URL");
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name")?.trim();
    const symbol = searchParams.get("symbol")?.trim();
    const pictureSlug = validatePictureSlug(searchParams.get("picture")?.trim());

    if (!name || !symbol || !pictureSlug) {
      return NextResponse.json(
        { error: "Missing required params: ?name=...&symbol=...&picture=slug" },
        { status: 400 }
      );
    }

    ensureEnvVars();
    const pk = process.env.PRIVATE_KEY;
    const creatorAddress = process.env.ADDRESS;
    const handle = process.env.HANDLE;
    const salt = process.env.SALT;
    const arenaJwt = process.env.ARENA_JWT;

    const pictureUrl = `${ARENA_IMAGE_HOST}${pictureSlug}`;
    const digest = `${creatorAddress}${handle}${pictureUrl}${symbol}${name}${salt}`;
    const hash = await ethers.hashMessage(digest);

    const payload = {
      hash,
      name: handle,
      photoURL: pictureUrl,
      ticker: symbol,
      tokenName: name,
      address: creatorAddress,
      paymentToken: ARENA_PAYMENT_TOKEN,
    };

    const arenaRes = await fetch(`${ARENA_BASE_URL}/communities/create-community-external`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${arenaJwt}`,
      },
      body: JSON.stringify(payload),
    });

    if (!arenaRes.ok) {
      const errBody = await arenaRes.text();
      throw new Error(`Arena API error (${arenaRes.status}): ${errBody}`);
    }

    const arenaJson = await arenaRes.json();
    const communityId = arenaJson?.community?.id;
    if (!communityId) {
      throw new Error("Arena API did not return community id");
    }

    const provider = new ethers.JsonRpcProvider(AVALANCHE_RPC);
    const wallet = new ethers.Wallet(pk, provider);
    const iface = new ethers.Interface(LEGACY_LAUNCHER_ABI);

    const encodedData = iface.encodeFunctionData("createToken", [
      A,
      B,
      CURVE_SCALER,
      CREATOR_FEE_BPS,
      creatorAddress,
      TOKEN_SPLIT,
      name,
      symbol,
      AMOUNT,
    ]);

    const idBytes = ethers.toUtf8Bytes(String(communityId));
    const idHex = ethers.hexlify(idBytes).slice(2);
    const txData = `${encodedData}${idHex}`;

    const readContract = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_QUERY_ABI, provider);
    let beforeTokenId = null;
    try {
      const id = await readContract.tokenIdentifier();
      beforeTokenId = BigInt(id);
    } catch {
      // ignore if not available
    }

    const tx = await wallet.sendTransaction({
      to: CONTRACT_ADDRESS,
      data: txData,
      value: 0n,
    });

    let tokenAddress = null;
    let tokenId = null;
    try {
      const receipt = await provider.waitForTransaction(tx.hash, 1, 120_000);
      if (receipt?.logs?.length) {
        const fullIface = new ethers.Interface(launcherAbi);
        for (const log of receipt.logs) {
          try {
            const parsed = fullIface.parseLog(log);
            const addr = extractTokenAddress(parsed);
            if (addr) {
              tokenAddress = addr;
            }
            if (parsed?.args?.tokenId !== undefined && !tokenId) {
              tokenId = parsed?.args?.tokenId?.toString?.() || String(parsed?.args?.tokenId);
            }
            if (!tokenAddress && parsed?.name === "OwnershipTransferred") {
              const inferred = normalizeAddress(log.address);
              if (inferred && inferred.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
                tokenAddress = inferred;
              }
            }
            if (tokenAddress) break;
          } catch {
            // ignore non-matching logs for full ABI
          }

          for (const abi of TOKEN_CREATED_EVENT_ABIS) {
            try {
              const eventIface = new ethers.Interface([abi]);
              const parsed = eventIface.parseLog(log);
              if (parsed?.name === "TokenCreated") {
                tokenAddress = normalizeAddress(parsed?.args?.params?.tokenContractAddress) || null;
                if (parsed?.args?.tokenId !== undefined) {
                  tokenId = parsed?.args?.tokenId?.toString?.() || String(parsed?.args?.tokenId);
                }
                if (tokenAddress) break;
              }
            } catch {
              // ignore non-matching logs
            }
          }
          if (tokenAddress) break;
        }
      }
    } catch (err) {
      console.warn("create-token: receipt not available yet", err?.message || err);
    }

    // Fallback: read tokenIdentifier + token params after tx
    if (!tokenAddress) {
      try {
        const afterIdRaw = await readContract.tokenIdentifier();
        const afterId = BigInt(afterIdRaw);
        if (afterId) {
          if (beforeTokenId !== null && afterId > beforeTokenId) {
            tokenId = afterId.toString();
          } else if (!tokenId) {
            tokenId = afterId.toString();
          }
        }
        if (tokenId) {
          const params = await readContract.getTokenParameters(tokenId);
          tokenAddress = params?.tokenContractAddress || null;
        }
      } catch (err) {
        console.warn("create-token: token lookup failed", err?.message || err);
      }
    }

    return NextResponse.json({
      ok: true,
      hash: tx.hash,
      communityId: String(communityId),
      tokenAddress,
      tokenId,
    });
  } catch (err) {
    console.error("create-token error:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
function normalizeAddress(addr) {
  if (!addr || typeof addr !== "string") return null;
  const lower = addr.toLowerCase();
  if (lower === "0x0000000000000000000000000000000000000000") return null;
  return addr;
}

function extractTokenAddress(parsed) {
  const args = parsed?.args;
  if (!args) return null;
  const direct = normalizeAddress(args.tokenContractAddress);
  if (direct) return direct;
  const nested = normalizeAddress(args?.params?.tokenContractAddress);
  if (nested) return nested;
  return null;
}
