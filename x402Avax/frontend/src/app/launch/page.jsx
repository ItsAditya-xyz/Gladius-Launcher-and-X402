"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "../../../components/navbar";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Info } from "lucide-react";

const ARENA_IMAGE_HOST = "https://static.starsarena.com/uploads/";

const tokenAddresses = {
  avax: "0x0000000000000000000000000000000000000000",
  arena: "0xB8d7710f7d8349A506b75dD184F05777c82dAd0C",
  gladius: "0x34a1D2105dd1b658A48EAD516A9CE3032082799C",
};

const isHexAddress = (value = "") => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

function toWeiString(amount) {
  if (!/^\d+(\.\d+)?$/.test(String(amount || ""))) {
    throw new Error("Payment amount must be a number");
  }
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  return (
    BigInt(whole || "0") * 10n ** 18n + BigInt(fracPadded || "0")
  ).toString();
}

function formatWeiToToken(weiStr, decimals = 18) {
  try {
    const wei = BigInt(weiStr || "0");
    const base = 10n ** BigInt(decimals);
    const whole = wei / base;
    const frac = wei % base;
    let fracStr = frac.toString().padStart(decimals, "0");
    fracStr = fracStr.slice(0, 6).replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return "?";
  }
}

function resolveTokenName(addr = "") {
  const lower = addr.toLowerCase();
  if (lower === tokenAddresses.avax.toLowerCase()) return "AVAX";
  if (lower === tokenAddresses.arena.toLowerCase()) return "ARENA";
  if (lower === tokenAddresses.gladius.toLowerCase()) return "GLADIUS";
  return "TOKEN";
}

