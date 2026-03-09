'use client';

import { Check, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { AgentSidebar } from './component/AgentSidebar';
import { AgentTopbar } from './component/AgentTopbar';
import { AgentMobileTabs } from './component/AgentMobileTabs';
import { TabAgents } from './component/TabAgents';
import { TabAgent } from './component/TabAgent';
import { TabBalance } from './component/TabBalance';
import { TabActions } from './component/TabActions';
import { TabLogs } from './component/TabLogs';
import { ConnectChatGPTModal } from './component/modals/ConnectChatGPTModal';
import { PairDevicesModal } from './component/modals/PairDevicesModal';
import { RestartGatewayModal } from './component/modals/RestartGatewayModal';
import { ExportPrivateKeyModal } from './component/modals/ExportPrivateKeyModal';
import type {
  ActionItem,
  ArenaAgent,
  BalanceRow,
  Claw,
  DevicePairingEntry,
  DiscordPairedUser,
  DiscordPairingRequest,
  GmailStatus,
  LogRow,
  ModelOption,
  PairedUser,
  PairingRequest,
  PlanOption,
  Transaction
} from './component/types';

const IMPERSONATION_STORAGE_KEY = 'clawkai-impersonation';
const LOGS_PAGE_SIZE = 50;

const STATUS_STEPS = [
  { key: 'requested', label: 'Initializing' },
  { key: 'wallet_ready', label: "Generating Agent's wallet" },
  { key: 'registered', label: 'Signing up on arena..' },
  { key: 'vault_ready', label: 'Creating Vault' },
  { key: 'awaiting_initial_buy', label: 'Awaiting initial buy' },
  { key: 'minting', label: 'Minting token' },
  { key: 'token_ready', label: 'Token minted' },
  { key: 'provisioning', label: 'Turning server on and off' },
  { key: 'sync_pending', label: 'Syncing agent files (gonna take 2-3 minutes)' }
];

const STATUS_LABELS = {
  requested: 'Initializing',
  wallet_ready: "Generating Agent's wallet",
  registered: 'Signing up on Arena..',
  vault_ready: 'Creating Vault',
  awaiting_initial_buy: 'Awaiting initial buy',
  minting: 'Minting token',
  token_ready: 'Token minted',
  provisioning: 'Turning server on and off',
  sync_pending: 'Syncing agent files (gonna take 2-3 minutes)',
  agent_initialized: 'Agent initialized',
  ready: 'Agent initialized',
  failed: 'Failed'
};

const MIN_TOKENS_TO_SPEND_AVAX = '0.31';
const MIN_TOKENS_TO_SPEND_ARENA = '951';

type Impersonation = {
  user_id: string;
  email?: string | null;
};

type InitialBuyEstimate = {
  percent_total: string;
  percent_sale?: string | null;
  amount_wei?: string | null;
  exact_cost_wei?: string | null;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
};

const formatDeviceId = (value?: string | null) => {
  if (!value) return '';
  const id = String(value);
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-3)}`;
};

export default function DashboardPage() {
  const params = useParams();
  const agentId = Array.isArray(params?.agentId)
    ? params.agentId[0]
    : params?.agentId;
  const router = useRouter();
  const provisioningBase =
    process.env.NEXT_PUBLIC_PROVISIONING_API_BASE ||
    process.env.NEXT_PUBLIC_BASE_PROVISION_API ||
    '';
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramTokenSet, setTelegramTokenSet] = useState(true);
  const [telegramTokenError, setTelegramTokenError] = useState('');
  const [discordBotToken, setDiscordBotToken] = useState('');
  const [discordTokenSet, setDiscordTokenSet] = useState(true);
  const [discordTokenError, setDiscordTokenError] = useState('');
  const [claws, setClaws] = useState<Claw[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [restartTarget, setRestartTarget] = useState<Claw | null>(null);
  const [pairingTarget, setPairingTarget] = useState<Claw | null>(null);
  const [pairingRequests, setPairingRequests] = useState<PairingRequest[]>([]);
  const [pairedUsers, setPairedUsers] = useState<PairedUser[]>([]);
  const [pairingView, setPairingView] = useState<'telegram' | 'gateway' | 'discord' | null>(
    null
  );
  const [discordPairingRequests, setDiscordPairingRequests] = useState<
    DiscordPairingRequest[]
  >([]);
  const [discordPairedUsers, setDiscordPairedUsers] = useState<DiscordPairedUser[]>(
    []
  );
  const [discordPairingLoading, setDiscordPairingLoading] = useState(false);
  const [discordPairingError, setDiscordPairingError] = useState('');
  const [discordDmPolicy, setDiscordDmPolicy] = useState('pairing');
  const [discordGroupPolicy, setDiscordGroupPolicy] = useState('allowlist');
  const [discordGuildsJson, setDiscordGuildsJson] = useState('{}');
  const [discordConfigError, setDiscordConfigError] = useState('');
  const [discordConfigSaving, setDiscordConfigSaving] = useState(false);
  const [chatgptModalOpen, setChatgptModalOpen] = useState(false);
  const [chatgptTarget, setChatgptTarget] = useState<Claw | null>(null);
  const [chatgptAuthUrl, setChatgptAuthUrl] = useState('');
  const [chatgptRedirectUrl, setChatgptRedirectUrl] = useState('');
  const [chatgptAuthLoading, setChatgptAuthLoading] = useState(false);
  const [chatgptEnableLoading, setChatgptEnableLoading] = useState(false);
  const [chatgptDisableLoading, setChatgptDisableLoading] = useState(false);
  const [chatgptError, setChatgptError] = useState('');
  const [devicePairingRequests, setDevicePairingRequests] = useState<DevicePairingEntry[]>([]);
  const [pairedDevices, setPairedDevices] = useState<DevicePairingEntry[]>([]);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState('');
  const [devicePairingLoading, setDevicePairingLoading] = useState(false);
  const [devicePairingError, setDevicePairingError] = useState('');
  const [elevatedUpdating, setElevatedUpdating] = useState<Record<string, boolean>>({});
  const [paymentAddress, setPaymentAddress] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState('');
  const [gmailMode, setGmailMode] = useState('read_send');
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);
  const [balance, setBalance] = useState<BalanceRow | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const syncedTokensRef = useRef<Set<string>>(new Set());
  const statusRef = useRef<string | null>(null);
  const actionsDisabled = loading || !user;
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [modelSaving, setModelSaving] = useState<Record<string, boolean>>({});
  const [imageModelDrafts, setImageModelDrafts] = useState<Record<string, string>>({});
  const [imageModelSaving, setImageModelSaving] = useState<Record<string, boolean>>({});
  const [gatewayRestarting, setGatewayRestarting] = useState<Record<string, boolean>>({});
  const [repairing, setRepairing] = useState<Record<string, boolean>>({});
  const [mobileTab, setMobileTab] = useState('agent');
  const [creditDrafts, setCreditDrafts] = useState<Record<string, string>>({});
  const [creditLoading, setCreditLoading] = useState<Record<string, boolean>>({});
  const [actionsList, setActionsList] = useState<ActionItem[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState('');
  const [logRows, setLogRows] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logsPage, setLogsPage] = useState(1);
  const [logsHasMore, setLogsHasMore] = useState(false);
  const [logsLoadingMore, setLogsLoadingMore] = useState(false);
  const [logsTotal, setLogsTotal] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedClawId, setSelectedClawId] = useState<string | null>(null);
  const [desktopTab, setDesktopTab] = useState('agent');
  const [impersonation, setImpersonation] = useState<Impersonation | null>(null);
  const [impersonationReady, setImpersonationReady] = useState(false);
  const [tokenChecking, setTokenChecking] = useState(false);
  const [theme, setTheme] = useState('light');
  const [agent, setAgent] = useState<ArenaAgent | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [agentPrivateKeyCopying, setAgentPrivateKeyCopying] = useState(false);
  const [exportPrivateKeyOpen, setExportPrivateKeyOpen] = useState(false);
  const [initialBuyStep, setInitialBuyStep] = useState<'choice' | 'with' | 'without'>(
    'choice'
  );
  const [initialBuyAmount, setInitialBuyAmount] = useState('');
  const [initialBuyEstimate, setInitialBuyEstimate] = useState<InitialBuyEstimate | null>(
    null
  );
  const [initialBuyEstimateError, setInitialBuyEstimateError] = useState('');
  const [initialBuyEstimateLoading, setInitialBuyEstimateLoading] = useState(false);
  const [initialBuyBalance, setInitialBuyBalance] = useState<string | null>(null);
  const [initialBuyBalanceLoading, setInitialBuyBalanceLoading] = useState(false);
  const [initialBuyBalanceError, setInitialBuyBalanceError] = useState('');
  const [initialBuyConfirmLoading, setInitialBuyConfirmLoading] = useState(false);
  const [modelOptionsByProvider, setModelOptionsByProvider] = useState<
    Record<'openai' | 'openrouter' | 'openai-codex', ModelOption[]>
  >({
    openai: [],
    openrouter: [],
    'openai-codex': []
  });
  const [imageModelOptionsByProvider, setImageModelOptionsByProvider] = useState<
    Record<'openai' | 'openrouter' | 'openai-codex', ModelOption[]>
  >({
    openai: [],
    openrouter: [],
    'openai-codex': []
  });
  const agentClawId = agent?.claw_id ?? null;
  const selectedClawIdResolved = agentClawId || selectedClawId;
  const selectedClaw = selectedClawIdResolved
    ? claws.find((claw) => claw.id === selectedClawIdResolved) || null
    : null;
  const selectedProviderKey =
    selectedClaw?.proxy_provider === 'openrouter'
      ? 'openrouter'
      : selectedClaw?.proxy_provider === 'openai-codex'
        ? 'openai-codex'
        : 'openai';
  const selectedImageProviderKey =
    selectedClaw?.proxy_provider === 'openai-codex' ? 'openrouter' : selectedProviderKey;
  const selectedModelOptions = modelOptionsByProvider[selectedProviderKey] || [];
  const selectedImageModelOptions =
    imageModelOptionsByProvider[selectedImageProviderKey] || [];
  const isChatgptProvider = selectedClaw?.proxy_provider === 'openai-codex';
  const selectedModelValue = selectedClaw
    ? modelDrafts[selectedClaw.id] ??
      selectedClaw.model_id ??
      selectedModelOptions[0]?.id ??
      ''
    : '';
  const selectedImageModelValue = selectedClaw
    ? imageModelDrafts[selectedClaw.id] ??
      selectedClaw.image_model_id ??
      selectedImageModelOptions[0]?.id ??
      ''
    : '';
  const selectedClawReady = selectedClaw?.status === 'ready';
  const selectedClawIdKey = selectedClaw?.id ?? null;
  const selectedModelSaving = selectedClawIdKey ? modelSaving[selectedClawIdKey] : false;
  const selectedImageModelSaving = selectedClawIdKey
    ? imageModelSaving[selectedClawIdKey]
    : false;
  const selectedGatewayRestarting = selectedClawIdKey
    ? gatewayRestarting[selectedClawIdKey]
    : false;
  const showGatewayInitializing = Boolean(
    (selectedClaw && !selectedClawReady) || (agentClawId && !selectedClaw)
  );
  const formatClawLabel = (value: string | null | undefined) => {
    if (!value) return 'Select Claw';
    return value.replace(/\\.clawkai\\.com$/i, '');
  };
  const formatRelativeTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = Date.now() - date.getTime();
    if (diffMs <= 0) return 'just now';
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} sec${diffSec === 1 ? '' : 's'} ago`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;
    const diffDay = Math.round(diffHr / 24);
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    const diffWeek = Math.round(diffDay / 7);
    if (diffWeek < 5) return `${diffWeek} wk${diffWeek === 1 ? '' : 's'} ago`;
    const diffMonth = Math.round(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth} mo${diffMonth === 1 ? '' : 's'} ago`;
    const diffYear = Math.round(diffDay / 365);
    return `${diffYear} yr${diffYear === 1 ? '' : 's'} ago`;
  };
  const formatDateShort = (value: string | number | Date | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  };
  const formatUsdFromCents = (value: number | string | null | undefined) => {
    const cents = Number(value);
    if (!Number.isFinite(cents)) return '$0';
    const dollars = cents / 100;
    return `$${Number.isInteger(dollars) ? dollars.toFixed(0) : dollars.toFixed(2)}`;
  };
  const resolvePlanPriceCents = (claw: Claw | null | undefined) => {
    if (!claw) return null;
    const direct = Number(claw.plan_price_cents);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = planOptions.find((option) => option.id === claw.plan_id);
    if (match && Number.isFinite(match.price)) {
      return Math.round(match.price * 100);
    }
    return null;
  };
  const coerceMicros = (
    value: number | string | null | undefined,
    fallback: number | null = 0
  ) => {
    if (value === null || value === undefined) return fallback;
    const num = typeof value === 'string' ? Number(value) : Number(value);
    return Number.isFinite(num) ? num : fallback;
  };
  const formatUsdFromMicros = (
    value: number | string | null | undefined,
    decimals: number = 5
  ) => {
    const micros = coerceMicros(value, null);
    if (micros === null) return '0.00000';
    const sign = micros < 0 ? '-' : '';
    const abs = Math.abs(Math.trunc(micros));
    const whole = Math.floor(abs / 1_000_000);
    const frac = abs % 1_000_000;
    const fracStr = String(frac).padStart(6, '0');
    if (decimals >= 6) {
      return `${sign}${whole}.${fracStr}`;
    }
    const kept = fracStr.slice(0, decimals);
    const roundDigit = fracStr[decimals] || '0';
    let roundedWhole = whole;
    let roundedFrac = kept.split('').map((digit) => Number(digit));
    if (roundDigit >= '5') {
      let carry = 1;
      for (let i = roundedFrac.length - 1; i >= 0; i -= 1) {
        const next = roundedFrac[i] + carry;
        if (next >= 10) {
          roundedFrac[i] = 0;
          carry = 1;
        } else {
          roundedFrac[i] = next;
          carry = 0;
          break;
        }
      }
      if (carry === 1) {
        roundedWhole += 1;
        roundedFrac = Array(decimals).fill(0);
      }
    }
    const fracOut = roundedFrac.length
      ? roundedFrac.join('').padStart(decimals, '0')
      : '0'.repeat(decimals);
    return `${sign}${roundedWhole}.${fracOut}`;
  };
  const showAgentDesktop = desktopTab === 'agent';
  const showBalanceDesktop = desktopTab === 'balance';
  const showLogsDesktop = desktopTab === 'logs';
  const showActionsDesktop = desktopTab === 'actions';
  const buildAuthHeaders = (
    accessToken: string,
    extra: Record<string, string> = {}
  ) => {
    const headers: Record<string, string> = {
      ...extra,
      Authorization: `Bearer ${accessToken}`,
      'X-Authorization': `Bearer ${accessToken}`
    };
    if (impersonation?.user_id) {
      headers['X-Impersonate-User'] = impersonation.user_id;
    }
    return headers;
  };
  const planOptions: PlanOption[] = [
    {
      id: 'starter',
      name: 'Arena Starter',
      specs: '2GB RAM • 2 vCPU',
      price: 39,
      originalPrice: 49,
      billing: 'mo',
      details: [
        '55GB storage',
        '$10 AI credit per month included',
        'OpenClaw gateway included',
        'General support'
      ]
    },
    {
      id: 'pro',
      name: 'Arena Pro',
      specs: '4GB RAM • 2 vCPU',
      price: 69,
      originalPrice: 79,
      billing: 'mo',
      details: [
        '80GB storage',
        '$20 AI credit per month included',
        'OpenClaw gateway included',
        'Priority support'
      ]
    }
  ];

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    const supabaseClient = supabase;

    let mounted = true;

    async function loadUser() {
      const { data } = await supabaseClient.auth.getUser();
      if (mounted) {
        setUser(data.user ?? null);
        const adminEmails =
          (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean);
        const email = String(data.user?.email || '').toLowerCase();
        setIsAdmin(adminEmails.includes(email));
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        router.push('/');
      }
      const adminEmails =
        (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean);
      const email = String(session?.user?.email || '').toLowerCase();
      setIsAdmin(adminEmails.includes(email));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('clawkai-theme');
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setImpersonationReady(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user_id) {
          setImpersonation(parsed);
        }
      }
    } catch {
      // ignore impersonation load errors
    } finally {
      setImpersonationReady(true);
    }
  }, []);

  const loadAgent = async () => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user || !agentId) return;
    setAgentLoading(true);
    setAgentError('');
    try {
      const { data, error } = await supabaseClient
        .from('arena_agents')
        .select(
          'id,name,handle_final,pfp_url,status,provision_status,pair,token_address,token_symbol,agent_wallet_address,vault_address,claw_id,error_message,verification_code,initial_buy_enabled,initial_buy_spend'
        )
        .eq('hidden', false)
        .eq('id', agentId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setAgent(null);
        setAgentError('Agent not found.');
      } else {
        setAgent(data);
      }
      return data?.status ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agent.';
      setAgentError(message);
      return null;
    } finally {
      setAgentLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase || !user || !agentId) return;
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;
    const stopStatuses = new Set(['ready', 'agent_initialized']);
    const run = async () => {
      if (!active) return;
      const status = await loadAgent();
      if (!active) return;
      if (status && stopStatuses.has(status)) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        return;
      }
      interval = setInterval(async () => {
        if (!active) return;
        const nextStatus = await loadAgent();
        if (!active) return;
        if (nextStatus && stopStatuses.has(nextStatus)) {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      }, 5000);
    };
    run();
    return () => {
      active = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user?.id, agentId]);

  const shouldRefreshClaws = (items: Claw[] | null | undefined) =>
    (items || []).some(
      (item) =>
        ['provisioning', 'deleting'].includes(item.status ?? '') ||
        (item.status === 'ready' && item.health_ok === false)
    );

  const loadClaws = async ({ refresh }: { refresh?: boolean } = {}) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Missing auth session.');
        return;
      }

      const refreshParam = refresh ? '?refresh=1' : '';
      const response = await fetch(
        `${provisioningBase}/claw/list${refreshParam}`,
        {
          headers: buildAuthHeaders(accessToken)
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload?.error || 'Failed to load claws.');
        return null;
      }
      const rows = payload?.claws ?? [];
      setClaws(rows);
      if (rows.length) {
        const toSync = rows.filter(
          (item: Claw) =>
            item.public_ip &&
            item.status === 'ready' &&
            item.health_ok === true &&
            !syncedTokensRef.current.has(item.id)
        );
        if (toSync.length) {
          await Promise.all(
            toSync.map((item: Claw) =>
              fetch(
                `${provisioningBase}/claw/sync-token`,
                {
                  method: 'POST',
                  headers: buildAuthHeaders(accessToken, {
                    'Content-Type': 'application/json'
                  }),
                  body: JSON.stringify({ host: item.public_ip })
                }
              )
                .then((resp) => {
                  if (resp.ok) {
                    syncedTokensRef.current.add(item.id);
                  }
                })
                .catch(() => null)
            )
          );
        }
      }
      return rows;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load claws.'));
    }
    return null;
  };

  useEffect(() => {
    if (!supabase || !user || !impersonationReady) return;
    let active = true;
    const loadInitial = async () => {
      if (!active) return;
      const rows = await loadClaws();
      if (!active || !rows || !rows.length) return;
      if (shouldRefreshClaws(rows)) {
        loadClaws({ refresh: true });
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, [user?.id, impersonationReady, impersonation?.user_id]);

  useEffect(() => {
    if (!claws.length) {
      setSelectedClawId(null);
      return;
    }
    if (agentClawId) {
      if (selectedClawId !== agentClawId) {
        setSelectedClawId(agentClawId);
      }
      return;
    }
    if (!selectedClawId || !claws.some((claw) => claw.id === selectedClawId)) {
      setSelectedClawId(claws[0].id);
    }
  }, [claws, selectedClawId, agentClawId]);

  const fetchPaymentData = async ({ refresh }: { refresh?: boolean } = {}) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    if (refresh) {
      setBalanceRefreshing(true);
    } else {
      setPaymentLoading(true);
    }
    setPaymentError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/payments/address`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken)
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        setPaymentError(payload?.error || 'Failed to load payment address.');
      } else {
        setPaymentAddress(payload?.address || '');
      }

      const balanceResp = await fetch(
        `${provisioningBase}/payments/balance`,
        { headers: buildAuthHeaders(accessToken) }
      );
      const balancePayload = await balanceResp.json();
      if (!balanceResp.ok) {
        setPaymentError(balancePayload?.error || 'Failed to load balance.');
      } else {
        setBalance(balancePayload?.balance ?? null);
      }

      const txResp = await fetch(
        `${provisioningBase}/payments/transactions`,
        { headers: buildAuthHeaders(accessToken) }
      );
      const txPayload = await txResp.json();
      if (!txResp.ok) {
        setPaymentError(txPayload?.error || 'Failed to load transactions.');
      } else {
        setTransactions(txPayload?.transactions ?? []);
      }
    } catch (err) {
      setPaymentError(getErrorMessage(err, 'Failed to load payment address.'));
    } finally {
      setPaymentLoading(false);
      setBalanceRefreshing(false);
    }
  };

  useEffect(() => {
    if (!supabase || !user || !impersonationReady) return;
    let active = true;
    const loadPaymentAddress = async () => {
      if (!active) return;
      await fetchPaymentData();
    };

    loadPaymentAddress();
    return () => {
      active = false;
    };
  }, [user?.id, impersonationReady, impersonation?.user_id]);

  const loadGmailStatus = async () => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setGmailLoading(true);
    setGmailError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/gmail/status`,
        { headers: buildAuthHeaders(accessToken) }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load Gmail status.');
      }
      setGmailStatus(payload || { connected: false });
    } catch (err) {
      setGmailError(getErrorMessage(err, 'Failed to load Gmail status.'));
    } finally {
      setGmailLoading(false);
    }
  };

  const stopImpersonation = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    }
    setImpersonation(null);
  };

  useEffect(() => {
    if (!supabase || !user || !impersonationReady) return;
    loadGmailStatus();
  }, [user?.id, impersonationReady, impersonation?.user_id]);

  const loadLogs = async ({ page = 1, append = false }: { page?: number; append?: boolean } = {}) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    if (append) {
      setLogsLoadingMore(true);
    } else {
      setLogsLoading(true);
    }
    if (!append) {
      setLogsError('');
    }
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(LOGS_PAGE_SIZE));
      if (selectedClaw?.id) {
        params.set('claw_id', selectedClaw.id);
      }
      const response = await fetch(
        `${provisioningBase}/logs?${params.toString()}`,
        { headers: buildAuthHeaders(accessToken) }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load logs.');
      }
      const rows = payload?.logs || [];
      setLogRows((prev) => (append ? [...prev, ...rows] : rows));
      setLogsPage(page);
      setLogsHasMore(Boolean(payload?.has_more));
      setLogsTotal(Number.isFinite(payload?.total) ? payload.total : null);
    } catch (err) {
      setLogsError(getErrorMessage(err, 'Failed to load logs.'));
    } finally {
      if (append) {
        setLogsLoadingMore(false);
      } else {
        setLogsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!supabase || !user || !impersonationReady) return;
    if (desktopTab !== 'logs' && mobileTab !== 'logs') return;
    setLogsPage(1);
    setLogsHasMore(false);
    setLogsTotal(null);
    loadLogs({ page: 1 });
  }, [
    user?.id,
    impersonationReady,
    impersonation?.user_id,
    desktopTab,
    mobileTab,
    selectedClaw?.id
  ]);

  const loadActions = async () => {
    setActionsLoading(true);
    setActionsError('');
    try {
      const response = await fetch('/api/actions');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load actions.');
      }
      setActionsList(payload?.actions || []);
    } catch (err) {
      setActionsError(getErrorMessage(err, 'Failed to load actions.'));
    } finally {
      setActionsLoading(false);
    }
  };

  useEffect(() => {
    if (desktopTab !== 'actions' && mobileTab !== 'actions') return;
    loadActions();
  }, [desktopTab, mobileTab]);

  useEffect(() => {
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    let active = true;
    const loadModelOptions = async () => {
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;
        const providers = ['openai', 'openrouter', 'openai-codex'] as const;
        const results = await Promise.all(
          providers.map(async (provider) => {
            const response = await fetch(
              `${provisioningBase}/models?proxy_provider=${provider}`,
              { headers: buildAuthHeaders(accessToken) }
            );
            if (!response.ok) {
              return { provider, ok: false, payload: null };
            }
            const payload = await response.json();
            return { provider, ok: true, payload };
          })
        );
        if (!active) return;
        const nextModelMap = { ...modelOptionsByProvider };
        const nextImageMap = { ...imageModelOptionsByProvider };
        results.forEach((result) => {
          if (!result.ok || !result.payload) return;
          const models = Array.isArray(result.payload.models) ? result.payload.models : [];
          const imageModels = Array.isArray(result.payload.image_models)
            ? result.payload.image_models
            : [];
          if (models.length) {
            nextModelMap[result.provider] = models;
          }
          if (imageModels.length) {
            nextImageMap[result.provider] = imageModels;
          }
        });
        setModelOptionsByProvider(nextModelMap);
        setImageModelOptionsByProvider(nextImageMap);
      } catch {
        // ignore model list errors
      }
    };
    loadModelOptions();
    return () => {
      active = false;
    };
  }, [user?.id]);


  const handleSignOut = async () => {
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('clawkai-theme', next);
  };

  const saveTelegramBotToken = async () => {
    if (!pairingTarget) return;
    const token = telegramBotToken.trim();
    if (!token) {
      setTelegramTokenError('Telegram bot token is required.');
      return;
    }
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      setTelegramTokenError('Telegram bot token format looks invalid.');
      return;
    }
    if (!supabase || !user) {
      setTelegramTokenError('Please sign in to update your bot token.');
      return;
    }

    setTokenChecking(true);
    setTelegramTokenError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/pair/telegram/token`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          host: pairingTarget.public_ip,
          telegramBotToken: token,
          arenaAgentId: agent?.id
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save bot token.');
      }
      setTelegramBotToken('');
      setTelegramTokenSet(true);
      toast.success('Telegram bot token saved.');
      await loadPairingCodes(pairingTarget);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save bot token.');
      setTelegramTokenError(message);
      toast.error(message);
    } finally {
      setTokenChecking(false);
    }
  };

  const saveDiscordBotToken = async () => {
    if (!pairingTarget) return;
    const token = discordBotToken.trim();
    if (!token) {
      setDiscordTokenError('Discord bot token is required.');
      return;
    }
    if (!supabase || !user) {
      setDiscordTokenError('Please sign in to update your bot token.');
      return;
    }

    setTokenChecking(true);
    setDiscordTokenError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/pair/discord/token`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          host: pairingTarget.public_ip,
          discordBotToken: token
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save bot token.');
      }
      setDiscordBotToken('');
      setDiscordTokenSet(true);
      toast.success('Discord bot token saved.');
      await loadPairingCodes(pairingTarget);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save bot token.');
      setDiscordTokenError(message);
      toast.error(message);
    } finally {
      setTokenChecking(false);
    }
  };

  const handleCopy = async (url: string, id: string) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard.');
  };

  const handleCopyAgentPrivateKey = async () => {
    if (!provisioningBase || !agentId || !supabase) return;
    try {
      setAgentPrivateKeyCopying(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/arena/agent-wallet/private-key`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ arenaAgentId: agentId })
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load private key.');
      }
      const privateKey = String(payload?.privateKey || '').trim();
      if (!privateKey) {
        throw new Error('Private key unavailable.');
      }
      await handleCopy(privateKey, agentWalletPrivateKeyCopyId);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to copy private key.');
      toast.error(message);
    } finally {
      setAgentPrivateKeyCopying(false);
    }
  };

  const openExportPrivateKeyModal = () => {
    setExportPrivateKeyOpen(true);
  };

  const handleCopyAddress = async () => {
    if (!paymentAddress) return;
    await navigator.clipboard.writeText(paymentAddress);
    setCopiedId('payment-address');
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Payment address copied.');
  };

  const fetchInitialBuyBalance = async () => {
    if (!provisioningBase || !agentId || !supabase) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      setInitialBuyBalanceLoading(true);
      setInitialBuyBalanceError('');
      const response = await fetch(`${provisioningBase}/arena/initial-buy/balance`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ arenaAgentId: agentId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load balance.');
      }
      setInitialBuyBalance(payload?.balance || '0');
    } catch (error) {
      setInitialBuyBalanceError(getErrorMessage(error, 'Failed to load balance.'));
      setInitialBuyBalance(null);
    } finally {
      setInitialBuyBalanceLoading(false);
    }
  };

  const fetchInitialBuyEstimate = async (amount: string) => {
    if (!provisioningBase || !agentId || !supabase) return;
    if (!amount.trim()) {
      setInitialBuyEstimate(null);
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      setInitialBuyEstimateLoading(true);
      setInitialBuyEstimateError('');
      const response = await fetch(`${provisioningBase}/arena/initial-buy/preview`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ arenaAgentId: agentId, spend: amount })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to estimate supply.');
      }
      setInitialBuyEstimate({
        percent_total: payload?.percent_total || '0',
        percent_sale: payload?.percent_sale || null,
        amount_wei: payload?.amount_wei || null,
        exact_cost_wei: payload?.exact_cost_wei || null
      });
    } catch (error) {
      setInitialBuyEstimateError(getErrorMessage(error, 'Failed to estimate supply.'));
      setInitialBuyEstimate(null);
    } finally {
      setInitialBuyEstimateLoading(false);
    }
  };

  const confirmInitialBuy = async (amount: string) => {
    if (!provisioningBase || !agentId || !supabase) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      setInitialBuyConfirmLoading(true);
      setInitialBuyEstimateError('');
      const response = await fetch(`${provisioningBase}/arena/initial-buy/confirm`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ arenaAgentId: agentId, buy: true, spend: amount })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details =
          payload?.balance && payload?.required
            ? ` Balance: ${payload.balance} ${pairLabel}, required: ${payload.required} ${pairLabel}.`
            : '';
        throw new Error((payload?.error || 'Failed to confirm initial buy.') + details);
      }
      toast.success('Initial buy confirmed. Minting token...');
      setInitialBuyStep('choice');
      setInitialBuyEstimate(null);
      setInitialBuyAmount(amount);
      await loadAgent();
    } catch (error) {
      setInitialBuyEstimateError(getErrorMessage(error, 'Failed to confirm initial buy.'));
      await fetchInitialBuyBalance();
    } finally {
      setInitialBuyConfirmLoading(false);
    }
  };

  const confirmNoInitialBuy = async () => {
    if (!provisioningBase || !agentId || !supabase) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      setInitialBuyConfirmLoading(true);
      setInitialBuyEstimateError('');
      const response = await fetch(`${provisioningBase}/arena/initial-buy/confirm`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ arenaAgentId: agentId, buy: false })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to confirm no-buy.');
      }
      toast.success('Launching without initial buy.');
      setInitialBuyStep('choice');
      setInitialBuyEstimate(null);
      await loadAgent();
    } catch (error) {
      setInitialBuyEstimateError(getErrorMessage(error, 'Failed to confirm no-buy.'));
    } finally {
      setInitialBuyConfirmLoading(false);
    }
  };

  useEffect(() => {
    if (!claws || claws.length === 0) return undefined;
    const needsRefresh = shouldRefreshClaws(claws);
    if (!needsRefresh) return undefined;
    const interval = setInterval(() => {
      loadClaws({ refresh: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [claws]);

  useEffect(() => {
    if (!supabase || !user || !impersonationReady) return undefined;
    if (claws.length > 0) return undefined;
    if (!agent || agent.provision_status === 'failed' || agent.error_message) {
      return undefined;
    }

    loadClaws({ refresh: true });
    const interval = setInterval(() => {
      loadClaws({ refresh: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [
    user?.id,
    impersonationReady,
    claws.length,
    agent?.id,
    agent?.provision_status,
    agent?.error_message
  ]);

  const loadPairingCodes = async (item: Claw) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setPairingTarget(item);
    setPairingView(null);
    setPairingError('');
    setDevicePairingError('');
    setTelegramTokenError('');
    setDiscordPairingError('');
    setDiscordTokenError('');
    setPairingRequests([]);
    setPairedUsers([]);
    setDiscordPairingRequests([]);
    setDiscordPairedUsers([]);
    setDevicePairingRequests([]);
    setPairedDevices([]);
    setTelegramTokenSet(true);
    setDiscordTokenSet(true);
    setPairingLoading(true);
    setDevicePairingLoading(true);
    setDiscordPairingLoading(true);
    setDiscordConfigError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const headers = buildAuthHeaders(accessToken, {
        'Content-Type': 'application/json'
      });
      const body = JSON.stringify({ host: item.public_ip });

      const response = await fetch(`${provisioningBase}/pair/all`, {
        method: 'POST',
        headers,
        body
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load pairing data.');
      }

      const telegramResult = data?.telegram || {};
      const deviceResult = data?.device || {};
      const discordResult = data?.discord || {};

      if (telegramResult.ok !== false) {
        setPairingRequests(telegramResult.requests || []);
        setPairedUsers(telegramResult.pairedUsers || []);
        setTelegramTokenSet(telegramResult.botTokenSet !== false);
      } else {
        const message = getErrorMessage(
          telegramResult.error,
          'Failed to load Telegram pairing codes.'
        );
        setPairingError(message);
        toast.error(message);
      }

      if (deviceResult.ok !== false) {
        setDevicePairingRequests(deviceResult.pending || []);
        setPairedDevices(deviceResult.paired || []);
      } else {
        const message = getErrorMessage(
          deviceResult.error,
          'Failed to load device pairing requests.'
        );
        setDevicePairingError(message);
        toast.error(message);
      }

      if (discordResult.ok !== false) {
        setDiscordPairingRequests(discordResult.requests || []);
        setDiscordPairedUsers(discordResult.pairedUsers || []);
        setDiscordTokenSet(discordResult.botTokenSet !== false);
        setDiscordDmPolicy(discordResult.dmPolicy || 'pairing');
        setDiscordGroupPolicy(discordResult.groupPolicy || 'allowlist');
        const guilds = discordResult.guilds || {};
        setDiscordGuildsJson(JSON.stringify(guilds, null, 2));
      } else {
        const message = getErrorMessage(
          discordResult.error,
          'Failed to load Discord pairing codes.'
        );
        setDiscordPairingError(message);
        toast.error(message);
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load pairing codes.');
      setPairingError(message);
      setDevicePairingError(message);
      setDiscordPairingError(message);
      toast.error(message);
    } finally {
      setPairingLoading(false);
      setDevicePairingLoading(false);
      setDiscordPairingLoading(false);
    }
  };

  const openChatgptModal = async (item: Claw) => {
    if (!item) return;
    setChatgptTarget(item);
    setChatgptModalOpen(true);
    setChatgptAuthUrl('');
    setChatgptRedirectUrl('');
    setChatgptError('');
    await fetchChatgptAuthUrl(item);
  };

  const fetchChatgptAuthUrl = async (item: Claw) => {
    const supabaseClient = supabase;
    if (!item || !supabaseClient || !user) return;
    setChatgptAuthLoading(true);
    setChatgptError('');
    setChatgptRedirectUrl('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/claw/chatgpt/auth-url`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ host: item.public_ip })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Failed to generate auth link.');
      }
      setChatgptAuthUrl(payload.url);
    } catch (err) {
      setChatgptError(getErrorMessage(err, 'Failed to generate auth link.'));
    } finally {
      setChatgptAuthLoading(false);
    }
  };

  const enableChatgpt = async () => {
    const supabaseClient = supabase;
    if (!chatgptTarget || !supabaseClient || !user) return;
    if (!chatgptRedirectUrl) {
      setChatgptError('Paste the redirect URL from the browser address bar.');
      return;
    }
    setChatgptEnableLoading(true);
    setChatgptError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/claw/chatgpt/enable`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          host: chatgptTarget.public_ip,
          modelId: 'gpt-5.2-codex',
          redirectUrl: chatgptRedirectUrl
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to enable ChatGPT.');
      }
      toast.success('ChatGPT connected.');
      await loadClaws();
      setChatgptModalOpen(false);
    } catch (err) {
      setChatgptError(getErrorMessage(err, 'Failed to enable ChatGPT.'));
    } finally {
      setChatgptEnableLoading(false);
    }
  };

  const disableChatgpt = async (item: Claw) => {
    const supabaseClient = supabase;
    if (!item || !supabaseClient || !user) return;
    setChatgptDisableLoading(true);
    setChatgptError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/claw/chatgpt/disable`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ host: item.public_ip })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to disconnect ChatGPT.');
      }
      toast.success('ChatGPT disconnected.');
      await loadClaws();
    } catch (err) {
      setChatgptError(getErrorMessage(err, 'Failed to disconnect ChatGPT.'));
    } finally {
      setChatgptDisableLoading(false);
    }
  };

  const approvePairing = async (code: string) => {
    if (!pairingTarget) return;
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setPairingLoading(true);
    setPairingError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/pair/telegram/approve`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ host: pairingTarget.public_ip, code })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Pairing approval failed.');
      }
      toast.success('Telegram pairing approved.');
      await loadPairingCodes(pairingTarget);
    } catch (err) {
      const message = getErrorMessage(err, 'Pairing approval failed.');
      setPairingError(message);
      toast.error(message);
    } finally {
      setPairingLoading(false);
    }
  };

  const approveDiscordPairing = async (code: string) => {
    if (!pairingTarget) return;
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setDiscordPairingLoading(true);
    setDiscordPairingError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/pair/discord/approve`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ host: pairingTarget.public_ip, code })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Pairing approval failed.');
      }
      toast.success('Discord pairing approved.');
      await loadPairingCodes(pairingTarget);
    } catch (err) {
      const message = getErrorMessage(err, 'Pairing approval failed.');
      setDiscordPairingError(message);
      toast.error(message);
    } finally {
      setDiscordPairingLoading(false);
    }
  };

  const approveDevicePairing = async (requestId?: string | null) => {
    if (!pairingTarget) return;
    if (!requestId) {
      toast.error('Missing device request id.');
      return;
    }
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setDevicePairingLoading(true);
    setDevicePairingError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/pair/device/approve`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ host: pairingTarget.public_ip, requestId })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Device pairing approval failed.');
      }
      toast.success('Device pairing approved.');
      await loadPairingCodes(pairingTarget);
    } catch (err) {
      const message = getErrorMessage(err, 'Device pairing approval failed.');
      setDevicePairingError(message);
      toast.error(message);
    } finally {
      setDevicePairingLoading(false);
    }
  };

  const toggleElevated = async (telegramUserId: string, enabled: boolean) => {
    const supabaseClient = supabase;
    if (!pairingTarget || !supabaseClient || !user) return;
    setElevatedUpdating((prev) => ({ ...prev, [telegramUserId]: true }));
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/pair/telegram/elevated`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            host: pairingTarget.public_ip,
            telegramUserId,
            enabled
          })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update elevated access.');
      }
      setPairedUsers((prev) =>
        prev.map((entry) =>
          entry.telegramUserId === telegramUserId
            ? { ...entry, elevated: enabled }
            : entry
        )
      );
      toast.success(enabled ? 'Elevated access granted.' : 'Elevated access revoked.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update elevated access.'));
    } finally {
      setElevatedUpdating((prev) => ({ ...prev, [telegramUserId]: false }));
    }
  };

  const toggleDiscordElevated = async (discordUserId: string, enabled: boolean) => {
    if (!pairingTarget || !supabase || !user) return;
    setElevatedUpdating((prev) => ({ ...prev, [discordUserId]: true }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/pair/discord/elevated`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          host: pairingTarget.public_ip,
          discordUserId,
          enabled
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update elevated access.');
      }
      setDiscordPairedUsers((prev) =>
        prev.map((entry) =>
          entry.discordUserId === discordUserId
            ? { ...entry, elevated: enabled }
            : entry
        )
      );
      toast.success(enabled ? 'Elevated access granted.' : 'Elevated access revoked.');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update elevated access.');
      toast.error(message);
    } finally {
      setElevatedUpdating((prev) => ({ ...prev, [discordUserId]: false }));
    }
  };

  const saveDiscordConfig = async () => {
    if (!pairingTarget || !supabase || !user) return;
    let guilds: Record<string, unknown> = {};
    const raw = discordGuildsJson.trim();
    if (raw) {
      try {
        guilds = JSON.parse(raw);
      } catch {
        setDiscordConfigError('Guilds JSON is invalid.');
        return;
      }
    }
    setDiscordConfigSaving(true);
    setDiscordConfigError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/pair/discord/config`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          host: pairingTarget.public_ip,
          dmPolicy: discordDmPolicy,
          groupPolicy: discordGroupPolicy,
          guilds
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update Discord config.');
      }
      toast.success('Discord configuration updated.');
      await loadPairingCodes(pairingTarget);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update Discord config.');
      setDiscordConfigError(message);
      toast.error(message);
    } finally {
      setDiscordConfigSaving(false);
    }
  };

  const handleModelChange = (clawId: string, nextModel: string) => {
    setModelDrafts((prev) => ({ ...prev, [clawId]: nextModel }));
  };

  const handleImageModelChange = (clawId: string, nextModel: string) => {
    setImageModelDrafts((prev) => ({ ...prev, [clawId]: nextModel }));
  };

  const saveImageModel = async (item: Claw, nextModelOverride?: string) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    const providerKey =
      item.proxy_provider === 'openai-codex'
        ? 'openrouter'
        : item.proxy_provider === 'openrouter'
          ? 'openrouter'
          : 'openai';
    const nextModel =
      (nextModelOverride ??
        imageModelDrafts[item.id] ??
        item.image_model_id ??
        imageModelOptionsByProvider[providerKey]?.[0]?.id) ||
      '';
    if (nextModel === item.image_model_id) return;
    if (!nextModel) {
      toast.error('Select an image model first.');
      return;
    }
    setImageModelSaving((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/claw/image-model`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ id: item.id, imageModelId: nextModel })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Image model update failed.');
      }
      setClaws((prev) =>
        prev.map((claw) =>
          claw.id === item.id ? { ...claw, image_model_id: nextModel } : claw
        )
      );
      toast.success('Image model updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Image model update failed.'));
    } finally {
      setImageModelSaving((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const connectGmail = async () => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setGmailConnecting(true);
    setGmailError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/gmail/connect`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ mode: gmailMode })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to start Gmail connection.');
      }
      if (payload?.url) {
        window.location.href = payload.url;
      } else {
        throw new Error('Missing Gmail auth URL.');
      }
    } catch (err) {
      setGmailError(getErrorMessage(err, 'Failed to start Gmail connection.'));
    } finally {
      setGmailConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setGmailDisconnecting(true);
    setGmailError('');
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/gmail/disconnect`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to disconnect Gmail.');
      }
      setGmailStatus({ connected: false });
    } catch (err) {
      setGmailError(getErrorMessage(err, 'Failed to disconnect Gmail.'));
    } finally {
      setGmailDisconnecting(false);
    }
  };

  const saveModel = async (item: Claw, nextModelOverride?: string) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    const providerKey =
      item.proxy_provider === 'openrouter'
        ? 'openrouter'
        : item.proxy_provider === 'openai-codex'
          ? 'openai-codex'
          : 'openai';
    const nextModel =
      (nextModelOverride ??
        modelDrafts[item.id] ??
        item.model_id ??
        modelOptionsByProvider[providerKey]?.[0]?.id) ||
      '';
    if (nextModel === item.model_id) return;
    if (!nextModel) {
      toast.error('Select a model first.');
      return;
    }
    setModelSaving((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/claw/model`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ id: item.id, modelId: nextModel })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Model update failed.');
      }
      setClaws((prev) =>
        prev.map((claw) =>
          claw.id === item.id ? { ...claw, model_id: nextModel } : claw
        )
      );
      toast.success('Model updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Model update failed.'));
    } finally {
      setModelSaving((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const getPlanLabel = (planIdValue: string | null | undefined) => {
    const match = planOptions.find((option) => option.id === planIdValue);
    if (!match) return planIdValue || 'starter';
    return `${match.name} • ${match.specs} • ${match.price}$/${match.billing}`;
  };

  const normalizeGatewayUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.includes('?token=')) {
      return url.replace('?token=', '#token=');
    }
    return url;
  };

  const extractGatewayToken = (url: string | null | undefined) => {
    if (!url) return '';
    const normalized = normalizeGatewayUrl(url);
    const hashIndex = normalized.indexOf('#token=');
    if (hashIndex !== -1) {
      return normalized.slice(hashIndex + '#token='.length);
    }
    const queryIndex = normalized.indexOf('?token=');
    if (queryIndex !== -1) {
      return normalized.slice(queryIndex + '?token='.length);
    }
    return '';
  };
  const stripGatewayToken = (url: string | null | undefined) => {
    if (!url) return '';
    return url.replace(/[#?]token=[^&]+/, '');
  };
  const buildGatewayChatUrl = (url: string | null | undefined) => {
    const normalized = normalizeGatewayUrl(url);
    if (!normalized) return '';
    const token = extractGatewayToken(normalized);
    const base = stripGatewayToken(normalized).replace(/\/+$/, '');
    if (token) {
      return `${base}/#/chat?token=${encodeURIComponent(token)}`;
    }
    return `${base}/#/chat`;
  };



  const handleCreditChange = (id: string, value: string) => {
    setCreditDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const restartGateway = async (item: Claw) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setGatewayRestarting((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/claw/gateway-restart`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ id: item.id })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Gateway restart failed.');
      }
      toast.success('Gateway restarted.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gateway restart failed.'));
    } finally {
      setGatewayRestarting((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const repairAgent = async (item: Claw) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    setRepairing((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(`${provisioningBase}/claw/repair`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ id: item.id })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Repair failed.');
      }
      toast.success('Repair started.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Repair failed.'));
    } finally {
      setRepairing((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const confirmRestartGateway = async () => {
    if (!restartTarget) return;
    try {
      await restartGateway(restartTarget);
    } finally {
      setRestartTarget(null);
    }
  };

  const addCredits = async (item: Claw) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;
    const raw = String(creditDrafts[item.id] ?? '').trim();
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid credit amount.');
      return;
    }
    const amountCents = Math.round(amount * 100);
    setCreditLoading((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const response = await fetch(
        `${provisioningBase}/claw/credit`,
        {
          method: 'POST',
          headers: buildAuthHeaders(accessToken, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ id: item.id, amount_cents: amountCents })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Credit purchase failed.');
      }
      setCreditDrafts((prev) => ({ ...prev, [item.id]: '' }));
      await loadClaws();
      toast.success('Credits added.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Credit purchase failed.'));
    } finally {
      setCreditLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const selectedGatewayUrl = selectedClaw
    ? normalizeGatewayUrl(selectedClaw.gateway_url)
    : '';
  const selectedGatewayToken = selectedClaw
    ? extractGatewayToken(selectedGatewayUrl)
    : '';
  const selectedGatewayUri = selectedGatewayUrl
    ? stripGatewayToken(selectedGatewayUrl)
    : selectedClaw
      ? `https://${selectedClaw.subdomain}`
      : '';
  const selectedOpenGatewayUrl =
    selectedGatewayUrl || (selectedClaw ? `https://${selectedClaw.subdomain}` : '');
  const selectedGatewayChatUrl = selectedOpenGatewayUrl || '';
  const selectedGatewayCopyId = selectedClaw
    ? `${selectedClaw.id}-gateway-token`
    : 'gateway-token';
  const selectedClawSpendMicros = selectedClaw
    ? coerceMicros(
        selectedClaw.ai_spend_micros,
        (selectedClaw.ai_spend_cents ?? 0) * 10000
      )
    : null;
  const selectedClawCreditMicros = selectedClaw
    ? (selectedClaw.ai_credit_cents ?? 0) * 10000
    : null;
  const selectedClawRemainingMicros =
    selectedClaw && selectedClawCreditMicros !== null
      ? Math.max(0, selectedClawCreditMicros - (selectedClawSpendMicros ?? 0))
      : null;
  const gracePeriodActive = Boolean(selectedClaw?.grace_period);
  const graceAmountCents = resolvePlanPriceCents(selectedClaw);
  const graceAmountLabel = formatUsdFromCents(graceAmountCents ?? 0);
  const handleGraceBannerClick = () => {
    setDesktopTab('balance');
    setMobileTab('balance');
  };
  const normalizedStatus =
    agent?.status === 'ready' ? 'agent_initialized' : agent?.status;
  const statusKey = normalizedStatus ?? agent?.status ?? null;
  const showInitialBuy = statusKey === 'awaiting_initial_buy';
  const pairLabel = agent?.pair === 'arena' ? 'ARENA' : 'AVAX';
  const minSpendLabel =
    agent?.pair === 'arena' ? MIN_TOKENS_TO_SPEND_ARENA : MIN_TOKENS_TO_SPEND_AVAX;
  const statusLabel = agent
    ? statusKey && statusKey in STATUS_LABELS
      ? STATUS_LABELS[statusKey as keyof typeof STATUS_LABELS]
      : statusKey || 'Loading'
    : 'Loading';
  const currentIndex = statusKey
    ? STATUS_STEPS.findIndex((step) => step.key === statusKey)
    : -1;
  const showOverlay = Boolean(agent && normalizedStatus !== 'agent_initialized');
  const showFailed = Boolean(
    agent && (agent.provision_status === 'failed' || agent.error_message)
  );
  const displayErrorMessage = agent?.error_message
    ? agent.error_message.replace(/^RETRYABLE:\s*/i, '')
    : '';
  const overlayVideoSrc = (() => {
    switch (normalizedStatus) {
      case 'awaiting_initial_buy':
        return '/icons/gladiusConfig.mp4';
      case 'minting':
        return '/icons/gladiusMintToken.mp4';
      case 'token_ready':
        return '/icons/gladiusMintToken.mp4';
      case 'provisioning':
        return '/icons/GladiusOnOff.mp4';
      case 'sync_pending':
        return '/icons/GladiusInit.mp4';
      case 'agent_initialized':
        return '/icons/GladiusInit.mp4';
      default:
        return '/icons/gladiusConfig.mp4';
    }
  })();
  const agentTokenUrl = agent?.token_address
    ? `https://arena.social/community/${agent.token_address}`
    : '';
  const verificationText =
    agent?.verification_code && agent?.name
      ? `I'm claiming my AI Agent "${agent.name}"\nVerification Code: ${agent.verification_code}`
      : '';
  const agentWalletAddress = agent?.agent_wallet_address || '';
  const agentWalletCopyId = 'agent-wallet-address';
  const agentWalletPrivateKeyCopyId = 'agent-wallet-private-key';
  const agentName = agent?.name || 'Agent';
  const agentHandle = agent?.handle_final ? `@${agent.handle_final}` : '';
  const agentInitials = (() => {
    const source = agent?.name || agent?.handle_final || 'Agent';
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
    return initials || 'A';
  })();

  useEffect(() => {
    if (statusKey === 'awaiting_initial_buy' && statusRef.current !== 'awaiting_initial_buy') {
      setInitialBuyStep('choice');
      setInitialBuyAmount(agent?.initial_buy_spend || '');
      setInitialBuyEstimate(null);
      const errorMessage = agent?.error_message
        ? agent.error_message.replace(/^RETRYABLE:\s*/i, '')
        : '';
      setInitialBuyEstimateError(errorMessage);
      setInitialBuyBalance(null);
      setInitialBuyBalanceError('');
    }
    statusRef.current = statusKey;
  }, [statusKey, agent?.initial_buy_spend, agent?.error_message]);

  useEffect(() => {
    if (!showInitialBuy || initialBuyStep !== 'with') return;
    fetchInitialBuyBalance();
  }, [showInitialBuy, initialBuyStep]);

  useEffect(() => {
    if (!showInitialBuy || initialBuyStep !== 'with') return;
    if (!initialBuyAmount.trim()) {
      setInitialBuyEstimate(null);
      return;
    }
    const timer = setTimeout(() => {
      fetchInitialBuyEstimate(initialBuyAmount);
    }, 500);
    return () => clearTimeout(timer);
  }, [showInitialBuy, initialBuyStep, initialBuyAmount]);

  return (
    <div className="relative h-screen overflow-hidden text-foreground">
      {showOverlay ? (
        showInitialBuy ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur">
            <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Agent Launcher
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    Initial buy decision
                  </h2>
                  <p className="text-xs text-white/60">
                    Your vault is ready. Decide if the agent should buy initial supply.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Agent Wallet
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <code className="text-xs text-white/80 break-all">
                      {agentWalletAddress || 'Wallet pending...'}
                    </code>
                    <button
                      type="button"
                      className="rounded-md border border-white/20 px-3 py-1 text-xs text-white/80 hover:border-white/40 hover:text-white"
                      onClick={() =>
                        agentWalletAddress
                          ? handleCopy(agentWalletAddress, 'initial-buy-wallet')
                          : null
                      }
                      disabled={!agentWalletAddress}
                    >
                      {copiedId === 'initial-buy-wallet' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    Deposit at least {minSpendLabel} {pairLabel} to this wallet if you want
                    the agent to buy on launch.
                  </p>
                </div>

                {initialBuyEstimateError ? (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    {initialBuyEstimateError}
                  </div>
                ) : null}

                {initialBuyStep === 'choice' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:border-white/30"
                      onClick={() => setInitialBuyStep('with')}
                    >
                      Create token with initial buy
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white"
                      onClick={() => setInitialBuyStep('without')}
                    >
                      Create token without initial buy
                    </button>
                  </div>
                ) : null}

                {initialBuyStep === 'with' ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase tracking-wide text-white/50">
                          Wallet balance
                        </span>
                        <button
                          type="button"
                          className="text-xs text-[#2b6cff] hover:underline"
                          onClick={fetchInitialBuyBalance}
                          disabled={initialBuyBalanceLoading}
                        >
                          {initialBuyBalanceLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {initialBuyBalanceLoading
                          ? 'Loading...'
                          : initialBuyBalance
                            ? `${initialBuyBalance} ${pairLabel}`
                            : '--'}
                      </div>
                      {initialBuyBalanceError ? (
                        <p className="mt-2 text-xs text-rose-200">
                          {initialBuyBalanceError}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-white/50">
                        Amount to spend ({pairLabel})
                      </label>
                      <input
                        value={initialBuyAmount}
                        onChange={(event) => setInitialBuyAmount(event.target.value)}
                        placeholder={`Minimum ${minSpendLabel} ${pairLabel}`}
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                      />
                      <p className="text-xs text-white/50">
                        We will estimate the supply percentage before minting.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white">
                      {initialBuyEstimateLoading ? (
                        <span className="text-white/70">Estimating supply...</span>
                      ) : initialBuyEstimate ? (
                        <span>
                          Estimated buy: {initialBuyEstimate.percent_total}% of total
                          supply.
                        </span>
                      ) : (
                        <span className="text-white/50">
                          Enter a spend amount to see the estimate.
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-white/70 hover:border-white/30 hover:text-white"
                        onClick={() => setInitialBuyStep('choice')}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-[#2b6cff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f52d6] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => confirmInitialBuy(initialBuyAmount)}
                        disabled={
                          !initialBuyAmount.trim() ||
                          initialBuyConfirmLoading ||
                          initialBuyEstimateLoading
                        }
                      >
                        {initialBuyConfirmLoading
                          ? 'Confirming...'
                          : 'Confirm initial buy'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {initialBuyStep === 'without' ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                      The agent will launch the token without any initial buy. You can
                      still buy later from the agent wallet.
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-white/70 hover:border-white/30 hover:text-white"
                        onClick={() => setInitialBuyStep('choice')}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={confirmNoInitialBuy}
                        disabled={initialBuyConfirmLoading}
                      >
                        {initialBuyConfirmLoading ? 'Confirming...' : 'Confirm without buy'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur">
            <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  <video
                    src={overlayVideoSrc}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      Agent Launcher
                    </p>
                    <h2 className="text-xl font-semibold text-white">
                      Your agent is being created!
                    </h2>
                    <p className="text-xs text-white/60">
                      You can close this page and come back later if you want.
                    </p>
                    <p className="text-xs text-white/60">
                      Join{' '}
                      <a
                        href="https://t.me/+ThHPHKW1rvE1YTFl"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2b6cff] hover:underline"
                      >
                        support group
                      </a>{' '}
                      for assistance.
                    </p>
                    {agentTokenUrl ? (
                      <p className="text-xs text-white/60">
                        View token on{' '}
                        <a
                          href={agentTokenUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2b6cff] hover:underline"
                        >
                          Arena
                        </a>
                        .
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {STATUS_STEPS.map((step, index) => {
                      const done = currentIndex > index;
                      const active = currentIndex === index;
                      return (
                        <div
                          key={step.key}
                          className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs"
                        >
                          <span
                            className={
                              done || active ? 'text-white' : 'text-white/50'
                            }
                          >
                            {step.label}
                          </span>
                          {active ? (
                            <span className="inline-flex size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : done ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <span className="h-3 w-3" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {showFailed ? (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                      <p className="font-semibold">Provisioning failed</p>
                      <p className="mt-1 text-red-200/80">
                        {displayErrorMessage || 'Something went wrong.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      ) : null}

      <div className="relative z-10 flex h-screen">
        <AgentSidebar
          agent={agent}
          agentName={agentName}
          agentInitials={agentInitials}
          agentHandle={agentHandle}
          agentLoading={agentLoading}
          agentError={agentError}
          statusLabel={statusLabel}
          isAdmin={isAdmin}
          selectedClaw={selectedClaw}
          selectedClawReady={selectedClawReady}
          isChatgptProvider={isChatgptProvider}
          onConnectChatgpt={openChatgptModal}
          onDisconnectChatgpt={disableChatgpt}
          chatgptDisconnecting={chatgptDisableLoading}
          selectedModelOptions={selectedModelOptions}
          selectedImageModelOptions={selectedImageModelOptions}
          selectedModelValue={selectedModelValue}
          selectedImageModelValue={selectedImageModelValue}
          selectedModelSaving={selectedModelSaving}
          selectedImageModelSaving={selectedImageModelSaving}
          selectedOpenGatewayUrl={selectedOpenGatewayUrl}
          selectedGatewayToken={selectedGatewayToken}
          selectedGatewayCopyId={selectedGatewayCopyId}
          agentTokenUrl={agentTokenUrl}
          agentWalletAddress={agentWalletAddress}
          agentWalletCopyId={agentWalletCopyId}
          agentWalletPrivateKeyCopying={agentPrivateKeyCopying}
          copiedId={copiedId}
          pairingLoading={pairingLoading}
          devicePairingLoading={devicePairingLoading}
          onCopy={handleCopy}
          onExportPrivateKey={openExportPrivateKeyModal}
          onPairDevices={loadPairingCodes}
          onModelChange={handleModelChange}
          onImageModelChange={handleImageModelChange}
          onSaveModel={saveModel}
          onSaveImageModel={saveImageModel}
        />

        <div className="flex h-screen flex-1 flex-col">
          <AgentTopbar
            agent={agent}
            agentName={agentName}
            agentInitials={agentInitials}
            agentHandle={agentHandle}
            statusLabel={statusLabel}
            desktopTab={desktopTab}
            onDesktopTabChange={setDesktopTab}
            selectedClaw={selectedClaw}
            selectedClawReady={selectedClawReady}
            selectedGatewayRestarting={selectedGatewayRestarting}
            onRequestRestart={setRestartTarget}
            actionsDisabled={actionsDisabled}
            user={user}
            profileOpen={profileOpen}
            onToggleProfile={() => setProfileOpen((prev) => !prev)}
            onToggleTheme={toggleTheme}
            theme={theme}
            onSignOut={handleSignOut}
          />
          {gracePeriodActive ? (
            <div className="hidden lg:block border-b border-amber-400/40 bg-amber-500/10 px-6 py-3">
              <button
                type="button"
                onClick={handleGraceBannerClick}
                className="flex w-full items-start justify-between gap-4 text-left text-sm text-amber-50"
              >
                <span>
                  Your Claw has entered grace period, deposit {graceAmountLabel} in your
                  wallet in 2 days to keep using services
                </span>
                <span className="text-xs font-semibold text-amber-100/90">Go to Wallet</span>
              </button>
            </div>
          ) : null}
          <div className="lg:hidden w-full bg-[#2b6cff]/80 text-white">
            <a
              href="https://t.me/+ThHPHKW1rvE1YTFl"
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium"
            >
              <span>Join our support channel for help</span>
              <Send className="h-4 w-4" />
            </a>
          </div>
          {gracePeriodActive ? (
            <div className="lg:hidden border-b border-amber-400/40 bg-amber-500/10 px-4 py-3">
              <button
                type="button"
                onClick={handleGraceBannerClick}
                className="flex w-full flex-col gap-1 text-left text-sm text-amber-50"
              >
                <span>
                  Your Claw has entered grace period, deposit {graceAmountLabel} in your
                  wallet in 2 days to keep using services
                </span>
                <span className="text-xs font-semibold text-amber-100/90">Go to Wallet</span>
              </button>
            </div>
          ) : null}
          <AgentMobileTabs mobileTab={mobileTab} onMobileTabChange={setMobileTab} />

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto w-full max-w-6xl space-y-6 py-4 lg:px-6 lg:py-6">
              {showGatewayInitializing ? (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="inline-flex size-3 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
                      Initializing Agent gateway...
                    </div>
                    <a
                      href="https://t.me/+ThHPHKW1rvE1YTFl"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-amber-50/90 underline-offset-4 hover:text-amber-50 hover:underline"
                    >
                      Join our support channel for help
                    </a>
                  </div>
                </div>
              ) : null}
              {impersonation?.user_id ? (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Impersonating user</p>
                      <p className="text-xs text-amber-100/80">
                        Actions apply to {impersonation.email || impersonation.user_id}.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-300/50 bg-transparent text-amber-50 hover:bg-amber-500/20"
                      onClick={stopImpersonation}
                    >
                      Stop impersonating
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-6">
                <TabAgents
                  mobileTab={mobileTab}
                  selectedClaw={selectedClaw}
                  selectedClawReady={selectedClawReady}
                  isChatgptProvider={isChatgptProvider}
                  onConnectChatgpt={openChatgptModal}
                  onDisconnectChatgpt={disableChatgpt}
                  chatgptDisconnecting={chatgptDisableLoading}
                  selectedModelOptions={selectedModelOptions}
                  selectedImageModelOptions={selectedImageModelOptions}
                  selectedModelValue={selectedModelValue}
                  selectedImageModelValue={selectedImageModelValue}
                  selectedModelSaving={selectedModelSaving}
                  selectedImageModelSaving={selectedImageModelSaving}
                  selectedGatewayUri={selectedGatewayUri}
                  selectedOpenGatewayUrl={selectedOpenGatewayUrl}
                  selectedGatewayToken={selectedGatewayToken}
                  selectedGatewayCopyId={selectedGatewayCopyId}
                  copiedId={copiedId}
                  pairingLoading={pairingLoading}
                  devicePairingLoading={devicePairingLoading}
                  onCopy={handleCopy}
              onPairDevices={loadPairingCodes}
              onModelChange={handleModelChange}
                  onImageModelChange={handleImageModelChange}
                  onSaveModel={saveModel}
                  onSaveImageModel={saveImageModel}
                />
                <TabAgent
                  mobileTab={mobileTab}
                  showAgentDesktop={showAgentDesktop}
                  verificationText={verificationText}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  selectedClaw={selectedClaw}
                  selectedClawReady={selectedClawReady}
                  gatewayChatUrl={selectedGatewayChatUrl}
                  pairingLoading={pairingLoading}
                  devicePairingLoading={devicePairingLoading}
                  onPairDevices={loadPairingCodes}
                  onRepairAgent={repairAgent}
                  repairing={Boolean(selectedClaw?.id && repairing[selectedClaw.id])}
                />
                <TabBalance
                  mobileTab={mobileTab}
                  showBalanceDesktop={showBalanceDesktop}
                  agentId={agentId ?? null}
                  agentTokenAddress={agent?.token_address ?? null}
                  agentTokenSymbol={agent?.token_symbol ?? null}
                  provisioningBase={provisioningBase}
                  vaultAddress={agent?.vault_address ?? null}
                  impersonationUserId={impersonation?.user_id ?? null}
                  selectedClaw={selectedClaw}
                  selectedClawRemainingMicros={selectedClawRemainingMicros}
                  formatUsdFromMicros={formatUsdFromMicros}
                  formatClawLabel={formatClawLabel}
                  getPlanLabel={getPlanLabel}
                  formatDateShort={formatDateShort}
                  creditDrafts={creditDrafts}
                  creditLoading={creditLoading}
                  onCreditChange={handleCreditChange}
                  onAddCredits={addCredits}
                  paymentLoading={paymentLoading}
                  paymentError={paymentError}
                  paymentAddress={paymentAddress}
                  balance={balance}
                  onCopyAddress={handleCopyAddress}
                  copiedId={copiedId}
                  transactions={transactions}
                />
                <TabActions
                  mobileTab={mobileTab}
                  showActionsDesktop={showActionsDesktop}
                  actionsLoading={actionsLoading}
                  actionsError={actionsError}
                  actionsList={actionsList}
                />
                <TabLogs
                  mobileTab={mobileTab}
                  showLogsDesktop={showLogsDesktop}
                  selectedClaw={selectedClaw}
                  selectedClawRemainingMicros={selectedClawRemainingMicros}
                  selectedClawSpendMicros={selectedClawSpendMicros}
                  logRows={logRows}
                  logsLoading={logsLoading}
                  logsError={logsError}
                  logsHasMore={logsHasMore}
                  logsLoadingMore={logsLoadingMore}
                  logsTotal={logsTotal}
                  onLoadMore={() => loadLogs({ page: logsPage + 1, append: true })}
                  formatUsdFromMicros={formatUsdFromMicros}
                  formatRelativeTime={formatRelativeTime}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      <RestartGatewayModal
        restartTarget={restartTarget}
        gatewayRestarting={gatewayRestarting}
        onClose={() => setRestartTarget(null)}
        onConfirm={confirmRestartGateway}
      />
      <PairDevicesModal
        pairingTarget={pairingTarget}
        pairingView={pairingView}
        onSetPairingView={setPairingView}
        pairingError={pairingError}
        pairingLoading={pairingLoading}
        pairingRequests={pairingRequests}
        pairedUsers={pairedUsers}
        toggleElevated={toggleElevated}
        elevatedUpdating={elevatedUpdating}
        telegramTokenSet={telegramTokenSet}
        telegramBotToken={telegramBotToken}
        onTelegramBotTokenChange={setTelegramBotToken}
        telegramTokenError={telegramTokenError}
        onSaveTelegramToken={saveTelegramBotToken}
        discordTokenSet={discordTokenSet}
        discordBotToken={discordBotToken}
        onDiscordBotTokenChange={setDiscordBotToken}
        discordTokenError={discordTokenError}
        onSaveDiscordToken={saveDiscordBotToken}
        discordPairingError={discordPairingError}
        discordPairingLoading={discordPairingLoading}
        discordPairingRequests={discordPairingRequests}
        discordPairedUsers={discordPairedUsers}
        onApproveDiscordPairing={approveDiscordPairing}
        onToggleDiscordElevated={toggleDiscordElevated}
        discordDmPolicy={discordDmPolicy}
        onDiscordDmPolicyChange={setDiscordDmPolicy}
        discordGroupPolicy={discordGroupPolicy}
        onDiscordGroupPolicyChange={setDiscordGroupPolicy}
        discordGuildsJson={discordGuildsJson}
        onDiscordGuildsJsonChange={setDiscordGuildsJson}
        onSaveDiscordConfig={saveDiscordConfig}
        discordConfigError={discordConfigError}
        discordConfigSaving={discordConfigSaving}
        tokenChecking={tokenChecking}
        devicePairingError={devicePairingError}
        devicePairingLoading={devicePairingLoading}
        devicePairingRequests={devicePairingRequests}
        pairedDevices={pairedDevices}
        onApproveDevicePairing={approveDevicePairing}
        formatDeviceId={formatDeviceId}
        onApprovePairing={approvePairing}
        onClose={() => setPairingTarget(null)}
      />
      <ExportPrivateKeyModal
        open={exportPrivateKeyOpen}
        agentName={agentName}
        agentWalletAddress={agentWalletAddress}
        copiedId={copiedId}
        copyId={agentWalletPrivateKeyCopyId}
        copying={agentPrivateKeyCopying}
        onCopy={handleCopyAgentPrivateKey}
        onClose={() => setExportPrivateKeyOpen(false)}
      />
      <ConnectChatGPTModal
        open={chatgptModalOpen}
        onClose={() => setChatgptModalOpen(false)}
        authUrl={chatgptAuthUrl}
        redirectUrl={chatgptRedirectUrl}
        onRedirectChange={setChatgptRedirectUrl}
        authLoading={chatgptAuthLoading}
        enableLoading={chatgptEnableLoading}
        error={chatgptError}
        onRefreshLink={() => {
          if (chatgptTarget) {
            return fetchChatgptAuthUrl(chatgptTarget);
          }
          return undefined;
        }}
        onEnable={enableChatgpt}
      />
    </div>

  );
}
