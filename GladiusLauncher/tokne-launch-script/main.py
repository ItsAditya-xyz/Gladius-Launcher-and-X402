import os
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, Optional

from dotenv import load_dotenv

from function import (
    RateLimitError,
    app_auth_from_env,
    create_fee_vault,
    derive_bank_salt,
    extract_fee_recipient_handle,
    extract_media_urls,
    extract_urls_from_text,
    fetch_mentions,
    fetch_tweet,
    get_replied_to_id,
    has_token_intent,
    is_staging_mode,
    load_state,
    log,
    map_media_by_key,
    mint_token_on_arena,
    openai_extract_token_request,
    resolve_image_url,
    resolve_user_by_username,
    resolve_user_id,
    save_state,
    seconds_until,
    should_use_post_image,
    store_fee_vault_mapping,
    upload_image_to_arena,
    user_auth_from_env,
)


def _map_by_id(items: Any) -> Dict[str, Dict[str, Any]]:
    return {item["id"]: item for item in items or [] if "id" in item}


def _format_user(user: Dict[str, Any]) -> str:
    if not user:
        return "@unknown"
    username = user.get("username") or "unknown"
    return f"@{username}"


def _print_tweet(label: str, tweet: Dict[str, Any], users: Dict[str, Dict[str, Any]]) -> None:
    author = users.get(tweet.get("author_id"))
    print(f"{label} {tweet.get('id')} by {_format_user(author)}")
    print(tweet.get("text", ""))


def _tweet_url(tweet_id: str, author: Dict[str, Any] = None) -> str:
    if author and author.get("username"):
        return f"https://x.com/{author['username']}/status/{tweet_id}"
    return f"https://x.com/i/web/status/{tweet_id}"


def _extract_arena_slug_from_url(url: str) -> Optional[str]:
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return None
    host = (parsed.netloc or "").lower()
    if not host or "static.starsarena.com" not in host:
        return None
    path = parsed.path or ""
    slug = path.split("/")[-1] if path else ""
    return slug or None


def _build_context(
    mention: Dict[str, Any],
    mention_author: Dict[str, Any],
    parent: Optional[Dict[str, Any]],
    parent_author: Optional[Dict[str, Any]],
) -> str:
    lines = [
        f"Mention by {_format_user(mention_author)}:",
        mention.get("text", ""),
    ]
    if mention.get("id"):
        lines.append(f"Link: {_tweet_url(mention['id'], mention_author)}")
    if parent:
        lines.extend(
            [
                "",
                f"Parent by {_format_user(parent_author)}:",
                parent.get("text", ""),
            ]
        )
        if parent.get("id"):
            lines.append(f"Link: {_tweet_url(parent['id'], parent_author)}")
    return "\n".join(lines).strip()


