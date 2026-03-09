import json
import os
import re
import sys
import time
import urllib.parse
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests
from web3 import Web3

BASE_URL = "https://api.x.com/2"
DEFAULT_TIMEOUT = 30
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
ARENA_UPLOAD_POLICY_URL = "https://api.starsarena.com/uploads/getUploadPolicy"
ARENA_UPLOAD_TARGET = "https://storage.googleapis.com/starsarena-s3-01/"

ARENA_BASE_URL = "https://api.starsarena.com"
ARENA_IMAGE_HOST = "https://static.starsarena.com/uploads/"
ARENA_PAYMENT_TOKEN = "arena"
ARENA_CONTRACT_ADDRESS = "0x2196E106Af476f57618373ec028924767c758464"
AVALANCHE_RPC = "https://api.avax.network/ext/bc/C/rpc"

MODE = "PRODUCTION"

A_PARAM = 677_781
B_PARAM = 0
CURVE_SCALER = 41_408_599_077
CREATOR_FEE_BPS = 0
TOKEN_SPLIT = 73
AMOUNT = 0

A_PARAM_STAGIGN = 9_645
B_PARAM_STAGING = 0
CURVE_SCALER_STAGING = 706_095_513_092
TOKEN_SPLIT_STAGING = 73




TOKEN_INTENT_RE = re.compile(
    r"\b(?:mint|minting|create|launch|deploy|make|build)\s+(?:a\s+)?(?:token|coin)\b"
    r"|\btoken\s+launch\b",
    re.IGNORECASE,
)

FEE_DEST_RE = re.compile(
    r"(?:route|send|direct|pay)\s+fees?\s+(?:to|towards)\s+@([A-Za-z0-9_]{1,15})"
    r"|fees?\s+(?:to|towards)\s+@([A-Za-z0-9_]{1,15})",
    re.IGNORECASE,
)

USE_POST_IMAGE_RE = re.compile(
    r"(?:use|take|grab|pick)\s+(?:the\s+)?(?:image|pfp|photo|picture)\s+"
    r"(?:from|in)\s+(?:this|the)\s+(?:post|tweet)",
    re.IGNORECASE,
)


def _arena_mode() -> str:
    mode = os.getenv("MODE") or MODE
    return str(mode).strip().upper()


def is_staging_mode() -> bool:
    return _arena_mode() in {"STAGIN", "STAGING"}


def _arena_base_url() -> str:
    if is_staging_mode():
        return os.getenv("ARENA_STAGING_API") or os.getenv(
            "ARENA_BASE_URL", ARENA_BASE_URL
        )
    return os.getenv("ARENA_BASE_URL", ARENA_BASE_URL)


def _arena_upload_policy_url() -> str:
    override = os.getenv("ARENA_UPLOAD_POLICY_URL")
    if override:
        return override
    if not is_staging_mode():
        return ARENA_UPLOAD_POLICY_URL
    base_url = _arena_base_url().rstrip("/")
    return f"{base_url}/uploads/getUploadPolicy"


def _arena_contract_address() -> str:
    if is_staging_mode():
        return os.getenv("ARENA_STAGIN_CONTRACT") or os.getenv(
            "ARENA_CONTRACT_ADDRESS", ARENA_CONTRACT_ADDRESS
        )
    return os.getenv("ARENA_CONTRACT_ADDRESS", ARENA_CONTRACT_ADDRESS)


def _avax_contract_address() -> str:
    if is_staging_mode():
        address = os.getenv("AVAX_CONTRACT_ADDRESS_STAGING") or os.getenv(
            "AVAX_CONTRACT_ADDRESS"
        )
    else:
        address = os.getenv("AVAX_CONTRACT_ADDRESS")
    if not address:
        raise RuntimeError("Missing AVAX_CONTRACT_ADDRESS.")
    return address


def _arena_creator_address(default_address: str) -> str:
    if is_staging_mode():
        override = os.getenv("STAGIGN_CREATOR_ADDRESS")
        if override:
            return override
    return default_address


def _pair_curve_params(pair: str) -> Tuple[int, int, int, int]:
    if is_staging_mode():
        a_param = int(os.getenv("A_PARAM_STAGIGN", A_PARAM_STAGIGN))
        b_param = int(os.getenv("B_PARAM_STAGING", B_PARAM_STAGING))
        curve_scaler = int(os.getenv("CURVE_SCALER_STAGING", CURVE_SCALER_STAGING))
        token_split = int(os.getenv("TOKEN_SPLIT_STAGING", TOKEN_SPLIT_STAGING))
    else:
        a_param = A_PARAM
        b_param = B_PARAM
        curve_scaler = CURVE_SCALER
        token_split = TOKEN_SPLIT

    if pair == "avax":
        a_param = int(os.getenv("AVAX_A_PARAM", a_param))
        b_param = int(os.getenv("AVAX_B_PARAM", b_param))
        curve_scaler = int(os.getenv("AVAX_CURVE_SCALER", curve_scaler))
        token_split = int(os.getenv("AVAX_TOKEN_SPLIT", token_split))
        if a_param < 0 or a_param > 65535:
            raise RuntimeError(
                "AVAX_A_PARAM must be between 0 and 65535 for avax pair."
            )

    return (a_param, b_param, curve_scaler, token_split)

