"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import FormBuilder from "../../../components/formBuilder";
import Navbar from "../../../components/navbar";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";

function formatWeiToToken(weiStr, decimals = 18) {
  try {
    const wei = BigInt(weiStr);
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

function resolveTokenName(addr) {
  const a = (addr || "").toLowerCase();
  if (a === "0x0000000000000000000000000000000000000000") return "AVAX";
  if (a === "0xb8d7710f7d8349a506b75dd184f05777c82dad0c") return "ARENA";
  if (a === "0x34a1d2105dd1b658a48ead516a9ce3032082799c") return "GLADIUS";
  return "TOKEN";
}

export default function GatePage() {
  const [result, setResult] = useState(null); // { apiId, summary }
  const hasResult = !!result?.apiId;

  const tokenName = useMemo(() => resolveTokenName(result?.summary?.token_address), [result]);
  const prettyAmount = useMemo(() => formatWeiToToken(result?.summary?.amount_wei || "0"), [result]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-10 pb-20">
        {!hasResult && (
          <FormBuilder
            onSuccess={({ apiId, summary }) => {
              setResult({ apiId, summary });
            }}
          />
        )}

        {hasResult && (
          <Card className="max-w-4xl mx-auto border-border/70 bg-card/70 shadow-[0_35px_80px_rgba(0,0,0,0.35)] backdrop-blur">
            <CardHeader>
              <Badge className="w-fit">Saved</Badge>
              <CardTitle>API created successfully</CardTitle>
              <CardDescription>Share these endpoints with agents and users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-col gap-2">
                <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">Links</div>
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
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">Token</div>
                  <div className="text-foreground font-medium">{tokenName}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">Amount</div>
                  <div className="text-foreground font-medium">{prettyAmount}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground">Session</div>
                  <div className="text-foreground font-medium">{result.summary.valid_for_sec}s</div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-muted-foreground">Original URL</div>
                  <a
                    href={result.summary.api_url}
                    className="text-primary hover:underline break-all"
                    target="_blank"
                  >
                    {result.summary.api_url}
                  </a>
                </div>
              </div>

              <div className="pt-2 flex flex-col md:flex-row md:items-center gap-3">
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
                <Link href="/gate" className="md:ml-auto text-sm text-primary hover:underline">
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
