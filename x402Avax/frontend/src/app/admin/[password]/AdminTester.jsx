"use client";

import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

export default function AdminTester() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [picture, setPicture] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadInfo, setUploadInfo] = useState(null);
  const [file, setFile] = useState(null);
  const [lookupTx, setLookupTx] = useState("");
  const [lookupTokenId, setLookupTokenId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  const canSubmit = !!name.trim() && !!symbol.trim() && !!picture.trim() && !loading;

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError("");
      setUploadInfo(null);

      const data = new FormData();
      data.append("file", file, file.name);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Upload failed");
      }

      setUploadInfo(json);
      if (json?.slug) setPicture(json.slug);
    } catch (err) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setError("");
      setResult(null);
      setLoading(true);

      const params = new URLSearchParams({
        name: name.trim(),
        symbol: symbol.trim(),
        picture: picture.trim(),
      });

      const res = await fetch(`/api/create-token?${params.toString()}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Minting failed");
      }

      setResult(json);
    } catch (err) {
      setError(err?.message || "Minting failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    try {
      setLookupLoading(true);
      setLookupError("");
      setLookupResult(null);

      const params = new URLSearchParams();
      if (lookupTx.trim()) params.set("tx", lookupTx.trim());
      if (lookupTokenId.trim()) params.set("token_id", lookupTokenId.trim());

      const res = await fetch(`/api/admin/token-lookup?${params.toString()}`, {
        headers: {
          "x-admin-password":
            typeof window !== "undefined"
              ? window.location.pathname.split("/").pop()
              : "",
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Lookup failed");
      }
      setLookupResult(json);
    } catch (err) {
      setLookupError(err?.message || "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>Admin: Create Token</CardTitle>
        <CardDescription>Test the minting flow via /api/create-token.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-foreground">Token name</Label>
            <Input
              placeholder="Arena Ninjas"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Symbol</Label>
            <Input
              placeholder="NINJA"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Picture slug</Label>
          <Input
            placeholder="your-uploaded-image.png"
            value={picture}
            onChange={(e) => setPicture(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use the image slug generated from the upload flow (StarsArena upload).
          </p>
        </div>


        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <Input
              type="file"
              className="file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "Uploading..." : "Upload image"}
            </Button>
          </div>
          {uploadError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {uploadError}
            </div>
          )}
          {uploadInfo?.url && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <img
                  src={uploadInfo.url}
                  alt="Uploaded preview"
                  className="h-12 w-12 rounded-md border border-border object-cover"
                />
                <div className="flex flex-col gap-1">
                  <div className="text-muted-foreground text-xs">Uploaded URL</div>
                  <div className="text-foreground break-all">{uploadInfo.url}</div>
                  <div className="text-muted-foreground text-xs">
                    Slug: <span className="text-foreground font-mono">{uploadInfo.slug}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-muted-foreground">Community ID:</span>{" "}
                <span className="text-foreground font-medium">{result.communityId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tx Hash:</span>{" "}
                <span className="text-foreground font-mono break-all">{result.hash}</span>
              </div>
              {result.tokenAddress && (
                <div>
                  <span className="text-muted-foreground">Token CA:</span>{" "}
                  <span className="text-foreground font-mono break-all">{result.tokenAddress}</span>
                </div>
              )}
              {result.tokenId && (
                <div>
                  <span className="text-muted-foreground">Token ID:</span>{" "}
                  <span className="text-foreground font-mono break-all">{result.tokenId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div className="text-sm font-semibold text-foreground">Debug: Token lookup</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Tx hash (optional)"
              value={lookupTx}
              onChange={(e) => setLookupTx(e.target.value)}
            />
            <Input
              placeholder="Token ID (optional)"
              value={lookupTokenId}
              onChange={(e) => setLookupTokenId(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleLookup}
              disabled={lookupLoading || (!lookupTx.trim() && !lookupTokenId.trim())}
            >
              {lookupLoading ? "Looking up..." : "Lookup"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Uses the launcher contract to resolve token address.
            </span>
          </div>
          {lookupError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {lookupError}
            </div>
          )}
          {lookupResult && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
              <div className="flex flex-col gap-1">
                <div>
                  <span className="text-muted-foreground">Token ID:</span>{" "}
                  <span className="text-foreground font-mono">{lookupResult.tokenId ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Token CA:</span>{" "}
                  <span className="text-foreground font-mono break-all">{lookupResult.tokenAddress ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Latest tokenId:</span>{" "}
                  <span className="text-foreground font-mono">{lookupResult.latestTokenId ?? "—"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t border-border/70 bg-muted/30">
        <div className="flex w-full items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Make sure ADMIN_PASSWORD is set in the environment.
          </p>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {loading ? "Minting..." : "Create token"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