_ARENA_ABI_CACHE: Optional[List[Dict[str, Any]]] = None
_AVAX_ABI_CACHE: Optional[List[Dict[str, Any]]] = None


def _load_arena_abi() -> List[Dict[str, Any]]:
    global _ARENA_ABI_CACHE
    if _ARENA_ABI_CACHE is not None:
        return _ARENA_ABI_CACHE
    candidates = [
        os.getenv("ARENA_ABI_PATH"),
        os.path.join(os.path.dirname(__file__), "abi.json"),
        os.path.join(os.getcwd(), "abi.json"),
    ]
    abi_path = next((path for path in candidates if path and os.path.exists(path)), None)
    if not abi_path:
        raise RuntimeError("abi.json not found (set ARENA_ABI_PATH).")
    with open(abi_path, "r", encoding="utf-8") as handle:
        abi = json.load(handle)
    if not isinstance(abi, list):
        raise RuntimeError("abi.json must contain a list ABI.")
    _ARENA_ABI_CACHE = abi
    return abi


def _load_avax_abi() -> List[Dict[str, Any]]:
    global _AVAX_ABI_CACHE
    if _AVAX_ABI_CACHE is not None:
        return _AVAX_ABI_CACHE
    candidates = [
        os.getenv("AVAX_ABI_PATH"),
        os.path.join(os.path.dirname(__file__), "avaxABI.json"),
        os.path.join(os.getcwd(), "avaxABI.json"),
    ]
    abi_path = next((path for path in candidates if path and os.path.exists(path)), None)
    if not abi_path:
        raise RuntimeError("avaxABI.json not found (set AVAX_ABI_PATH).")
    with open(abi_path, "r", encoding="utf-8") as handle:
        abi = json.load(handle)
    if not isinstance(abi, list):
        raise RuntimeError("avaxABI.json must contain a list ABI.")
    _AVAX_ABI_CACHE = abi
    return abi

TOKEN_QUERY_ABI = [
    {
        "inputs": [],
        "name": "tokenIdentifier",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
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
                    {
                        "internalType": "uint8",
                        "name": "creatorFeeBasisPoints",
                        "type": "uint8",
                    },
                    {
                        "internalType": "address",
                        "name": "creatorAddress",
                        "type": "address",
                    },
                    {"internalType": "address", "name": "pairAddress", "type": "address"},
                    {
                        "internalType": "address",
                        "name": "tokenContractAddress",
                        "type": "address",
                    },
                ],
                "internalType": "struct TokenParameters",
                "name": "params",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

TOKEN_CREATED_EVENT_ABIS = [
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": False,
                "name": "params",
                "type": "tuple",
                "components": [
                    {"name": "a", "type": "uint32"},
                    {"name": "b", "type": "uint8"},
                    {"name": "curveScaler", "type": "uint128"},
                    {"name": "lpPercentage", "type": "uint8"},
                    {"name": "salePercentage", "type": "uint8"},
                    {"name": "creatorFeeBasisPoints", "type": "uint8"},
                    {"name": "creatorAddress", "type": "address"},
                    {"name": "pairAddress", "type": "address"},
                    {"name": "tokenContractAddress", "type": "address"},
                ],
            },
            {"indexed": False, "name": "tokenSupply", "type": "uint256"},
        ],
        "name": "TokenCreated",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": False, "name": "tokenId", "type": "uint256"},
            {
                "indexed": False,
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
                    {"name": "tokenContractAddress", "type": "address"},
                ],
            },
            {"indexed": False, "name": "tokenSupply", "type": "uint256"},
        ],
        "name": "TokenCreated",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": False,
                "name": "params",
                "type": "tuple",
                "components": [
                    {"name": "a", "type": "uint16"},
                    {"name": "b", "type": "uint8"},
                    {"name": "curveScaler", "type": "uint128"},
                    {"name": "lpPercentage", "type": "uint8"},
                    {"name": "salePercentage", "type": "uint8"},
                    {"name": "creatorFeeBasisPoints", "type": "uint8"},
                    {"name": "creatorAddress", "type": "address"},
                    {"name": "pairAddress", "type": "address"},
                    {"name": "tokenContractAddress", "type": "address"},
                ],
            },
            {"indexed": False, "name": "tokenSupply", "type": "uint256"},
        ],
        "name": "TokenCreated",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": False, "name": "tokenId", "type": "uint256"},
            {
                "indexed": False,
                "name": "params",
                "type": "tuple",
                "components": [
                    {"name": "curveScaler", "type": "uint128"},
                    {"name": "a", "type": "uint16"},
                    {"name": "b", "type": "uint8"},
                    {"name": "lpPercentage", "type": "uint8"},
                    {"name": "salePercentage", "type": "uint8"},
                    {"name": "creatorFeeBasisPoints", "type": "uint8"},
                    {"name": "creatorAddress", "type": "address"},
                    {"name": "pairAddress", "type": "address"},
                    {"name": "tokenContractAddress", "type": "address"},
                ],
            },
            {"indexed": False, "name": "tokenSupply", "type": "uint256"},
        ],
        "name": "TokenCreated",
        "type": "event",
    },
]

OWNERSHIP_TRANSFERRED_EVENT_ABI = {
    "anonymous": False,
    "inputs": [
        {"indexed": True, "name": "previousOwner", "type": "address"},
        {"indexed": True, "name": "newOwner", "type": "address"},
    ],
    "name": "OwnershipTransferred",
    "type": "event",
}

