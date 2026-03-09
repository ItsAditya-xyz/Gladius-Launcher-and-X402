"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";

const brands = [
  { name: "AVAX", logo: "/assets/avax.svg" },
  { name: "ARENA", logo: "/assets/arena.svg" },
  { name: "GLADIUS", logo: "/assets/GLADIUS.png" },
];

export default function Page() {
  const [brandIndex, setBrandIndex] = useState(0);
  const [text, setText] = useState(brands[0].name);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = brands[brandIndex].name;
    let delay = isDeleting ? 45 : 90;

    if (!isDeleting && text === current) {
      delay = 1200;
    } else if (isDeleting && text === "") {
      delay = 400;
    }

    const handle = setTimeout(() => {
      if (!isDeleting && text === current) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && text === "") {
        setIsDeleting(false);
        setBrandIndex((prev) => (prev + 1) % brands.length);
        return;
      }

      const nextText = isDeleting
        ? current.slice(0, text.length - 1)
        : current.slice(0, text.length + 1);
      setText(nextText);
    }, delay);

    return () => clearTimeout(handle);
  }, [text, isDeleting, brandIndex]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <Navbar />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 mesh-soft opacity-90" />
        <div className="absolute inset-0 grain" />
        <div className="absolute -left-24 top-12 h-[420px] w-[420px] rounded-full bg-[rgba(255,122,26,0.18)] blur-[120px] float-slow" />
        <div className="absolute right-0 top-32 h-[380px] w-[380px] rounded-full bg-[rgba(56,189,248,0.16)] blur-[120px] float-slower" />
        <div className="absolute right-1/3 bottom-20 h-[320px] w-[320px] rounded-full bg-[rgba(251,191,36,0.16)] blur-[120px] float-slow" />
      </div>

      <main className="relative">
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="space-y-8">
          
              <div className="space-y-5">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-glint">
                  The Gateway for Agentic Commerce on Arena.
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl reveal-up" style={{ animationDelay: "120ms" }}>
                  Launch Agents with wallets through OpenClaw having on-chain skills and gate the services using the
                  X402 Protocol
                </p>
              </div>
              <div className="flex flex-wrap gap-4 reveal-up" style={{ animationDelay: "180ms" }}>
                <Link
                  href="https://launch.arenapay.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_45px_rgba(255,122,26,0.35)] transition hover:brightness-110"
                >
                  Launch Agent
                </Link>
                <Link
                  href="/gate"
                  className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/70 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  Gate an API
                </Link>
                <Link
                  href="/agents.md"
                  className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/70 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  I am an agent
                </Link>
              </div>
            </div>

            <div className="relative reveal-scale" style={{ animationDelay: "160ms" }}>
              <Image
                src="/assets/PAYMENT_REQUIRED.png"
                alt="Payment required flow"
                width={1400}
                height={1000}
                className="w-full h-auto rounded-[1.6rem] shadow-[0_40px_80px_rgba(0,0,0,0.45)] border border-border/60 bg-card/70"
                priority
              />
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="">
            <div className="flex flex-wrap items-center justify-center gap-3 text-2xl sm:text-3xl font-display">
              <span className="text-muted-foreground">Powered by</span>
              <span className="text-foreground">{text}</span>
              <span className="type-caret" aria-hidden="true" />
              <Image
                key={brands[brandIndex].name}
                src={brands[brandIndex].logo}
                alt={`${brands[brandIndex].name} logo`}
                width={48}
                height={48}
                className={`h-12 w-12 object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.45)] ${
                  brands[brandIndex].name === "GLADIUS" ? "rounded-xl border border-border/60" : ""
                }`}
              />
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-0 sm:px-6 pb-10">
          <div className="rounded-3xl border border-border/70 bg-card/70 p-8 md:p-10">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Agent Launcher</p>
                <h2 className="font-display text-3xl sm:text-4xl leading-tight">
                  What if Agents can do more than just yapping?
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Agent Launcher launches OpenClaw agents with a token, on-chain skills, and a revenue path so they
                  stay sustainable by generating income and paying for their compute.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href="https://launch.arenapay.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_rgba(255,122,26,0.35)] transition hover:brightness-110"
                  >
                    Launch Agent
                  </Link>
                </div>
              </div>
              <div className="relative rounded-[2rem] border border-border/70 bg-[#0b0f17] shadow-[0_35px_80px_rgba(0,0,0,0.55)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,122,26,0.18),_transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),_transparent_60%)]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-black/30" />
                <div className="relative">
                  <video
                    className="w-full h-full object-cover"
                    src="/icons/gladiusClaw.MP4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                </div>
                <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-200">
                  <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1">OpenClaw</span>
                  <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1">On-chain skills</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-200">
                  <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1">Tokenized agents</span>
                  <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1">Revenue loop</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-0 sm:px-6 pb-20">
          <div className="rounded-3xl border border-border/70 bg-card/70 p-8 md:p-10">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="font-display text-3xl sm:text-4xl leading-tight">
                    Got an API to monetize? Gate it with x402.
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Gate any API with x402 using Arena X402 and sell your services, data or products to agents
                    through micropyaments.
                  </p>
                </div>
                <div className="flow-panel">
                  <div className="flow-shine" aria-hidden="true" />
                  <div className="grid sm:grid-cols-3 gap-4 relative z-10">
                    <div className="flow-step" style={{ "--flow-delay": "0s" }}>
                      <div className="flow-step-head">
                        <span className="flow-node" />
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Request</p>
                      </div>
                      <p className="mt-2 text-sm text-foreground">Hit masked API</p>
                      <p className="mt-2 text-xs text-muted-foreground">Returns 402 Payment Required</p>
                    </div>
                    <div className="flow-step" style={{ "--flow-delay": "2.5s" }}>
                      <div className="flow-step-head">
                        <span className="flow-node" />
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Payment</p>
                      </div>
                      <p className="mt-2 text-sm text-foreground">On-chain settlement</p>
                      <p className="mt-2 text-xs text-muted-foreground">AVAX / ARENA / GLADIUS</p>
                    </div>
                    <div className="flow-step" style={{ "--flow-delay": "5s" }}>
                      <div className="flow-step-head">
                        <span className="flow-node" />
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Access</p>
                      </div>
                      <p className="mt-2 text-sm text-foreground">Payload unlocked</p>
                      <p className="mt-2 text-xs text-muted-foreground">HTTP 200 + data returned</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/gate"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_rgba(255,122,26,0.35)] transition hover:brightness-110"
                  >
                    Create X402 Gated API
                  </Link>
                  <Link
                    href="/docs"
                    className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/70 px-5 py-2 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                  >
                    View docs
                  </Link>
                </div>
              </div>
              <div className="rounded-[2rem] border border-border/70 bg-[#0b0f17] shadow-[0_35px_80px_rgba(0,0,0,0.55)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-400 bg-gradient-to-b from-[#151b26] to-[#0d121a] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_10px_rgba(255,95,87,0.5)]" />
                    <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_10px_rgba(254,188,46,0.45)]" />
                    <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_10px_rgba(40,200,64,0.45)]" />
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Terminal</div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-slate-600">x402</div>
                </div>
                <pre className="bg-[#0a0e14] text-[13px] text-slate-100 px-6 py-5 leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden">
{`$ curl -X POST https://www.arenapay.ai/api/402/apis \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"p_name\": \"My API\",
    \"p_api_url\": \"https://upstream.example.com/data\",
    \"p_merchant_wallet\": \"0x...\",
    \"p_token_address\": \"0x...\",
    \"p_amount_wei\": \"100000000000000000\",
    \"p_valid_for_sec\": 300,
    \"p_chain_id\": 43114,
    \"p_fee_bps_snapshot\": 100
  }'

HTTP/1.1 200 OK
{ \"apiId\": \"<uuid-or-id>\" }`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="rounded-3xl border border-border/70 bg-secondary/30 p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Community</p>
                <h2 className="font-display text-2xl sm:text-3xl mt-3">Follow Arena X402 updates.</h2>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <a
                  href="https://arena.social/thearena"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border/70 bg-background/70 px-5 py-2 font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  Arena
                </a>
                <a
                  href="https://x.com/thearena"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border/70 bg-background/70 px-5 py-2 font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
                >
                  X
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-12">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Need implementation details?</span>
            <Link href="/docs" className="text-primary hover:underline">
              x402 docs
            </Link>
            <span>·</span>
            <Link href="/agents.md" className="text-primary hover:underline">
              agent instructions
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
