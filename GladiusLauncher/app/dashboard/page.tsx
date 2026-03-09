"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

type ArenaAgent = {
  id: string;
  name: string;
  handle_base: string;
  handle_final: string;
  pfp_url: string | null;
  bio: string | null;
  personality: string | null;
  pair: string | null;
  plan_label: string | null;
  status: string;
  provision_status: string | null;
  verification_code: string | null;
  token_address: string | null;
  token_tx_hash: string | null;
  vault_address: string | null;
  claw_id: string | null;
  error_message: string | null;
  created_at: string;
};

type ClawInfo = {
  id: string;
  subdomain: string | null;
  status: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Initializing",
  wallet_ready: "Generating Agent's wallet",
  registered: "Signing up on Arena..",
  vault_ready: "Creating Vault",
  awaiting_initial_buy: "Awaiting initial buy",
  minting: "Minting token",
  token_ready: "Token minted",
  provisioning: "Turning server on and off",
  sync_pending: "Syncing agent files (gonna take 2-3 minutes)",
  agent_initialized: "Agent initialized",
  ready: "Agent initialized",
  failed: "Failed"
};

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [agents, setAgents] = useState<ArenaAgent[]>([]);
  const [clawMap, setClawMap] = useState<Record<string, ClawInfo>>({});
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let mounted = true;

    async function loadSession() {
      const { data } = await client.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const loadAgents = async () => {
    if (!supabase || !session) return;
    setLoadingAgents(true);
    setAgentsError(null);
    try {
      const { data, error } = await supabase
        .from("arena_agents")
        .select("*")
        .eq("hidden", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAgents((data as ArenaAgent[]) || []);

      const { data: claws } = await supabase
        .from("claws")
        .select("id,subdomain,status")
        .eq("user_id", session.user.id);
      const nextMap: Record<string, ClawInfo> = {};
      (claws as ClawInfo[] | null)?.forEach((claw) => {
        if (claw?.id) {
          nextMap[claw.id] = claw;
        }
      });
      setClawMap(nextMap);
    } catch (error) {
      setAgentsError(error instanceof Error ? error.message : "Failed to load agents.");
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    loadAgents();
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: "local" });
    setProfileOpen(false);
    setSession(null);
  };

  const handleCopy = async (text: string, id: string) => {
    if (!navigator?.clipboard || !text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const userLabel =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    "User";

  const userInitials = useMemo(() => {
    const parts = userLabel.split(/[\s@._-]+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("");
    return initials || "U";
  }, [userLabel]);

  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    "";

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
            <div className="brand-sub">Provisioning dashboard</div>
          </div>
        </div>
        <div className="top-actions">
          {!session ? (
            <button
              className="btn-secondary btn-google"
              onClick={handleGoogleLogin}
              disabled={!isSupabaseConfigured}
            >
              <span className="google-icon" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/googleLogo.png" alt="" />
              </span>
              Sign in with Google
            </button>
          ) : (
            <div className="profile" ref={profileRef}>
              <button
                className="avatar-button"
                onClick={() => setProfileOpen((prev) => !prev)}
                type="button"
              >
                {avatarUrl ? (
                  <span
                    className="avatar-image"
                    style={{ backgroundImage: `url(${avatarUrl})` }}
                    aria-label="User profile"
                  />
                ) : (
                  <span className="avatar-fallback" aria-label="User profile">
                    {userInitials}
                  </span>
                )}
              </button>
              {profileOpen ? (
                <div className="profile-menu">
                  <div className="profile-meta">
                    <div className="profile-name">
                      {session.user?.user_metadata?.full_name || "Signed in"}
                    </div>
                    <div className="profile-email">
                      {session.user?.email || "Google account"}
                    </div>
                  </div>
                  <button className="btn-ghost" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <main className="content dashboard">
        <div className="hero">
          <h1>Your Arena Agents</h1>
          <p>Track provisioning status, vaults, and verification posts.</p>
        </div>

        {!session && !loading ? (
          <div className="notice warn">
            Sign in to view your Arena provisioning dashboard.
          </div>
        ) : null}

        {agentsError ? <div className="notice error">{agentsError}</div> : null}

        {session ? (
          <div className="dashboard-grid">
            {loadingAgents ? (
              <div className="card">Loading agents...</div>
            ) : agents.length === 0 ? (
              <div className="card">
                <div className="section-head">
                  <span className="badge">No agents yet</span>
                  <h3>Start provisioning</h3>
                </div>
                <p className="muted">
                  Create your first Arena agent to see status updates here.
                </p>
                <a className="btn-primary" href="/">
                  Launch a new agent
                </a>
              </div>
            ) : (
              agents.map((agent) => {
                const normalizedStatus =
                  agent.status === "ready" ? "agent_initialized" : agent.status;
                const statusLabel =
                  STATUS_LABELS[normalizedStatus] || normalizedStatus;
                const provisionLabel = agent.provision_status || "Pending";
                const verificationText =
                  agent.verification_code && agent.name
                    ? `I'm claiming my AI Agent "${agent.name}"\nVerification Code: ${agent.verification_code}`
                    : "";
                const claw = agent.claw_id ? clawMap[agent.claw_id] : null;
                const avatarLetter = agent.name?.[0]?.toUpperCase() || "A";
                return (
                  <div className="card agent-card" key={agent.id}>
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
                          @{agent.handle_final || `${agent.handle_base}_agent`}
                        </div>
                      </div>
                      <span className={`status-pill ${agent.status}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="agent-grid">
                      <div className="agent-item">
                        <div className="agent-label">Plan</div>
                        <div className="agent-value">
                          {agent.plan_label || "Arena plan"}
                        </div>
                      </div>
                      <div className="agent-item">
                        <div className="agent-label">Pair</div>
                        <div className="agent-value">
                          {(agent.pair || "avax").toUpperCase()}
                        </div>
                      </div>
                      <div className="agent-item">
                        <div className="agent-label">Vault</div>
                        <div className="agent-value">
                          {agent.vault_address || "Pending"}
                        </div>
                      </div>
                      <div className="agent-item">
                        <div className="agent-label">Token</div>
                        <div className="agent-value">
                          {agent.token_address || "Pending"}
                        </div>
                      </div>
                      <div className="agent-item">
                        <div className="agent-label">Claw</div>
                        <div className="agent-value">
                          {claw?.subdomain || "Provisioning"}
                        </div>
                      </div>
                      <div className="agent-item">
                        <div className="agent-label">Provision</div>
                        <div className="agent-value">{provisionLabel}</div>
                      </div>
                    </div>

                    {agent.provision_status === "failed" || agent.error_message ? (
                      <div className="notice error">
                        <div>Failed at: {statusLabel}</div>
                        <div className="muted">
                          {(agent.error_message
                            ? agent.error_message.replace(/^RETRYABLE:\s*/i, "")
                            : "") || "Provisioning failed."}
                        </div>
                      </div>
                    ) : null}

                    {verificationText ? (
                      <div className="verification-block">
                        <div className="verification-head">
                          <div>
                            <div className="verification-title">
                              Verification Post
                            </div>
                            <div className="verification-sub">
                              Post this from your Arena user account to claim
                              the agent.
                            </div>
                          </div>
                          <button
                            className="btn-secondary"
                            onClick={() => handleCopy(verificationText, agent.id)}
                          >
                            {copiedId === agent.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="verification-text">{verificationText}</pre>
                      </div>
                    ) : null}

                    {agent.error_message ? (
                      <div className="notice error">
                        {agent.error_message.replace(/^RETRYABLE:\s*/i, "")}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