BANKER_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "salt", "type": "bytes32"}],
        "name": "createAddress",
        "outputs": [{"internalType": "address", "name": "vaultAddr", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "salt", "type": "bytes32"},
            {"internalType": "uint16", "name": "feeBps", "type": "uint16"},
        ],
        "name": "createAddressWithFee",
        "outputs": [{"internalType": "address", "name": "vaultAddr", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "salt", "type": "bytes32"}],
        "name": "predictAddress",
        "outputs": [{"internalType": "address", "name": "predicted", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "vault", "type": "address"}],
        "name": "isVault",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "treasury",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "newTreasury", "type": "address"}],
        "name": "setTreasury",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "vault", "type": "address"},
            {"internalType": "uint16", "name": "feeBps", "type": "uint16"},
        ],
        "name": "setVaultFeeBps",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


class RateLimitError(Exception):
    def __init__(self, reset_epoch: Optional[int]):
        super().__init__("rate limited")
        self.reset_epoch = reset_epoch


class Auth:
    def __init__(self, kind: str, token: Optional[str] = None, oauth1: Any = None):
        self.kind = kind
        self.token = token
        self.oauth1 = oauth1


def log(message: str) -> None:
    print(message, file=sys.stderr)


def load_state(path: str) -> Dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}


def save_state(path: str, state: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2, sort_keys=True)


def app_auth_from_env() -> Auth:
    token = os.getenv("X_BEARER_TOKEN")
    if not token:
        raise RuntimeError("X_BEARER_TOKEN is required for reading mentions.")
    return Auth("bearer", token=token)


def user_auth_from_env() -> Optional[Auth]:
    user_access_token = os.getenv("X_USER_ACCESS_TOKEN")
    if user_access_token:
        return Auth("bearer", token=user_access_token)

    consumer_key = os.getenv("X_CONSUMER_KEY")
    consumer_secret = os.getenv("X_CONSUMER_KEY_SECRET")
    access_token = os.getenv("X_ACCESS_TOKEN")
    access_token_secret = os.getenv("X_ACCESS_TOKEN_SECRET")
    if all([consumer_key, consumer_secret, access_token, access_token_secret]):
        try:
            from requests_oauthlib import OAuth1
        except Exception as exc:
            raise RuntimeError(
                "requests_oauthlib is required for OAuth1. Install with "
                "`pip install requests_oauthlib`."
            ) from exc
        return Auth(
            "oauth1",
            oauth1=OAuth1(
                consumer_key,
                consumer_secret,
                access_token,
                access_token_secret,
            ),
        )

    return None


def _apply_auth(headers: Dict[str, str], auth: Optional[Auth]) -> Optional[Any]:
    if not auth:
        return None
    if auth.kind == "bearer":
        headers["Authorization"] = f"Bearer {auth.token}"
        return None
    if auth.kind == "oauth1":
        return auth.oauth1
    raise ValueError(f"Unsupported auth kind: {auth.kind}")


def request_json(
    method: str,
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    auth: Optional[Auth] = None,
    headers: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    req_headers = dict(headers or {})
    auth_obj = _apply_auth(req_headers, auth)
    response = requests.request(
        method,
        url,
        params=params,
        json=json_body,
        headers=req_headers,
        auth=auth_obj,
        timeout=DEFAULT_TIMEOUT,
    )
    if response.status_code == 429:
        reset_header = response.headers.get("x-rate-limit-reset")
        reset_epoch = int(reset_header) if reset_header and reset_header.isdigit() else None
        raise RateLimitError(reset_epoch)
    if response.status_code >= 400:
        raise RuntimeError(f"{response.status_code} {response.text}")
    return response.json()


def resolve_user_id(app_auth: Auth, user_auth: Optional[Auth]) -> str:
    user_id = os.getenv("X_USER_ID")
    if user_id:
        return user_id

    username = os.getenv("X_USERNAME")
    if username:
        data = request_json(
            "GET",
            f"{BASE_URL}/users/by/username/{username}",
            auth=app_auth,
        )
        return data["data"]["id"]

    if user_auth:
        data = request_json(
            "GET",
            f"{BASE_URL}/users/me",
            auth=user_auth,
        )
        return data["data"]["id"]

    raise RuntimeError(
        "Set X_USER_ID or X_USERNAME, or provide user auth for /2/users/me."
    )


def resolve_user_by_username(app_auth: Auth, username: str) -> Optional[Dict[str, Any]]:
    if not username:
        return None
    cleaned = username.lstrip("@")
    data = request_json(
        "GET",
        f"{BASE_URL}/users/by/username/{cleaned}",
        auth=app_auth,
    )
    return data.get("data")


def fetch_mentions(
    app_auth: Auth,
    user_id: str,
    *,
    since_id: Optional[str],
    max_results: int,
) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "max_results": max_results,
        "tweet.fields": "created_at,author_id,referenced_tweets,in_reply_to_user_id,attachments",
        "expansions": (
            "author_id,referenced_tweets.id,attachments.media_keys,"
            "referenced_tweets.id.attachments.media_keys"
        ),
        "media.fields": "url,preview_image_url,type",
        "user.fields": "username",
    }
    if since_id:
        params["since_id"] = since_id
    return request_json(
        "GET",
        f"{BASE_URL}/users/{user_id}/mentions",
        params=params,
        auth=app_auth,
    )