def _process_token_request(
    *,
    tweet: Dict[str, Any],
    author: Optional[Dict[str, Any]],
    parent: Optional[Dict[str, Any]],
    parent_author: Optional[Dict[str, Any]],
    media_by_key: Dict[str, Any],
    parent_media_by_key: Dict[str, Any],
    app_auth: Dict[str, Any],
    custom_mint_image: Optional[str],
    arena_jwt: Optional[str],
    private_key: Optional[str],
    signer_address: Optional[str],
    handle: Optional[str],
    salt: Optional[str],
    bank_contract_address: Optional[str],
    bank_private_key: Optional[str],
    bank_signer_address: Optional[str],
    bank_fee_bps: int,
    bank_treasury: Optional[str],
    bank_set_treasury: bool,
    bank_salt_seed: str,
    bank_rpc_url: Optional[str],
    supabase_url: Optional[str],
    supabase_key: Optional[str],
    supabase_table: str,
) -> None:
    mention_text = tweet.get("text", "")
    parent_text = parent.get("text", "") if parent else ""

    fee_handle = extract_fee_recipient_handle([mention_text, parent_text])
    fee_user = None
    if fee_handle:
        try:
            fee_user = resolve_user_by_username(app_auth, fee_handle)
        except Exception as exc:
            log(f"Failed to resolve fee recipient @{fee_handle}: {exc}")
            fee_user = None
    if not fee_user:
        fee_user = author
    if not fee_user or not fee_user.get("id"):
        log("Missing fee recipient user id. Skipping.")
        return

    mention_images = extract_media_urls(tweet, media_by_key)
    mention_text_urls = extract_urls_from_text(mention_text)
    for url in mention_text_urls:
        resolved = resolve_image_url(url)
        if resolved:
            mention_images.append(resolved)
    parent_images = extract_media_urls(parent, parent_media_by_key) if parent else []
    if parent:
        parent_text_urls = extract_urls_from_text(parent_text)
        for url in parent_text_urls:
            resolved = resolve_image_url(url)
            if resolved:
                parent_images.append(resolved)
    use_post_image = should_use_post_image([mention_text, parent_text])
    if use_post_image and parent_images:
        candidate_images = list(dict.fromkeys(parent_images))
    else:
        candidate_images = list(dict.fromkeys(mention_images))

    used_custom_image = False
    context = _build_context(tweet, author, parent, parent_author)
    try:
        extracted = openai_extract_token_request(context, candidate_images)
    except Exception as exc:
        log(f"OpenAI extraction failed: {exc}")
        return

    should_create = bool(extracted.get("should_create"))
    name = extracted.get("name")
    ticker = extracted.get("ticker")
    pfp_url = extracted.get("pfp_url")
    raw_pair = extracted.get("pair")
    pair = str(raw_pair or "").strip().lower()
    if "arena" in pair:
        pair = "arena"
    elif "avax" in pair:
        pair = "avax"
    else:
        pair = "avax"
    log(
        "OpenAI extraction: "
        f"should_create={should_create} "
        f"name={name} "
        f"ticker={ticker} "
        f"pfp_url={pfp_url} "
        f"pair={pair}"
    )

    if not should_create:
        log("OpenAI said no token request found. Skipping.")
        return
    if not name or not ticker:
        log("Missing name/ticker from OpenAI. Skipping.")
        return
    if candidate_images:
        if pfp_url not in candidate_images:
            pfp_url = candidate_images[0]
    else:
        pfp_url = custom_mint_image
        used_custom_image = True
    if not pfp_url:
        log("Missing pfp_url and CUSTOM_MINT_IMAGE. Skipping.")
        return
    if not arena_jwt:
        log("Missing ARENA_JWT for image upload. Skipping.")
        return
    if not private_key or not handle or not salt:
        log(
            "Missing one of PRIVATE_KEY, HANDLE, SALT. "
            "Skipping mint."
        )
        return
    if not bank_contract_address or not bank_private_key or not bank_rpc_url:
        log(
            "Missing BANK_CONTRACT_ADDRESS, ADMIN_PRIVATE_KEY, or BANK_RPC_URL. "
            "Skipping mint."
        )
        return

    picture_slug = None
    if used_custom_image:
        picture_slug = _extract_arena_slug_from_url(pfp_url)
        if picture_slug:
            log("Using CUSTOM_MINT_IMAGE without re-upload.")

    if not picture_slug:
        try:
            upload_info = upload_image_to_arena(pfp_url, arena_jwt)
        except Exception as exc:
            log(f"Arena image upload failed: {exc}")
            return
        picture_slug = upload_info.get("slug")
    if not picture_slug:
        log("Arena upload did not return slug. Skipping.")
        return

    try:
        bank_salt = derive_bank_salt(
            bank_salt_seed, recipient_id=fee_user["id"]
        )
        vault_address = create_fee_vault(
            rpc_url=bank_rpc_url,
            bank_contract_address=bank_contract_address,
            private_key=bank_private_key,
            signer_address=bank_signer_address,
            salt=bank_salt,
            fee_bps=bank_fee_bps,
            treasury_address=bank_treasury,
            ensure_treasury=bank_set_treasury,
        )
    except Exception as exc:
        log(f"Bank vault creation failed: {exc}")
        return

    if not supabase_url or not supabase_key:
        log("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Skipping mint.")
        return
    try:
        stored = store_fee_vault_mapping(
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            table=supabase_table,
            payload={
                "x_user_id": fee_user["id"],
                "x_user_handle": fee_user.get("username"),
                "vault_address": vault_address,
            },
        )
    except Exception as exc:
        log(f"Supabase insert failed: {exc}")
        return
    if not stored:
        log("Supabase insert returned no data. Skipping mint.")
        return

    try:
        arena_resp = mint_token_on_arena(
            name=name,
            symbol=ticker,
            picture_slug=picture_slug,
            arena_jwt=arena_jwt,
            private_key=private_key,
            creator_address=vault_address,
            signer_address=signer_address,
            handle=handle,
            salt=salt,
            pair=pair,
        )
    except Exception as exc:
        log(f"Arena mint failed: {exc}")
        return

    tx_hash = arena_resp.get("txHash")
    token_address = arena_resp.get("tokenAddress")
    if tx_hash:
        if token_address:
            print(f"tx={tx_hash} tokenAddress={token_address}")
        else:
            print(f"tx={tx_hash}")
    else:
        log("Arena response missing tx hash.")


