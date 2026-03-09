"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// --- small helpers ---
const isHexAddress = (s) => /^0x[a-fA-F0-9]{40}$/.test(s);

function toWeiString(amount, unit = "token", decimals = 18) {
  if (unit === "wei") {
    if (!/^\d+$/.test(String(amount)))
      throw new Error("amount (wei) must be integer");
    return String(amount);
  }
  if (!/^\d+(\.\d+)?$/.test(String(amount)))
    throw new Error("amount (token) must be number");
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (
    BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0")
  ).toString();
}

async function createApi({
  name,
  api_url,
  merchant_wallet,
  token_address,
  amount_wei,
  valid_for_sec,
  chain_id,
}) {
  const res = await fetch("/api/402/apis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_name: name || "Untitled API",
      p_api_url: api_url,
      p_merchant_wallet: merchant_wallet.toLowerCase(),
      p_token_address: token_address.toLowerCase(),
      p_amount_wei: amount_wei,
      p_valid_for_sec: valid_for_sec ?? 5,
      p_chain_id: chain_id ?? 43114,
      p_fee_bps_snapshot: 100,
    }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => "Failed to create"));
  const data = await res.json();
  return data.apiId;
}

/**
 * Props:
 * - onSuccess?: (payload) => void   // called with { apiId, summary }
 * - defaultChainId?: number         // default 43114
 * - defaultValidSec?: number        // default 5
 */
export default function FormBuilder({
  onSuccess,
  defaultChainId = 43114,
  defaultValidSec = 5 * 60,
}) {
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [merchant, setMerchant] = useState("");

  // token selection (dropdown)
  const tokenAddresses = {
    avax: "0x0000000000000000000000000000000000000000",
    arena: "0xB8d7710f7d8349A506b75dD184F05777c82dAd0C",
    gladius: "0x34a1D2105dd1b658A48EAD516A9CE3032082799C",
  };
  const [tokenKey, setTokenKey] = useState("avax");
  const tokenAddress = tokenAddresses[tokenKey];

  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("token"); // 'token' | 'wei'
  const [validSec, setValidSec] = useState(defaultValidSec);
  const [chainId, setChainId] = useState(defaultChainId);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const handleSubmit = async () => {
    try {
      setErr("");
      setOkMsg("");
      if (!apiUrl || !/^https?:\/\//i.test(apiUrl))
        throw new Error("Valid API URL required (http/https)");
      if (!isHexAddress(merchant))
        throw new Error("Merchant must be 0x + 40 hex");
      if (!isHexAddress(tokenAddress))
        throw new Error("Selected token address is invalid");
      if (!amount) throw new Error("Amount required");

      const amount_wei = toWeiString(amount, unit);
      setLoading(true);

      const apiId = await createApi({
        name: name || "Untitled API",
        api_url: apiUrl,
        merchant_wallet: merchant,
        token_address: tokenAddress,
        amount_wei,
        valid_for_sec: Number(validSec) || 5,
        chain_id: Number(chainId) || 43114,
      });

      const summary = {
        name: name || "Untitled API",
        api_url: apiUrl,
        merchant_wallet: merchant.toLowerCase(),
        token_address: tokenAddress.toLowerCase(),
        amount_wei,
        valid_for_sec: Number(validSec) || 5,
        chain_id: Number(chainId) || 43114,
      };

      setOkMsg(`Saved. id: ${apiId}`);
      if (onSuccess) onSuccess({ apiId, summary, tokenKey });
    } catch (e) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-border/70 bg-card/70 shadow-[0_35px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Create x402 API</CardTitle>
          <CardDescription>
            Configure the payment settings and the upstream endpoint.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-foreground">
                API description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                className="h-12 rounded-xl border-border/60 bg-background/40 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                placeholder="Enter API description"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                Merchant Wallet Address <span className="text-destructive">*</span>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-[11px] font-semibold text-muted-foreground"
                  title="This is the wallet that receives funds when agents access your content via x402."
                >
                  i
                </span>
              </Label>
              <Input
                className="h-12 rounded-xl border-border/60 bg-background/40 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                placeholder="0x..."
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              API URL <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-12 rounded-xl border-border/60 bg-background/40 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
              placeholder="https://api.example.com/endpoint"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-foreground">
                Token <span className="text-destructive">*</span>
              </Label>
              <select
                className="flex h-12 w-full rounded-xl border border-border/60 bg-background/40 px-4 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                value={tokenKey}
                onChange={(e) => setTokenKey(e.target.value)}
              >
                <option value="avax">AVAX (native)</option>
                <option value="arena">ARENA (ERC-20)</option>
                <option value="gladius">GLADIUS (ERC-20)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">
                Payment Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                className="h-12 rounded-xl border-border/60 bg-background/40 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-foreground">Session Duration (seconds)</Label>
              <Input
                className="h-12 rounded-xl border-border/60 bg-background/40 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                placeholder="300"
                value={validSec}
                onChange={(e) => setValidSec(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Default: 5 minutes</p>
            </div>
         
          </div>
        </CardContent>

        {(err || okMsg) && (
          <div className="px-6 pb-4">
            {err && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{err}</p>
              </div>
            )}
            {okMsg && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
                <p className="text-sm text-primary">{okMsg}</p>
              </div>
            )}
          </div>
        )}

        <CardFooter className="border-t border-border/60 bg-background/40">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Required fields
            </p>
            <Button disabled={loading} onClick={handleSubmit} className="mt-2">
              {loading ? "Saving..." : "Save API"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