def fetch_tweet(app_auth: Auth, tweet_id: str) -> Dict[str, Any]:
    params = {
        "tweet.fields": "created_at,author_id,referenced_tweets,in_reply_to_user_id,attachments",
        "expansions": "author_id,attachments.media_keys",
        "media.fields": "url,preview_image_url,type",
        "user.fields": "username",
    }
    return request_json(
        "GET",
        f"{BASE_URL}/tweets/{tweet_id}",
        params=params,
        auth=app_auth,
    )


def post_reply(user_auth: Auth, text: str, in_reply_to_id: str) -> Dict[str, Any]:
    body = {"text": text, "reply": {"in_reply_to_tweet_id": in_reply_to_id}}
    return request_json(
        "POST",
        f"{BASE_URL}/tweets",
        json_body=body,
        auth=user_auth,
    )


def get_replied_to_id(tweet: Dict[str, Any]) -> Optional[str]:
    for ref in tweet.get("referenced_tweets", []) or []:
        if ref.get("type") == "replied_to":
            return ref.get("id")
    return None


def has_token_intent(texts: Iterable[str]) -> bool:
    for text in texts:
        if text and TOKEN_INTENT_RE.search(text):
            return True
    return False


def extract_fee_recipient_handle(texts: Iterable[str]) -> Optional[str]:
    for text in texts:
        if not text:
            continue
        match = FEE_DEST_RE.search(text)
        if match:
            return (match.group(1) or match.group(2) or "").lstrip("@") or None
    return None


def should_use_post_image(texts: Iterable[str]) -> bool:
    for text in texts:
        if text and USE_POST_IMAGE_RE.search(text):
            return True
    return False


