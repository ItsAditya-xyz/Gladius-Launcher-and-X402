require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

const AVALANCHE_RPC_URL =
  process.env.AVALANCHE_RPC_URL ||
  process.env.BANK_RPC_URL ||
  "https://api.avax.network/ext/bc/C/rpc";
const FUJI_RPC_URL =
  process.env.FUJI_RPC_URL ||
  "https://api.avax-test.network/ext/bc/C/rpc";
const RAW_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const PRIVATE_KEY = RAW_PRIVATE_KEY
  ? RAW_PRIVATE_KEY.startsWith("0x")
    ? RAW_PRIVATE_KEY
    : `0x${RAW_PRIVATE_KEY}`
  : "";
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || "";

module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./contract",
  },
  networks: {
    avalanche: {
      url: AVALANCHE_RPC_URL,
      chainId: 43114,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    fuji: {
      url: FUJI_RPC_URL,
      chainId: 43113,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      avalanche: SNOWTRACE_API_KEY,
      fuji: SNOWTRACE_API_KEY,
    },
    customChains: [
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://snowtrace.io",
        },
      },
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io",
        },
      },
    ],
  },
};