export default function LaunchPage() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [pictureSlug, setPictureSlug] = useState("");
  const [uploadInfo, setUploadInfo] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [merchant, setMerchant] = useState("");
  const [tokenKey, setTokenKey] = useState("avax");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const hasResult = !!result?.apiId;

  const summaryTokenName = useMemo(
    () => resolveTokenName(result?.summary?.token_address || ""),
    [result]
  );

  const prettyAmount = useMemo(
    () => formatWeiToToken(result?.summary?.amount_wei || "0"),
    [result]
  );

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadInfo(null);

    try {
      const data = new FormData();
      data.append("file", file, file.name);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Upload failed");
      }

      setPictureSlug((json.slug || "").trim());
      setUploadInfo(json);
    } catch (e) {
      setUploadError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateLaunchApi = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!name.trim()) throw new Error("Token name is required");
      if (!symbol.trim()) throw new Error("Token symbol is required");
      if (!pictureSlug) throw new Error("Upload an image to generate a slug");
      if (!isHexAddress(merchant)) throw new Error("Merchant wallet must be 0x + 40 hex");
      if (!amount || Number(amount) <= 0) throw new Error("Payment amount must be greater than 0");

      const tokenAddress = tokenAddresses[tokenKey];
      if (!tokenAddress) throw new Error("Unknown token selection");

      const amountWei = toWeiString(amount);
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_ORIGIN;
      if (!origin) throw new Error("Unable to resolve site origin");

      const params = new URLSearchParams({
        name: name.trim(),
        symbol: symbol.trim(),
        picture: pictureSlug,
      });
      const apiUrl = `${origin}/api/create-token?${params.toString()}`;

      const payload = {
        p_name: name.trim(),
        p_api_url: apiUrl,
        p_merchant_wallet: merchant.trim().toLowerCase(),
        p_token_address: tokenAddress.toLowerCase(),
        p_amount_wei: amountWei,
        p_valid_for_sec: 3600000, // 1000 hours
        p_chain_id: 43114,
        p_fee_bps_snapshot: 100,
        p_onlyonce: true,
      };

      const res = await fetch("/api/402/apis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to create launch API");
      }

      const apiId = data.apiId;
      setResult({
        apiId,
        summary: {
          api_url: apiUrl,
          merchant_wallet: payload.p_merchant_wallet,
          token_address: payload.p_token_address,
          amount_wei: amountWei,
          valid_for_sec: payload.p_valid_for_sec,
        },
        tokenMeta: {
          name: name.trim(),
          symbol: symbol.trim(),
          slug: pictureSlug,
          imageUrl: uploadInfo?.url || `${ARENA_IMAGE_HOST}${pictureSlug}`,
        },
      });
    } catch (e) {
      setError(e?.message || "Failed to create launch API");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !!name &&
    !!symbol &&
    !!pictureSlug &&
    !!merchant &&
    !!amount &&
    !uploading &&
    !loading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {!hasResult && (
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle>Launch tokens with x402</CardTitle>
              <CardDescription>
                Configure token metadata and payment settings. Once paid, we will call your minting API exactly once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Token metadata
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-foreground">Token Name</Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Arena Ninjas"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-foreground">Symbol</Label>
                    <Input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="NINJA"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-xs text-foreground">Upload icon</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="mt-1 w-full rounded-md border border-dashed border-input bg-transparent px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Uploading stores the icon on StarsArena and auto-generates the slug.
                  </p>
                  {uploading && (
                    <p className="mt-2 text-sm text-muted-foreground">Uploading image…</p>
                  )}
                  {uploadError && (
                    <p className="mt-2 text-sm text-destructive">{uploadError}</p>
                  )}
                  {uploadInfo?.url && (
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={uploadInfo.url}
                        alt="Token preview"
                        className="w-16 h-16 rounded-lg border border-border object-cover"
                      />
                      <div className="text-xs text-muted-foreground break-all">
                        Slug: <span className="font-mono text-foreground">{pictureSlug}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Payment parameters
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-foreground">Merchant wallet</Label>
                      <Popover className="relative">
                        <PopoverButton
                          aria-label="What is the merchant wallet?"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </PopoverButton>
                        <PopoverPanel className="absolute left-0 top-full z-20 mt-2 w-64 rounded-md border border-border bg-background p-2 text-xs text-foreground shadow-md">
                          The merchant wallet is the EVM address (0x...) that will receive the payment for this launch.
                        </PopoverPanel>
                      </Popover>
                    </div>
                    <Input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-foreground">Token to collect</Label>
                    <select
                      value={tokenKey}
                      onChange={(e) => setTokenKey(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="avax">AVAX (native)</option>
                      <option value="arena">ARENA (ERC-20)</option>
                      <option value="gladius">GLADIUS (ERC-20)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-xs text-foreground">Payment amount</Label>
                  <Input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.5"
                  />
                
                </div>
              </section>
            </CardContent>

            {error && (
              <div className="mx-6 mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <CardFooter className="border-t border-border/70 bg-muted/30">
              <div className="flex w-full items-center justify-between">
                <Link href="/gate" className="text-sm text-muted-foreground hover:underline">
                  Need a standard API gate?
                </Link>
                <Button onClick={handleCreateLaunchApi} disabled={!canSubmit}>
                  {loading ? "Saving..." : "Create launch API"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        {hasResult && (
          <Card className="max-w-3xl mx-auto border-border/70 bg-card">
            <CardHeader>
              <CardTitle>Launch API ready</CardTitle>
              <CardDescription>
                Share these endpoints with users and agents. Once paid, we will call your minting API exactly once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-muted-foreground">x402 URI (Agents)</div>
                  <a
                    href={`/api/${result.apiId}`}
                    className="text-primary hover:underline break-all"
                    target="_blank"
                  >
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/${result.apiId}`
                      : `/api/${result.apiId}`}
                  </a>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-muted-foreground">x402 URL (Users)</div>
                  <a
                    href={`/${result.apiId}`}
                    className="text-primary hover:underline break-all"
                    target="_blank"
                  >
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/${result.apiId}`
                      : `/${result.apiId}`}
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">Token</div>
                  <div className="text-foreground font-medium">{summaryTokenName}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">Amount</div>
                  <div className="text-foreground font-medium">{prettyAmount}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">Session duration</div>
                  <div className="text-foreground font-medium">
                    {result.summary.valid_for_sec}s
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-4">
                {result.tokenMeta?.imageUrl && (
                  <img
                    src={result.tokenMeta.imageUrl}
                    alt="Token icon"
                    className="w-16 h-16 rounded-xl border border-border object-cover"
                  />
                )}
                <div>
                  <div className="text-foreground font-medium">
                    {result.tokenMeta?.name} • {result.tokenMeta?.symbol}
                  </div>
                  <div className="text-xs text-muted-foreground break-all">
                    Slug: <span className="font-mono">{result.tokenMeta?.slug}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href={`/${result.apiId}`}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Open user view
                </Link>
                <Link
                  href={`/api/${result.apiId}`}
                  className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Open agent URI
                </Link>
                <Link href="/launch" className="ml-auto text-sm text-primary hover:underline">
                  Create another
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
