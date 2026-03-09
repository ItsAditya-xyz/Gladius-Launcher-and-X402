import { NextResponse } from "next/server";
import { ethers } from "ethers";
import launcherAbi from "../../../../../abis/launcher.json";

const AVALANCHE_RPC = "https://api.avax.network/ext/bc/C/rpc";
const CONTRACT_ADDRESS = "0x2196E106Af476f57618373ec028924767c758464";

const TOKEN_CREATED_EVENT_ABIS = [
  "event TokenCreated((uint32 a,uint8 b,uint128 curveScaler,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
  "event TokenCreated(uint256 tokenId,(uint128 curveScaler,uint32 a,uint8 b,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
  "event TokenCreated((uint16 a,uint8 b,uint128 curveScaler,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
  "event TokenCreated(uint256 tokenId,(uint128 curveScaler,uint16 a,uint8 b,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params,uint256 tokenSupply)",
];

const TOKEN_QUERY_ABI = [
  "function tokenIdentifier() view returns (uint256)",
  "function getTokenParameters(uint256) view returns (tuple(uint128 curveScaler,uint16 a,uint8 b,bool lpDeployed,uint8 lpPercentage,uint8 salePercentage,uint8 creatorFeeBasisPoints,address creatorAddress,address pairAddress,address tokenContractAddress) params)",
];

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

function requireAdmin(req) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = req.headers.get("x-admin-password");
  if (!adminPassword || !provided || provided !== adminPassword) {
    return false;
  }
  return true;
}

export async function GET(req) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const txHash = searchParams.get("tx")?.trim();
  const tokenIdParam = searchParams.get("token_id")?.trim();

  const provider = new ethers.JsonRpcProvider(AVALANCHE_RPC);
  const readContract = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_QUERY_ABI, provider);

  let latestTokenId = null;
  try {
    latestTokenId = (await readContract.tokenIdentifier()).toString();
  } catch {
    latestTokenId = null;
  }

  let tokenId = tokenIdParam || null;
  let tokenAddress = null;
  let logsParsed = false;
  const parsedEvents = [];
  let inferredFromOwnership = false;

  if (txHash) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return NextResponse.json(
        { ok: false, error: "receipt_not_found", latestTokenId },
        { status: 404 }
      );
    }

    if (receipt.logs?.length) {
      const fullIface = new ethers.Interface(launcherAbi);
      for (const log of receipt.logs) {
        try {
          const parsed = fullIface.parseLog(log);
          logsParsed = true;
          parsedEvents.push({
            name: parsed?.name,
            args: Object.fromEntries(
              Object.entries(parsed?.args || {}).filter(([key]) => isNaN(Number(key)))
            ),
            address: log.address,
          });
          const addr = extractTokenAddress(parsed);
          if (addr) tokenAddress = addr;
          if (parsed?.args?.tokenId !== undefined && !tokenId) {
            tokenId = parsed?.args?.tokenId?.toString?.() || String(parsed?.args?.tokenId);
          }
          if (!tokenAddress && parsed?.name === "OwnershipTransferred") {
            const inferred = normalizeAddress(log.address);
            if (inferred && inferred.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
              tokenAddress = inferred;
              inferredFromOwnership = true;
            }
          }
        } catch {
          // ignore
        }

        for (const abi of TOKEN_CREATED_EVENT_ABIS) {
          try {
            const eventIface = new ethers.Interface([abi]);
            const parsed = eventIface.parseLog(log);
            if (parsed?.name === "TokenCreated") {
              logsParsed = true;
              tokenAddress = extractTokenAddress(parsed) || tokenAddress;
              if (parsed?.args?.tokenId !== undefined) {
                tokenId = parsed?.args?.tokenId?.toString?.() || String(parsed?.args?.tokenId);
              }
              if (tokenAddress) break;
            }
          } catch {
            // ignore
          }
        }
        if (tokenAddress) break;
      }
    }
  }

  if (tokenId && !tokenAddress) {
    try {
      const params = await readContract.getTokenParameters(tokenId);
      tokenAddress = params?.tokenContractAddress || null;
    } catch {
      tokenAddress = null;
    }
  }

  return NextResponse.json({
    ok: true,
    tokenId: tokenId || null,
    tokenAddress,
    latestTokenId,
    logsParsed,
    inferredFromOwnership,
    events: parsedEvents.slice(0, 5),
  });
}
