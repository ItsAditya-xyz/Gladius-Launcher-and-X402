"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

type FormState = {
  agentName: string;
  profileImage: string;
  description: string;
  tokenName: string;
  tokenSymbol: string;
  pair: "avax" | "arena";
  planKey: string;
  launchInstructions: string;
};

type BalanceRow = {
  available_cents?: number | null;
  reserved_cents?: number | null;
};

const steps = [
  {
    id: 1,
    title: "Agent Details",
    subtitle: "Name + profile"
  },
  {
    id: 2,
    title: "Personality",
    subtitle: "Token + style"
  },
  {
    id: 3,
    title: "Choose Plan",
    subtitle: "Plan + payment"
  }
];

const PLAN_OPTIONS = [
  {
    key: "starter",
    name: "Starter",
    price: "$39 / month",
    priceCents: 3900,
    credits: "$10 AI credits per month",
    storage: "55GB storage",
    specs: "2GB RAM • 2 vCPU",
    note: "Agent Token",
    extras: [
      "Gateway Domain",
      "Dedicated customer support",
      "Supports ChatGPT Plus subscription",
      "Purchase credits as you go"
    ]
  },
  {
    key: "pro",
    name: "Pro",
    price: "$69 / month",
    priceCents: 6900,
    credits: "$20 AI credits per month",
    storage: "80GB storage",
    specs: "4GB RAM • 2 vCPU",
    note: "Agent Token",
    extras: [
      "Gateway Domain",
      "Dedicated customer support",
      "Supports ChatGPT Plus subscription",
      "Purchase credits as you go"
    ]
  }
];