def map_media_by_key(includes: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    media = includes.get("media") or []
    return {item["media_key"]: item for item in media if "media_key" in item}


def extract_media_urls(tweet: Dict[str, Any], media_by_key: Dict[str, Dict[str, Any]]) -> List[str]:
    urls: List[str] = []
    attachments = tweet.get("attachments") or {}
    media_keys = attachments.get("media_keys") or []
    for key in media_keys:
        media = media_by_key.get(key) or {}
        url = media.get("url") or media.get("preview_image_url")
        if url:
            urls.append(url)
    return urls


def extract_urls_from_text(text: str) -> List[str]:
    if not text:
        return []
    candidates = re.findall(r"https?://\\S+", text)
    cleaned: List[str] = []
    for url in candidates:
        cleaned_url = url.rstrip(").,!?\\\"'")  # strip common trailing punctuation
        if cleaned_url not in cleaned:
            cleaned.append(cleaned_url)
    return cleaned


def resolve_image_url(url: str) -> Optional[str]:
    try:
        response = requests.get(url, stream=True, timeout=DEFAULT_TIMEOUT, allow_redirects=True)
    except Exception:
        return None
    content_type = (response.headers.get("Content-Type") or "").lower()
    final_url = response.url
    response.close()
    if content_type.startswith("image/"):
        return final_url
    return None


def derive_bank_salt(seed: str, *, recipient_id: str) -> bytes:
    payload = "|".join([seed or "", str(recipient_id or "")])
    return Web3.keccak(text=payload)


def _signer_address_from_private_key(w3: Web3, private_key: str) -> str:
    account = w3.eth.account.from_key(private_key)
    return Web3.to_checksum_address(account.address)


def _send_contract_tx(
    w3: Web3,
    *,
    func: Any,
    signer_address: str,
    private_key: str,
) -> Dict[str, Any]:
    tx = {
        "from": signer_address,
        "nonce": w3.eth.get_transaction_count(signer_address, "pending"),
        "chainId": w3.eth.chain_id,
    }

    built = func.build_transaction(tx)
    tx.update(built)

    # Prefer EIP-1559 if baseFee is available to avoid underpricing
    try:
        pending_block = w3.eth.get_block("pending")
    except Exception:
        pending_block = None
    try:
        latest_block = w3.eth.get_block("latest")
    except Exception:
        latest_block = None
    base_fee_pending = (
        pending_block.get("baseFeePerGas") if isinstance(pending_block, dict) else None
    )
    base_fee_latest = (
        latest_block.get("baseFeePerGas") if isinstance(latest_block, dict) else None
    )
    base_fee = max(
        [fee for fee in [base_fee_pending, base_fee_latest] if fee is not None],
        default=None,
    )
    if base_fee is not None:
        try:
            priority_fee = w3.eth.max_priority_fee
        except Exception:
            priority_fee = None
        # Ensure a minimum priority fee (2 gwei)
        min_priority = 2_000_000_000
        priority_fee = int(priority_fee) if priority_fee is not None else min_priority
        if priority_fee < min_priority:
            priority_fee = min_priority

        # Add buffer to handle base fee spikes between signing and mining
        try:
            suggested = int(w3.eth.gas_price)
        except Exception:
            suggested = 0

        max_fee = int(base_fee * 3 + priority_fee)
        if suggested > max_fee:
            max_fee = suggested
        if max_fee <= base_fee:
            max_fee = int(base_fee + priority_fee + 1)

        tx.pop("gasPrice", None)
        tx["maxPriorityFeePerGas"] = int(priority_fee)
        tx["maxFeePerGas"] = int(max_fee)
    else:
        tx.pop("maxPriorityFeePerGas", None)
        tx.pop("maxFeePerGas", None)
        tx["gasPrice"] = w3.eth.gas_price
    gas_limit_env = os.getenv("ADMIN_GAS_LIMIT")
    gas_multiplier_env = os.getenv("ADMIN_GAS_MULTIPLIER", "2.0")
    try:
        gas_multiplier = float(gas_multiplier_env)
    except ValueError:
        gas_multiplier = 2.0
    if gas_multiplier < 1.0:
        gas_multiplier = 1.0

    gas_estimate = None
    try:
        gas_estimate = w3.eth.estimate_gas(tx)
    except Exception:
        gas_estimate = None

    if gas_estimate is not None:
        gas_limit = int(gas_estimate * gas_multiplier)
    else:
        gas_limit = 1_500_000

    if gas_limit_env and gas_limit_env.isdigit():
        gas_limit = max(gas_limit, int(gas_limit_env))

    tx["gas"] = gas_limit

    signed = w3.eth.account.sign_transaction(tx, private_key=private_key)
    raw_tx = getattr(signed, "rawTransaction", None) or getattr(
        signed, "raw_transaction", None
    )
    if not raw_tx:
        raise RuntimeError("Signed transaction missing raw payload.")
    tx_hash = w3.eth.send_raw_transaction(raw_tx)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    return receipt


def create_fee_vault(
    *,
    rpc_url: str,
    bank_contract_address: str,
    private_key: str,
    signer_address: Optional[str],
    salt: bytes,
    fee_bps: Optional[int],
    treasury_address: Optional[str],
    ensure_treasury: bool = False,
) -> str:
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    derived_signer = _signer_address_from_private_key(w3, private_key)
    if signer_address:
        signer_address = Web3.to_checksum_address(signer_address)
        if signer_address.lower() != derived_signer.lower():
            raise RuntimeError("Signer address does not match private key.")
    else:
        signer_address = derived_signer

    bank_contract_address = Web3.to_checksum_address(bank_contract_address)
    contract = w3.eth.contract(address=bank_contract_address, abi=BANKER_ABI)

    predicted = contract.functions.predictAddress(salt).call()
    predicted = Web3.to_checksum_address(predicted)

    try:
        if contract.functions.isVault(predicted).call():
            return predicted
    except Exception:
        pass

    if ensure_treasury and treasury_address:
        treasury_address = Web3.to_checksum_address(treasury_address)
        try:
            current = contract.functions.treasury().call()
            current = Web3.to_checksum_address(current)
        except Exception:
            current = None
        if current != treasury_address:
            receipt = _send_contract_tx(
                w3,
                func=contract.functions.setTreasury(treasury_address),
                signer_address=signer_address,
                private_key=private_key,
            )
            if receipt.get("status") != 1:
                raise RuntimeError("Failed to set treasury on bank contract.")

    if fee_bps is None:
        func = contract.functions.createAddress(salt)
    else:
        func = contract.functions.createAddressWithFee(salt, int(fee_bps))

    receipt = _send_contract_tx(
        w3,
        func=func,
        signer_address=signer_address,
        private_key=private_key,
    )
    if receipt.get("status") != 1:
        raise RuntimeError("Bank vault creation failed.")

    return predicted


def store_fee_vault_mapping(
    *,
    supabase_url: str,
    supabase_key: str,
    table: str,
    payload: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not supabase_url or not supabase_key or not table:
        return None
    url = f"{supabase_url.rstrip('/')}/rest/v1/rpc/upsert_fee_vault"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    x_user_id = payload.get("x_user_id")
    x_user_handle = payload.get("x_user_handle")
    vault_address = payload.get("vault_address")
    if not x_user_id or not vault_address:
        raise RuntimeError("Missing x_user_id or vault_address for fee vault mapping.")
    body = {
        "p_x_user_id": x_user_id,
        "p_x_user_handle": x_user_handle,
        "p_vault_address": vault_address,
    }
    response = requests.post(
        url, headers=headers, json=body, timeout=DEFAULT_TIMEOUT
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"Supabase insert failed: {response.status_code} {response.text}"
        )
    try:
        data = response.json()
    except Exception:
        return None
    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict):
        return data
    return None


def store_minted_token(
    *,
    supabase_url: str,
    supabase_key: str,
    payload: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not supabase_url or not supabase_key:
        return None
    url = f"{supabase_url.rstrip('/')}/rest/v1/rpc/upsert_minted_token"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    x_user_id = payload.get("x_user_id")
    vault_address = payload.get("vault_address")
    token_address = payload.get("token_address")
    token_id = payload.get("token_id")
    community_id = payload.get("community_id")
    tx_hash = payload.get("tx_hash")
    tweet_url = payload.get("tweet_url")
    if not x_user_id or not vault_address or not token_address:
        raise RuntimeError("Missing x_user_id, vault_address, or token_address.")
    body = {
        "p_x_user_id": x_user_id,
        "p_vault_address": vault_address,
        "p_token_address": token_address,
        "p_token_id": token_id,
        "p_community_id": community_id,
        "p_tx_hash": tx_hash,
        "p_tweet_url": tweet_url,
    }
    response = requests.post(
        url, headers=headers, json=body, timeout=DEFAULT_TIMEOUT
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"Supabase minted token insert failed: {response.status_code} {response.text}"
        )
    try:
        data = response.json()
    except Exception:
        return None
    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict):
        return data
    return None


def _openrouter_api_key() -> Optional[str]:
    return os.getenv("OPEN_ROUTER_KEY")


def openai_extract_token_request(
    context: str,
    candidate_images: List[str],
    *,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    api_key = _openrouter_api_key()
    if not api_key:
        raise RuntimeError("Missing OPEN_ROUTER_KEY for OpenRouter calls.")

    payload = {
        "model": model or os.getenv("OPENROUTER_MODEL", "openai/gpt-4.1-mini"),
        "temperature": 0,
        "max_tokens": 300,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract token creation details from social posts. "
                "If the context is requesting a token creation/launch/mint, "
                "return the token name from the context, ticker, a pfp_url, and pair. "
                "If only ticker is mentioend use both as ticker and name/symbol. "
                "If ticker is not explicitly provided, derive it from the name "
                "(uppercase A-Z0-9, max 6 chars). "
                "Set pair to 'arena' only if the user explicitly asks for arena paired. "
                "Otherwise set pair to 'avax'. "
                "If not a request, set should_create=false."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Context tweets:\n"
                    f"{context}\n\n"
                    "Candidate pfp image URLs (choose one or null):\n"
                    f"{candidate_images}\n\n"
                    "Return strict JSON with keys:\n"
                    "should_create (bool), name (string or null), "
                    "ticker (string or null), pfp_url (string or null), "
                    "pair (string: 'avax' or 'arena'). "
                    "If the candidate list is empty, pfp_url must be null. "
                    "Otherwise pfp_url must be one of the candidate URLs or null."
                ),
            },
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_REFERER", ""),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", ""),
    }
    response = requests.post(
        OPENROUTER_API_URL, headers=headers, json=payload, timeout=DEFAULT_TIMEOUT
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"OpenRouter API error: {response.status_code} {response.text}"
        )
    data = response.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    data = _extract_json_from_text(content)
    if data.get("should_create") and data.get("name") and not data.get("ticker"):
        derived = re.sub(r"[^A-Za-z0-9]", "", str(data["name"]).upper())
        data["ticker"] = derived[:6] if derived else None
    pair_raw = data.get("pair")
    pair = str(pair_raw or "").strip().lower()
    if "arena" in pair:
        data["pair"] = "arena"
    else:
        data["pair"] = "avax"
    return data


