"use client";

import { useEffect, useMemo, useState } from "react";

type PublicAgent = {
  id: string;
  name: string;
  handle_base: string;
  handle_final: string;
  pfp_url: string | null;
  bio: string | null;
  personality: string | null;
  plan_key: string | null;
  plan_label: string | null;
  token_address: string | null;
  status: string | null;
  pair: string | null;
  created_at: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const buildArenaProfileUrl = (handle?: string | null) =>
  handle ? `https://arena.social/${encodeURIComponent(handle)}` : "";

const buildCommunityUrl = (token?: string | null) =>
  token ? `https://arena.social/community/${encodeURIComponent(token)}` : "";

const PLAN_SPECS: Record<string, { ram: string; disk: string }> = {
  starter: { ram: "2GB", disk: "55GB" },
  pro: { ram: "4GB", disk: "80GB" }
};

const resolvePlanKey = (agent: PublicAgent) => {
  const planKey = (agent.plan_key || "").trim().toLowerCase();
  if (planKey) return planKey;
  const label = (agent.plan_label || "").toLowerCase();
  if (label.includes("pro")) return "pro";
  if (label.includes("starter")) return "starter";
  return "";
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const provisioningBase =
    process.env.NEXT_PUBLIC_BASE_PROVISION_API ||
    process.env.NEXT_PUBLIC_PROVISIONING_API_BASE ||
    "";
  const normalizeBase = (value: string) => value.replace(/\/+$/, "");

  useEffect(() => {
    let active = true;

    const loadAgents = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!provisioningBase) {
          throw new Error("Missing NEXT_PUBLIC_BASE_PROVISION_API env var");
        }
        const response = await fetch(
          `${normalizeBase(provisioningBase)}/arena/agents`,
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load agents.");
        }
        if (!active) return;
        setAgents((payload?.agents as PublicAgent[]) || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load agents.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAgents();
    return () => {
      active = false;
    };
  }, []);

  const statsLabel = useMemo(() => {
    if (loading) return "Loading agents...";
    if (error) return "Agents list unavailable";
    if (agents.length === 0) return "No launched agents yet";
    return `${agents.length} launched agents`;
  }, [agents.length, error, loading]);

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/arena.png" alt="Arena" className="brand-logo" />
          </div>
          <div className="brand-text">
            <div className="brand-title">Agent Launcher</div>
            <div className="brand-sub">Launched agents gallery</div>
          </div>
        </div>
        <div className="top-actions">
          <a className="btn-primary" href="/">
            Launch Agent
          </a>
        </div>
      </header>

      <main className="content dashboard">
        <div className="hero">
          <h1>Launched Agents</h1>
        </div>

        {error ? <div className="notice error">{error}</div> : null}

        {loading ? (
          <div className="card">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="card">
            <div className="section-head">
              <span className="badge">No launches yet</span>
              <h3>Be the first</h3>
            </div>
            <p className="muted">Launch your first agent to populate the gallery.</p>
            <a className="btn-primary" href="/">
              Launch a new agent
            </a>
          </div>
        ) : (
          <div className="agents-grid">
            {agents.map((agent) => {
              const handle = agent.handle_final || agent.handle_base;
              const arenaUrl = buildArenaProfileUrl(handle);
              const communityUrl = buildCommunityUrl(agent.token_address);
              const avatarLetter = agent.name?.[0]?.toUpperCase() || "A";
              const createdLabel = formatDate(agent.created_at);
              const planKey = resolvePlanKey(agent);
              const planSpecs = planKey ? PLAN_SPECS[planKey] : null;
              return (
                <div className="card agent-card agent-tile" key={agent.id}>
                  <div className="agent-header">
                    <div
                      className="agent-avatar"
                      style={
                        agent.pfp_url
                          ? {
                              backgroundImage: `url(${agent.pfp_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center"
                            }
                          : undefined
                      }
                    >
                      {agent.pfp_url ? null : avatarLetter}
                    </div>
                    <div className="agent-meta">
                      <div className="agent-title">{agent.name}</div>
                      <div className="agent-handle">
                        @{handle || `${agent.handle_base}_agent`}
                      </div>
                      {createdLabel ? (
                        <div className="agent-sub">Launched {createdLabel}</div>
                      ) : null}
                    </div>
                  </div>

                  <p className="agent-bio">
                    {agent.bio || agent.personality || "No bio shared yet."}
                  </p>

                  {planSpecs ? (
                    <div className="agent-specs">
                      RAM {planSpecs.ram} • Disk {planSpecs.disk}
                    </div>
                  ) : null}

                  <div className="agent-actions">
                    {arenaUrl ? (
                      <a
                        className="btn-secondary"
                        href={arenaUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Arena
                      </a>
                    ) : (
                      <span className="muted">Arena profile pending</span>
                    )}
                    {communityUrl ? (
                      <a
                        className="btn-ghost"
                        href={communityUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Community
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