const MAX_BIO_LENGTH = 1000;

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionedAgentId, setProvisionedAgentId] = useState<string | null>(null);
  const [capacityChecking, setCapacityChecking] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [paymentAddress, setPaymentAddress] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceRow | null>(null);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);
  const autoBalanceRefreshingRef = useRef(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "unavailable" | "invalid" | "signin" | "error"
  >("idle");
  const [handleError, setHandleError] = useState<string | null>(null);
  const handleCheckId = useRef(0);
  const lastCheckedUserIdRef = useRef<string | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>({
    agentName: "",
    profileImage: "",
    description: "",
    tokenName: "",
    tokenSymbol: "",
    pair: "avax",
    planKey: "",
    launchInstructions: ""
  });

  const handleMyAgents = async () => {
    if (!supabase || !session?.user) {
      setAuthError("Please sign in to view your agents.");
      return;
    }
    try {
      setAuthError(null);
      const { data, error } = await supabase
        .from("arena_agents")
        .select("id,created_at")
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const agentId = data?.[0]?.id;
      if (!agentId) {
        setAuthError("No agents found for this account.");
        return;
      }
      setProfileOpen(false);
      router.push(`/${agentId}`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to load agents.");
    }
  };

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
    if (!supabase) return;
    const client = supabase;

    const userId = session?.user?.id ?? null;
    if (!userId) {
      lastCheckedUserIdRef.current = null;
      return;
    }

    if (lastCheckedUserIdRef.current === userId) return;
    lastCheckedUserIdRef.current = userId;

    let cancelled = false;

    async function routeToExistingAgent() {
      try {
        const { data, error } = await client
          .from("arena_agents")
          .select("id,created_at")
          .eq("hidden", false)
          .order("created_at", { ascending: false })
          .limit(1);
        if (cancelled || error) return;
        const agentId = data?.[0]?.id;
        if (agentId) {
          router.replace(`/${agentId}`);
        }
      } catch (_error) {
        // No-op: keep user on the launcher if lookup fails.
      }
    }

    void routeToExistingAgent();

    return () => {
      cancelled = true;
    };
  }, [router, session?.user?.id]);

  useEffect(() => {
    if (!session && currentStep > 1) {
      setCurrentStep(1);
      setMaxStep(1);
    }
    if (session && maxStep < 2) {
      setMaxStep(2);
    }
  }, [session, currentStep, maxStep]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
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

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setProfileOpen(false);
    setSession(null);
  };

  const updateField =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const normalizeBase = (value: string) => value.replace(/\/+$/, "");
  const normalizeHandleBase = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      const message = "Image must be 10MB or smaller.";
      setUploadError(message);
      toast.error(message);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadComplete(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
        headers["X-Authorization"] = `Bearer ${session.access_token}`;
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_PROVISION_API;
      if (!baseUrl) {
        throw new Error("Missing NEXT_PUBLIC_BASE_PROVISION_API env var");
      }

      const response = await fetch(`${normalizeBase(baseUrl)}/upload-image`, {
        method: "POST",
        headers,
        body: formData
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Upload failed");
      }

      setForm((prev) => ({ ...prev, profileImage: payload.url || "" }));
      setUploadComplete(true);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      setUploadComplete(false);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const fetchPaymentData = async (
    { refresh = false, balanceOnly = false, silent = false } = {}
  ) => {
    if (!session?.access_token) return;
    if (!silent) {
      if (refresh) {
        setBalanceRefreshing(true);
      } else {
        setPaymentLoading(true);
      }
    } else {
      autoBalanceRefreshingRef.current = true;
    }
    setPaymentError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_PROVISION_API;
      if (!baseUrl) {
        throw new Error("Missing NEXT_PUBLIC_BASE_PROVISION_API env var");
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        "X-Authorization": `Bearer ${session.access_token}`
      };

      if (!balanceOnly) {
        const addressResp = await fetch(
          `${normalizeBase(baseUrl)}/payments/address`,
          { method: "POST", headers }
        );
        const addressPayload = await addressResp.json().catch(() => ({}));
        if (!addressResp.ok) {
          throw new Error(addressPayload?.error || "Failed to load deposit address.");
        }
        setPaymentAddress(addressPayload?.address || "");
      }

      const balanceResp = await fetch(
        `${normalizeBase(baseUrl)}/payments/balance`,
        { headers }
      );
      const balancePayload = await balanceResp.json().catch(() => ({}));
      if (!balanceResp.ok) {
        throw new Error(balancePayload?.error || "Failed to load balance.");
      }
      setBalance(balancePayload?.balance ?? null);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Failed to load payment data.");
    } finally {
      if (!silent) {
        setPaymentLoading(false);
        setBalanceRefreshing(false);
      } else {
        autoBalanceRefreshingRef.current = false;
      }
    }
  };

  const copyPaymentAddress = async () => {
    if (!paymentAddress) return;
    try {
      await navigator.clipboard.writeText(paymentAddress);
      setAddressCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setAddressCopied(false);
      }, 2000);
    } catch (_error) {
      setAddressCopied(false);
    }
  };

  const handleProvision = async () => {
    if (provisioning) return;
    setProvisionError(null);
    try {
      if (!session?.access_token) {
        throw new Error("Sign in to continue.");
      }
      const baseUrl = process.env.NEXT_PUBLIC_BASE_PROVISION_API;
      if (!baseUrl) {
        throw new Error("Missing NEXT_PUBLIC_BASE_PROVISION_API env var");
      }

      if (!form.profileImage.trim()) {
        throw new Error("Upload a profile image to continue.");
      }
      const description = form.description.trim();
      if (!description) {
        throw new Error("Description is required.");
      }
      if (description.length > MAX_BIO_LENGTH) {
        throw new Error(`Description must be ${MAX_BIO_LENGTH} characters or fewer.`);
      }
      if (form.tokenName.trim().length > 8) {
        throw new Error("Token name must be 8 characters or fewer.");
      }
      if (form.tokenSymbol.trim().length > 8) {
        throw new Error("Token symbol must be 8 characters or fewer.");
      }
      if (!form.planKey) {
        throw new Error("Select a plan to continue.");
      }

      const selectedPlan = PLAN_OPTIONS.find((plan) => plan.key === form.planKey);
      const requiredCents = selectedPlan?.priceCents ?? 0;
      const availableCents = balance?.available_cents ?? 0;
      if (!balance) {
        throw new Error("Balance not loaded yet. Refresh balance to continue.");
      }
      if (requiredCents > 0 && availableCents < requiredCents) {
        throw new Error(
          "Insufficient balance. Add funds and refresh balance before provisioning."
        );
      }

      setProvisioning(true);

      const payload = {
        name: form.agentName.trim(),
        bio: description,
        pfp_url: form.profileImage.trim() || undefined,
        personality: form.launchInstructions.trim() || undefined,
        token_name: form.tokenName.trim(),
        token_symbol: form.tokenSymbol.trim().toUpperCase(),
        plan_key: form.planKey,
        pair: form.pair
      };

      const response = await fetch(`${normalizeBase(baseUrl)}/arena-provision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Provisioning request failed.");
      }
      const nextId = String(data?.arena_agent_id || "");
      setProvisionedAgentId(nextId);
      if (nextId) {
        router.push(`/${nextId}`);
      }
    } catch (error) {
      setProvisionError(error instanceof Error ? error.message : "Provisioning failed.");
    } finally {
      setProvisioning(false);
    }
  };

  const checkCloudCapacity = async () => {
    if (!session?.access_token) {
      setCapacityError("Sign in to continue.");
      return false;
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PROVISION_API;
    if (!baseUrl) {
      setCapacityError("Missing NEXT_PUBLIC_BASE_PROVISION_API env var");
      return false;
    }

    setCapacityChecking(true);
    setCapacityError(null);

    try {
      const response = await fetch(`${normalizeBase(baseUrl)}/arena/capacity-check`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-Authorization": `Bearer ${session.access_token}`
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Capacity check failed.");
      }
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Capacity check failed.";
      setCapacityError(message);
      return false;
    } finally {
      setCapacityChecking(false);
    }
  };

  const agentHandleBase = useMemo(
    () => normalizeHandleBase(form.agentName),
    [form.agentName]
  );

  useEffect(() => {
    const baseHandle = agentHandleBase;
    handleCheckId.current += 1;
    const requestId = handleCheckId.current;

    if (!baseHandle) {
      setHandleStatus("idle");
      setHandleError(null);
      return;
    }

    if (baseHandle.length < 3) {
      setHandleStatus("invalid");
      setHandleError("Handle must be at least 3 characters.");
      return;
    }

    if (!session?.access_token) {
      setHandleStatus("signin");
      setHandleError("Sign in to check handle availability.");
      return;
    }

    const timer = setTimeout(async () => {
      setHandleStatus("checking");
      setHandleError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_PROVISION_API;
        if (!baseUrl) {
          throw new Error("Missing NEXT_PUBLIC_BASE_PROVISION_API env var");
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${session.access_token}`,
          "X-Authorization": `Bearer ${session.access_token}`
        };

        const response = await fetch(
          `${normalizeBase(baseUrl)}/arena/handle-check?handle=${encodeURIComponent(
            baseHandle
          )}`,
          { headers }
        );
        const payload = await response.json().catch(() => ({}));
        if (requestId !== handleCheckId.current) return;
        if (!response.ok) {
          throw new Error(payload?.error || "Handle check failed");
        }

        setHandleStatus(payload?.available ? "available" : "unavailable");
      } catch (error) {
        if (requestId !== handleCheckId.current) return;
        setHandleStatus("error");
        setHandleError(error instanceof Error ? error.message : "Handle check failed");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [agentHandleBase, session?.access_token]);

  useEffect(() => {
    if (currentStep !== 3) return;
    if (!session?.access_token) return;
    fetchPaymentData();
    const interval = setInterval(() => {
      if (paymentLoading || balanceRefreshing || autoBalanceRefreshingRef.current) return;
      fetchPaymentData({ refresh: true, balanceOnly: true, silent: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [currentStep, session?.access_token]);

  const validations = useMemo(
    () => ({
      1:
        form.agentName.trim().length > 0 &&
        form.description.trim().length > 0 &&
        form.description.trim().length <= MAX_BIO_LENGTH &&
        form.profileImage.trim().length > 0 &&
        handleStatus === "available",
      2:
        form.launchInstructions.trim().length > 0 &&
        form.tokenName.trim().length > 0 &&
        form.tokenName.trim().length <= 8 &&
        form.tokenSymbol.trim().length > 0 &&
        form.tokenSymbol.trim().length <= 8,
      3: form.planKey.trim().length > 0
    }),
    [
      form.agentName,
      form.description,
      form.profileImage,
      form.launchInstructions,
      form.tokenName,
      form.tokenSymbol,
      form.planKey,
      handleStatus
    ]
  );

  const canProceed =
    currentStep === 1
      ? validations[1] && Boolean(session)
      : currentStep === 2
        ? validations[2] && !capacityChecking
        : validations[3];

  const goNext = async () => {
    if (!canProceed) return;
    if (currentStep === 2) {
      const hasCapacity = await checkCloudCapacity();
      if (!hasCapacity) return;
    }
    const nextStep = Math.min(currentStep + 1, steps.length);
    setCurrentStep(nextStep);
    setMaxStep((prev) => Math.max(prev, nextStep));
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (stepId: number) => {
    if (stepId <= maxStep) {
      setCurrentStep(stepId);
    }
  };

  const nextLabel =
    currentStep === 1
      ? "Continue to Personality"
      : currentStep === 2
        ? capacityChecking
          ? "Checking capacity..."
          : "Choose Plan"
        : "Create my agent";

  const agentName = form.agentName.trim() || "Nova Sentinel";
  const agentInitials = useMemo(() => {
    const parts = agentName.split(" ").filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("");
    return initials || "GL";
  }, [agentName]);

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

  const progressPercent = Math.round((currentStep / steps.length) * 100);

  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    "";

  const handleStatusText = (() => {
    if (handleStatus === "idle") return "Enter a name to generate the handle.";
    if (handleStatus === "signin") return "Sign in to verify handle availability.";
    if (handleStatus === "invalid") return handleError || "Handle is invalid.";
    if (handleStatus === "checking") return "Checking availability...";
    if (handleStatus === "available") return "Handle is available.";
    if (handleStatus === "unavailable") return "Handle is already taken.";
    return handleError || "Unable to verify handle.";
  })();

  const selectedPlan = useMemo(
    () => PLAN_OPTIONS.find((plan) => plan.key === form.planKey) || null,
    [form.planKey]
  );
  const availableCents = balance?.available_cents ?? 0;
  const availableDollars =
    balance && Number.isFinite(availableCents)
      ? `$${(availableCents / 100).toFixed(2)}`
      : null;
  const hasSufficientBalance =
    selectedPlan && balance
      ? availableCents >= (selectedPlan.priceCents || 0)
      : false;
  const tokenNameTooLong = form.tokenName.trim().length > 8;
  const tokenSymbolTooLong = form.tokenSymbol.trim().length > 8;
  const descriptionLength = form.description.trim().length;
  const descriptionTooLong = descriptionLength > MAX_BIO_LENGTH;

  const wizardHint =
    currentStep === 1
      ? !session
        ? "Sign in to verify handle availability and unlock the next step."
        : descriptionTooLong
          ? `Description must be ${MAX_BIO_LENGTH} characters or fewer.`
        : handleStatus === "checking"
          ? "Checking handle availability..."
          : handleStatus === "available"
            ? form.profileImage.trim().length === 0
              ? "Upload a profile image to continue."
              : "Handle is available. Continue to set personality."
            : handleStatus === "unavailable"
              ? "That handle is already taken. Update the agent name."
              : handleStatus === "invalid"
                ? "Handle is invalid. Try a different agent name."
                : handleStatus === "error"
                  ? "Unable to verify handle. Try again."
                  : "Enter a unique agent name to continue."
      : currentStep === 2
        ? capacityError
          ? capacityError
          : capacityChecking
            ? "Checking cloud capacity..."
            : tokenNameTooLong || tokenSymbolTooLong
              ? "Token name and symbol must be 8 characters or fewer."
              : "Set a personality and token pair. You can change this later."
        : !form.planKey
          ? "Choose a plan to continue."
          : !balance
            ? "Refresh balance to continue."
            : !hasSufficientBalance
              ? "Insufficient balance. Add funds and refresh balance."
              : "Choose a plan and confirm your balance before provisioning.";

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
            <div className="brand-sub">Agents that do things</div>
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
                  <button className="btn-ghost" onClick={handleMyAgents}>
                    My Agents
                  </button>
                  <button className="btn-ghost" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <main className="content">
     

        <div className="hero">
          <h1>Deploy Your Agent</h1>
          <p>
            Launch Agent that doesn't just Yaps but 'Does Things'
          </p>
        </div>
        {authError ? <div className="notice error">{authError}</div> : null}

        <div className="stepper-wrap">
          <div className="stepper">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              const isLocked = step.id > maxStep;
              return (
                <button
                  key={step.id}
                  className={`stepper-item ${
                    isActive ? "active" : isDone ? "done" : ""
                  }`}
                  onClick={() => goToStep(step.id)}
                  disabled={isLocked}
                  type="button"
                >
                  <div className="stepper-index">{step.id}</div>
                  <div>
                    <div className="stepper-title">{step.title}</div>
                    <div className="stepper-sub">{step.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="stepper-bar">
            <div
              className="stepper-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="layout">
          <section className="card stack">
            {currentStep === 1 ? (
              <div className="section">
                <div className="section-head">
                  <span className="badge">Step 1</span>
                  <h3>Agent Details</h3>
                </div>
             
                <div className="form-grid">
                  <label>
                    Agent Name
                    <input
                      type="text"
                      placeholder="Nova Sentinel"
                      value={form.agentName}
                      onChange={updateField("agentName")}
                    />
                    <div
                      className={`handle-status ${handleStatus}`}
                      aria-live="polite"
                    >
                      {handleStatusText}
                    </div>
                  </label>
                  <label className="profile-column">
                    Profile Image
                    <div className="profile-upload inline">
                      <div className="profile-avatar-wrap">
                        <div
                          className="profile-avatar"
                          style={
                            form.profileImage
                              ? {
                                  backgroundImage: `url(${form.profileImage})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center"
                                }
                              : undefined
                          }
                        >
                          {form.profileImage ? null : agentInitials}
                        </div>
                        <button
                          type="button"
                          className="profile-avatar-upload"
                          onClick={triggerFilePicker}
                          disabled={!session || uploading}
                          aria-label="Upload profile image"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 5v10" />
                            <path d="M7 10l5-5 5 5" />
                            <path d="M5 19h14" />
                          </svg>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="file-input"
                          onChange={handleImageUpload}
                          disabled={!session || uploading}
                        />
                      </div>
                      {(!session || uploading || uploadComplete) ? (
                        <div className="upload-meta">
                          {!session
                            ? "Sign in to upload an image."
                            : uploading
                              ? "Uploading..."
                              : uploadComplete
                                ? "Upload complete."
                                : ""}
                        </div>
                      ) : null}
                    </div>
                    {uploadError ? (
                      <div className="notice error">{uploadError}</div>
                    ) : null}
                  </label>
                  <label className="full">
                    Description
                    <textarea
                      rows={4}
                      placeholder="A focused trading agent tuned for high-liquidity markets."
                      value={form.description}
                      onChange={updateField("description")}
                    />
                    <div className={descriptionTooLong ? "notice error" : "muted"}>
                      {descriptionLength}/{MAX_BIO_LENGTH} characters
                    </div>
                  </label>
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="section">
                <div className="section-head">
                  <span className="badge">Step 2</span>
                  <h3>Personality</h3>
                </div>
                <p className="muted">
                  Define token details, personality, and the default pair. Personality can
                  change later.
                </p>
                <div className="form-grid">
                  <label className="full">
                    Token Name
                    <input
                      type="text"
                      placeholder="SENTINEL"
                      value={form.tokenName}
                      onChange={updateField("tokenName")}
                      maxLength={8}
                    />
                  </label>
                  <label className="full">
                    Token Symbol
                    <input
                      type="text"
                      placeholder="SENT"
                      value={form.tokenSymbol}
                      onChange={updateField("tokenSymbol")}
                      maxLength={8}
                    />
                  </label>
                  <label className="full">
                    Personality
                    <textarea
                      rows={4}
                      placeholder="Direct, fast, and focused on high-signal trades."
                      value={form.launchInstructions}
                      onChange={updateField("launchInstructions")}
                    />
                  </label>
                  <label className="full">
                    Token Pair
                    <select
                      value={form.pair}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          pair: event.target.value === "arena" ? "arena" : "avax"
                        }))
                      }
                    >
                      <option value="avax">AVAX (default)</option>
                      <option value="arena">ARENA</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="section">
                <div className="section-head">
                  <span className="badge">Step 3</span>
                  <h3>Choose Plan</h3>
                </div>
                <div className="section-subhead">Choose a plan</div>
                <div className="plan-grid">
                  {PLAN_OPTIONS.map((plan) => {
                    const isSelected = form.planKey === plan.key;
                    return (
                      <button
                        key={plan.key}
                        type="button"
                        className={`plan-card ${isSelected ? "selected" : ""}`}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            planKey: plan.key
                          }))
                        }
                        aria-pressed={isSelected}
                      >
                        <div className="plan-top">
                          <div>
                            <div className="plan-name">{plan.name}</div>
                            <div className="plan-price">{plan.price}</div>
                          </div>
                          {isSelected ? (
                            <div className="plan-chip">Selected</div>
                          ) : null}
                        </div>
                        <div className="plan-detail">{plan.credits}</div>
                        <div className="plan-detail">{plan.storage}</div>
                        <div className="plan-detail">{plan.specs}</div>
                        <div className="plan-note">{plan.note}</div>
                        {plan.extras?.map((item: string) => (
                          <div className="plan-detail" key={item}>
                            {item}
                          </div>
                        ))}
                      </button>
                    );
                  })}
                </div>
                {selectedPlan && !hasSufficientBalance ? (
                  <>
                    <div className="section-subhead">Deposit address</div>
                    {session ? (
                      <div className="payment-block">
                        <div className="payment-header">
                          <div>
                            <div className="payment-title">Send funds to this address</div>
                            <div className="payment-sub">
                              USDC/USDT on Avalanche.
                            </div>
                          </div>
                          <div className="payment-actions">
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => fetchPaymentData({ refresh: true })}
                              disabled={paymentLoading || balanceRefreshing}
                            >
                              {balanceRefreshing ? "Refreshing..." : "Refresh balance"}
                            </button>
                          </div>
                        </div>
                        <div className="payment-address">
                          <div className="payment-address-value">
                            {paymentAddress ||
                              (paymentLoading
                                ? "Fetching deposit address..."
                                : "No deposit address yet.")}
                          </div>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={copyPaymentAddress}
                            disabled={!paymentAddress}
                          >
                            {addressCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="payment-meta">
                          <div className="payment-balance">
                            <span className="payment-label">Balance</span>
                            <span className="payment-value">
                              {balance
                                ? availableDollars || "Unavailable"
                                : paymentLoading
                                  ? "Loading..."
                                  : "Unavailable"}
                            </span>
                          </div>
                        </div>
                        {paymentError ? (
                          <div className="notice error">{paymentError}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="notice">
                        Sign in to view your deposit address.
                      </div>
                    )}
                  </>
                ) : null}
                {provisionedAgentId ? (
                  <div className="notice">
                    Provisioning started.{" "}
                    <a className="link-inline" href={`/${provisionedAgentId}`}>
                      View agent status
                    </a>
                    .
                  </div>
                ) : null}
                {provisionError ? (
                  <div className="notice error">{provisionError}</div>
                ) : null}
              </div>
            ) : null}

            <div className="wizard-footer">
              <div className="wizard-hint">{wizardHint}</div>
              <div className="wizard-actions">
                <button
                  className="btn-ghost"
                  onClick={goBack}
                  disabled={currentStep === 1}
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={currentStep === 3 ? handleProvision : goNext}
                  disabled={
                    currentStep === 3
                      ? provisioning ||
                        Boolean(provisionedAgentId) ||
                        !validations[3] ||
                        !hasSufficientBalance
                      : !canProceed
                  }
                >
                  {currentStep === 3
                    ? provisioning
                      ? "Provisioning..."
                      : provisionedAgentId
                        ? "Provisioning started"
                        : nextLabel
                    : nextLabel}
                </button>
              </div>
            </div>
          </section>

          
        </div>
      </main>
    </div>
  );
}