def _extract_json_from_text(text: str) -> Dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("OpenAI response did not include JSON.")
    return json.loads(text[start : end + 1])


def download_image(url: str) -> Tuple[bytes, str, str]:
    response = requests.get(url, timeout=DEFAULT_TIMEOUT)
    if response.status_code >= 400:
        raise RuntimeError(f"Failed to download image: {response.status_code} {response.text}")
    content_type = response.headers.get("Content-Type") or "image/png"
    filename = os.path.basename(urllib.parse.urlparse(url).path) or "upload.png"
    return response.content, content_type, filename


def upload_image_to_arena(image_url: str, arena_jwt: str) -> Dict[str, Any]:
    img_bytes, content_type, filename = download_image(image_url)

    encoded_type = urllib.parse.quote(content_type)
    encoded_name = urllib.parse.quote(filename)
    policy_base = _arena_upload_policy_url()
    policy_url = f"{policy_base}?fileType={encoded_type}&fileName={encoded_name}"
    token = arena_jwt.strip()
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": os.getenv(
            "ARENA_USER_AGENT",
            "Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/133.0",
        ),
        "Referrer": os.getenv("ARENA_REFERRER", "https://arena.social"),
        "Content-Type": "application/json",
    }
    policy_res = requests.get(policy_url, headers=headers, timeout=DEFAULT_TIMEOUT)
    if policy_res.status_code >= 400:
        raise RuntimeError(
            f"Upload policy error: {policy_res.status_code} {policy_res.text}"
        )
    policy_json = policy_res.json()
    upload_policy = policy_json.get("uploadPolicy") or {}
    if not upload_policy.get("key"):
        raise RuntimeError("Upload policy missing key.")

    fields = dict(upload_policy)
    fields["Content-Type"] = content_type
    fields.pop("enctype", None)
    fields.pop("url", None)

    files = {"file": (filename, img_bytes, content_type)}
    upload_target = os.getenv("ARENA_UPLOAD_TARGET", ARENA_UPLOAD_TARGET)
    upload_res = requests.post(
        upload_target, data=fields, files=files, timeout=DEFAULT_TIMEOUT
    )
    if upload_res.status_code != 204:
        raise RuntimeError(
            f"Upload failed: {upload_res.status_code} {upload_res.text}"
        )

    key = fields.get("key")
    slug = key.split("/")[-1] if key else None
    url = f"https://static.starsarena.com/{key}" if key else None
    return {"key": key, "slug": slug, "url": url}


def _hash_message_eip191(message: str) -> str:
    msg_bytes = message.encode("utf-8")
    prefix = f"\x19Ethereum Signed Message:\n{len(msg_bytes)}".encode("utf-8")
    digest = Web3.keccak(prefix + msg_bytes).hex()
    if not digest.startswith("0x"):
        digest = "0x" + digest
    return digest


