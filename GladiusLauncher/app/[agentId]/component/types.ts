export type ModelOption = {
  id: string;
  label: string;
};

export type Claw = {
  id: string;
  subdomain?: string | null;
  status?: string | null;
  proxy_provider?: string | null;
  model_id?: string | null;
  image_model_id?: string | null;
  gateway_url?: string | null;
  public_ip?: string | null;
  health_ok?: boolean | null;
  ai_credit_cents?: number | null;
  ai_spend_cents?: number | null;
  ai_spend_micros?: number | null;
  plan_id?: string | null;
  plan_price_cents?: number | null;
  grace_period?: boolean | null;
  created_at?: string | null;
  username?: string | null;
  instance_id?: string | null;
  openrouter_key_label?: string | null;
};

export type ArenaAgent = {
  id: string;
  name?: string | null;
  handle_final?: string | null;
  pfp_url?: string | null;
  status?: string | null;
  provision_status?: string | null;
  pair?: string | null;
  token_address?: string | null;
  token_symbol?: string | null;
  agent_wallet_address?: string | null;
  vault_address?: string | null;
  claw_id?: string | null;
  error_message?: string | null;
  verification_code?: string | null;
  initial_buy_enabled?: boolean | null;
  initial_buy_spend?: string | null;
  initial_buy_spend_wei?: string | null;
  initial_buy_cost_wei?: string | null;
};

export type BalanceRow = {
  available_cents?: number | null;
  reserved_cents?: number | null;
};

export type Transaction = {
  id: string;
  type?: string | null;
  amount_cents: number;
  created_at?: string | null;
};

export type ActionItem = {
  actionName: string;
  icon?: string | null;
  title: string;
  description?: string | null;
};

export type LogRow = {
  id: string;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_micros?: number | null;
  cost_cents?: number | null;
  created_at?: string | null;
};

export type GmailStatus = {
  connected: boolean;
  email?: string | null;
  can_read?: boolean | null;
  can_send?: boolean | null;
};

export type PlanId = 'starter' | 'pro';

export type PlanOption = {
  id: PlanId;
  name: string;
  specs: string;
  price: number;
  originalPrice?: number;
  billing: string;
  details: string[];
};

export type PairingMeta = {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type PairingRequest = {
  code: string;
  telegramUserId?: string | null;
  meta?: PairingMeta | null;
};

export type PairedUser = {
  telegramUserId: string;
  elevated?: boolean | null;
  meta?: PairingMeta | null;
};

export type DiscordPairingRequest = {
  code: string;
  discordUserId?: string | null;
  meta?: PairingMeta | null;
};

export type DiscordPairedUser = {
  discordUserId: string;
  elevated?: boolean | null;
  meta?: PairingMeta | null;
};

export type DevicePairingEntry = {
  requestId?: string | null;
  deviceId?: string | null;
  label?: string | null;
  role?: string | null;
  status?: string | null;
  requestedAt?: string | null;
  pairedAt?: string | null;
  meta?: Record<string, unknown> | null;
};