def main() -> int:
    load_dotenv()
    try:
        app_auth = app_auth_from_env()
    except Exception as exc:
        log(str(exc))
        return 1

    user_auth = user_auth_from_env()
    try:
        user_id = resolve_user_id(app_auth, user_auth)
    except Exception as exc:
        log(str(exc))
        return 1

    state_file = os.getenv("STATE_FILE", "state.json")
    poll_seconds = int(os.getenv("POLL_SECONDS", "60"))
    max_results = int(os.getenv("MAX_RESULTS", "20"))
    run_once = os.getenv("RUN_ONCE", "0") == "1"

    state = load_state(state_file)
    since_id = state.get("since_id")
    arena_jwt = os.getenv("ARENA_JWT_STAGING") if is_staging_mode() else os.getenv("ARENA_JWT")
    private_key = os.getenv("PRIVATE_KEY")
    signer_address = os.getenv("ADDRESS")
    handle = os.getenv("HANDLE")
    salt = os.getenv("SALT")
    custom_mint_image = os.getenv("CUSTOM_MINT_IMAGE")

    bank_contract_address = os.getenv("BANK_CONTRACT_ADDRESS")
    bank_private_key = os.getenv("ADMIN_PRIVATE_KEY")
    bank_signer_address = os.getenv("ADMIN_ADDRESS")
    bank_fee_bps_raw = os.getenv("BANK_FEE_BPS", "0")
    try:
        bank_fee_bps = int(bank_fee_bps_raw or 0)
    except ValueError:
        bank_fee_bps = 0
    bank_treasury = os.getenv("TREASURY_ADDRESS") or os.getenv("BANK_TREASURY_ADDRESS")
    bank_set_treasury = os.getenv("BANK_SET_TREASURY", "0") == "1"
    bank_salt_seed = os.getenv("BANK_SALT_SEED", "")
    bank_rpc_url = (
        os.getenv("BANK_RPC_URL")
        or os.getenv("AVALANCHE_RPC")
        or "https://api.avax.network/ext/bc/C/rpc"
    )

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    supabase_table = os.getenv("SUPABASE_TABLE", "fee_vaults")

    max_workers = int(os.getenv("MENTION_WORKERS", "4"))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        while True:
            try:
                response = fetch_mentions(
                    app_auth,
                    user_id,
                    since_id=since_id,
                    max_results=max_results,
                )
            except RateLimitError as exc:
                wait_for = seconds_until(exc.reset_epoch)
                log(f"Rate limited. Sleeping {wait_for}s.")
                time.sleep(wait_for)
                continue
            except Exception as exc:
                log(f"Failed to fetch mentions: {exc}")
                time.sleep(poll_seconds)
                continue

            data = response.get("data") or []
            includes = response.get("includes") or {}
            users_by_id = _map_by_id(includes.get("users"))
            tweets_by_id = _map_by_id(includes.get("tweets"))
            media_by_key = map_media_by_key(includes)

            if data:
                data = list(reversed(data))
                max_seen = since_id
                for tweet in data:
                    tweet_id = tweet.get("id")
                    if tweet_id and (not max_seen or int(tweet_id) > int(max_seen)):
                        max_seen = tweet_id

                    if tweet.get("author_id") == user_id:
                        continue

                    print("-" * 60)
                    _print_tweet("Mention", tweet, users_by_id)
                    author = users_by_id.get(tweet.get("author_id"))
                    mention_link = None
                    if tweet_id:
                        mention_link = _tweet_url(tweet_id, author)
                        print(f"Link: {mention_link}")

                    replied_to_id = get_replied_to_id(tweet)
                    parent = None
                    parent_author = None
                    parent_media_by_key = media_by_key
                    if replied_to_id:
                        parent = tweets_by_id.get(replied_to_id)
                        if not parent:
                            try:
                                parent_resp = fetch_tweet(app_auth, replied_to_id)
                                parent = parent_resp.get("data")
                                parent_users = _map_by_id(
                                    parent_resp.get("includes", {}).get("users")
                                )
                                users_by_id.update(parent_users)
                                parent_media_by_key = map_media_by_key(
                                    parent_resp.get("includes", {})
                                )
                            except Exception as exc:
                                log(f"Failed to fetch parent tweet {replied_to_id}: {exc}")
                        if parent:
                            parent_author = users_by_id.get(parent.get("author_id"))
                            _print_tweet("In reply to", parent, users_by_id)
                            parent_id = parent.get("id")
                            if parent_id:
                                print(
                                    f"Link: {_tweet_url(parent_id, parent_author)}"
                                )

                    mention_text = tweet.get("text", "")
                    parent_text = parent.get("text", "") if parent else ""
                    if not has_token_intent([mention_text, parent_text]):
                        continue

                    executor.submit(
                        _process_token_request,
                        tweet=tweet,
                        author=author,
                        parent=parent,
                        parent_author=parent_author,
                        media_by_key=media_by_key,
                        parent_media_by_key=parent_media_by_key,
                        app_auth=app_auth,
                        custom_mint_image=custom_mint_image,
                        arena_jwt=arena_jwt,
                        private_key=private_key,
                        signer_address=signer_address,
                        handle=handle,
                        salt=salt,
                        bank_contract_address=bank_contract_address,
                        bank_private_key=bank_private_key,
                        bank_signer_address=bank_signer_address,
                        bank_fee_bps=bank_fee_bps,
                        bank_treasury=bank_treasury,
                        bank_set_treasury=bank_set_treasury,
                        bank_salt_seed=bank_salt_seed,
                        bank_rpc_url=bank_rpc_url,
                        supabase_url=supabase_url,
                        supabase_key=supabase_key,
                        supabase_table=supabase_table,
                    )

            else:
                print("No new mentions.")

            if data:
                newest = max(int(t["id"]) for t in data if t.get("id"))
                if not since_id or newest > int(since_id):
                    since_id = str(newest)
                    state["since_id"] = since_id
                    save_state(state_file, state)

            if run_once:
                break
            time.sleep(poll_seconds)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