def create_community_external(
    arena_jwt: str,
    *,
    name: str,
    symbol: str,
    picture_slug: str,
    handle: str,
    creator_address: str,
    salt: str,
) -> Dict[str, Any]:
    base_url = _arena_base_url()
    image_host = os.getenv("ARENA_IMAGE_HOST", ARENA_IMAGE_HOST)
    picture_url = f"{image_host}{picture_slug}"
    digest = f"{creator_address}{handle}{picture_url}{symbol}{name}{salt}"
    message_hash = _hash_message_eip191(digest)

    payload = {
        "hash": message_hash,
        "name": handle,
        "photoURL": picture_url,
        "ticker": symbol,
        "tokenName": name,
        "address": creator_address,
        "paymentToken": ARENA_PAYMENT_TOKEN,
    }

    token = arena_jwt.strip()
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()
    response = requests.post(
        f"{base_url}/communities/create-community-external",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=DEFAULT_TIMEOUT,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"Arena create-community error: {response.status_code} {response.text}"
        )
    return response.json()


def _normalize_address(addr: Optional[str]) -> Optional[str]:
    if not addr or not isinstance(addr, str):
        return None
    if addr.lower() == "0x0000000000000000000000000000000000000000":
        return None
    return Web3.to_checksum_address(addr)


def _encode_create_token_data(
    arena_contract: Any,
    *,
    creator_address: str,
    name: str,
    symbol: str,
    community_id: str,
    pair: str,
) -> str:
    a_param, b_param, curve_scaler, token_split = _pair_curve_params(pair)
    args = [
        a_param,
        b_param,
        curve_scaler,
        CREATOR_FEE_BPS,
        creator_address,
        token_split,
        name,
        symbol,
        AMOUNT,
    ]
    func = arena_contract.functions.createToken(*args)
    try:
        data = func._encode_transaction_data()
    except Exception:
        data = func.build_transaction({"from": creator_address}).get("data")
    if not data:
        raise RuntimeError("Unable to encode createToken call data.")
    id_hex = str(community_id).encode("utf-8").hex()
    return "0x" + data[2:] + id_hex


def _decode_token_created(
    w3: Web3,
    receipt: Dict[str, Any],
    *,
    launcher_address: str,
) -> Tuple[Optional[str], Optional[str]]:
    token_address = None
    token_id = None
    logs = receipt.get("logs") or []
    for log in logs:
        for abi in TOKEN_CREATED_EVENT_ABIS:
            try:
                contract = w3.eth.contract(abi=[abi])
                event = contract.events.TokenCreated().process_log(log)
            except Exception:
                continue
            args = event.get("args") or {}
            if args.get("tokenId") is not None and token_id is None:
                token_id = str(args.get("tokenId"))
            params = args.get("params") or {}
            addr = _normalize_address(params.get("tokenContractAddress"))
            if addr:
                token_address = addr
            if token_address:
                return token_address, token_id

        if token_address:
            break

    if not token_address:
        for log in logs:
            try:
                contract = w3.eth.contract(abi=[OWNERSHIP_TRANSFERRED_EVENT_ABI])
                contract.events.OwnershipTransferred().process_log(log)
            except Exception:
                continue
            addr = _normalize_address(log.get("address"))
            if addr and addr.lower() != launcher_address.lower():
                token_address = addr
                break

    return token_address, token_id


def _fallback_token_lookup(
    contract: Any,
    *,
    before_token_id: Optional[int],
) -> Tuple[Optional[str], Optional[str]]:
    try:
        after_id_raw = contract.functions.tokenIdentifier().call()
        after_id = int(after_id_raw)
    except Exception:
        return None, None

    if before_token_id is None or after_id <= before_token_id:
        return None, None

    if after_id - before_token_id != 1:
        return None, None

    token_id = after_id
    try:
        params = contract.functions.getTokenParameters(token_id).call()
        token_address = _normalize_address(params[-1])
    except Exception:
        return None, str(token_id)

    return token_address, str(token_id)


def mint_token_on_arena(
    *,
    name: str,
    symbol: str,
    picture_slug: str,
    arena_jwt: str,
    private_key: str,
    creator_address: str,
    signer_address: Optional[str] = None,
    handle: str,
    salt: str,
    pair: str = "avax",
) -> Dict[str, Any]:
    creator_address = _arena_creator_address(creator_address)
    arena_json = create_community_external(
        arena_jwt,
        name=name,
        symbol=symbol,
        picture_slug=picture_slug,
        handle=handle,
        creator_address=creator_address,
        salt=salt,
    )
    community = arena_json.get("community") or {}
    community_id = community.get("id") or arena_json.get("communityId")
    if not community_id:
        raise RuntimeError("Arena API did not return community id.")

    rpc_url = os.getenv("AVALANCHE_RPC", AVALANCHE_RPC)
    pair = str(pair or "avax").strip().lower()
    if "arena" in pair:
        pair = "arena"
    else:
        pair = "avax"
    contract_address = (
        _arena_contract_address() if pair == "arena" else _avax_contract_address()
    )
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    creator_address = Web3.to_checksum_address(creator_address)
    contract_address = Web3.to_checksum_address(contract_address)
    derived_signer = _signer_address_from_private_key(w3, private_key)
    if signer_address:
        signer_address = Web3.to_checksum_address(signer_address)
        if signer_address.lower() != derived_signer.lower():
            raise RuntimeError("SIGNER_ADDRESS does not match PRIVATE_KEY.")
    else:
        signer_address = derived_signer

    arena_contract = w3.eth.contract(
        address=contract_address,
        abi=_load_arena_abi() if pair == "arena" else _load_avax_abi(),
    )
    tx_data = _encode_create_token_data(
        arena_contract,
        creator_address=creator_address,
        name=name,
        symbol=symbol,
        community_id=str(community_id),
        pair=pair,
    )

    tx = {
        "from": signer_address,
        "to": contract_address,
        "data": tx_data,
        "value": 0,
        "nonce": w3.eth.get_transaction_count(signer_address, "pending"),
        "chainId": w3.eth.chain_id,
    }
    # Gas limit tuning for contract creation on Arena
    mint_gas_limit_env = os.getenv("MINT_GAS_LIMIT")
    mint_gas_multiplier_env = os.getenv("MINT_GAS_MULTIPLIER", "2.5")
    try:
        mint_gas_multiplier = float(mint_gas_multiplier_env)
    except ValueError:
        mint_gas_multiplier = 2.5
    if mint_gas_multiplier < 1.0:
        mint_gas_multiplier = 1.0

    gas_estimate = None
    try:
        gas_estimate = w3.eth.estimate_gas(tx)
    except Exception:
        gas_estimate = None

    if gas_estimate is not None:
        gas_limit = int(gas_estimate * mint_gas_multiplier)
    else:
        gas_limit = 2_500_000

    if mint_gas_limit_env and mint_gas_limit_env.isdigit():
        gas_limit = max(gas_limit, int(mint_gas_limit_env))

    tx["gas"] = gas_limit

    # Prefer EIP-1559 if baseFee is available
    use_legacy = os.getenv("MINT_USE_LEGACY_GAS") == "1"
    if not use_legacy:
        try:
            pending_block = w3.eth.get_block("pending")
        except Exception:
            pending_block = None
        try:
            latest_block = w3.eth.get_block("latest")
        except Exception:
            latest_block = None
        base_fee_pending = (
            pending_block.get("baseFeePerGas")
            if isinstance(pending_block, dict)
            else None
        )
        base_fee_latest = (
            latest_block.get("baseFeePerGas")
            if isinstance(latest_block, dict)
            else None
        )
        base_fee = max(
            [fee for fee in [base_fee_pending, base_fee_latest] if fee is not None],
            default=None,
        )
    else:
        base_fee = None

    if base_fee is not None:
        priority_gwei = os.getenv("MINT_PRIORITY_FEE_GWEI")
        max_fee_gwei = os.getenv("MINT_MAX_FEE_GWEI")
        if priority_gwei and priority_gwei.replace(".", "", 1).isdigit():
            priority_fee = int(float(priority_gwei) * 1_000_000_000)
        else:
            try:
                priority_fee = int(w3.eth.max_priority_fee)
            except Exception:
                priority_fee = 2_000_000_000
        min_priority = 2_000_000_000
        if priority_fee < min_priority:
            priority_fee = min_priority

        if max_fee_gwei and max_fee_gwei.replace(".", "", 1).isdigit():
            max_fee = int(float(max_fee_gwei) * 1_000_000_000)
        else:
            max_fee = int(base_fee * 3 + priority_fee)

        if max_fee <= base_fee:
            max_fee = int(base_fee + priority_fee + 1)

        tx.pop("gasPrice", None)
        tx["maxPriorityFeePerGas"] = int(priority_fee)
        tx["maxFeePerGas"] = int(max_fee)
    else:
        tx.pop("maxPriorityFeePerGas", None)
        tx.pop("maxFeePerGas", None)
        tx["gasPrice"] = w3.eth.gas_price

    signed = w3.eth.account.sign_transaction(tx, private_key=private_key)
    raw_tx = getattr(signed, "rawTransaction", None) or getattr(
        signed, "raw_transaction", None
    )
    if not raw_tx:
        raise RuntimeError("Signed transaction missing raw payload.")
    tx_hash = w3.eth.send_raw_transaction(raw_tx)
    tx_hash_hex = tx_hash.hex() if hasattr(tx_hash, "hex") else str(tx_hash)

    token_address = None
    token_id = None
    receipt = None
    for _ in range(10):
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
        except Exception:
            receipt = None

        if receipt:
            status = receipt.get("status")
            if status == 0:
                raise RuntimeError(f"Mint transaction reverted: {tx_hash_hex}")
            token_address, _token_id = _decode_token_created(
                w3, receipt, launcher_address=contract_address
            )
            if token_address:
                print("found CA")
                return {
                    "communityId": str(community_id),
                    "txHash": tx_hash_hex,
                    "tokenAddress": token_address,
                }

        print("not found CA")
        time.sleep(2)

    return {
        "communityId": str(community_id),
        "txHash": tx_hash_hex,
        "tokenAddress": token_address,
    }


def seconds_until(reset_epoch: Optional[int]) -> int:
    if not reset_epoch:
        return 60
    now = int(time.time())
    return max(0, reset_epoch - now + 5)
