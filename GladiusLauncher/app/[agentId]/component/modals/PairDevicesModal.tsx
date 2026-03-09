'use client';

import { Globe, MessageCircle, Send } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { Claw } from '../types';
import type {
  DevicePairingEntry,
  DiscordPairedUser,
  DiscordPairingRequest,
  PairedUser,
  PairingRequest
} from '../types';

type PairDevicesModalProps = {
  pairingTarget: Claw | null;
  pairingView: 'telegram' | 'gateway' | 'discord' | null;
  onSetPairingView: (view: 'telegram' | 'gateway' | 'discord' | null) => void;
  pairingError: string;
  pairingLoading: boolean;
  pairingRequests: PairingRequest[];
  pairedUsers: PairedUser[];
  toggleElevated: (telegramUserId: string, elevated: boolean) => void | Promise<void>;
  elevatedUpdating: Record<string, boolean>;
  telegramTokenSet: boolean;
  telegramBotToken: string;
  onTelegramBotTokenChange: (value: string) => void;
  telegramTokenError: string;
  onSaveTelegramToken: () => void | Promise<void>;
  discordTokenSet: boolean;
  discordBotToken: string;
  onDiscordBotTokenChange: (value: string) => void;
  discordTokenError: string;
  onSaveDiscordToken: () => void | Promise<void>;
  discordPairingError: string;
  discordPairingLoading: boolean;
  discordPairingRequests: DiscordPairingRequest[];
  discordPairedUsers: DiscordPairedUser[];
  onApproveDiscordPairing: (code: string) => void | Promise<void>;
  onToggleDiscordElevated: (discordUserId: string, elevated: boolean) => void | Promise<void>;
  discordDmPolicy: string;
  onDiscordDmPolicyChange: (value: string) => void;
  discordGroupPolicy: string;
  onDiscordGroupPolicyChange: (value: string) => void;
  discordGuildsJson: string;
  onDiscordGuildsJsonChange: (value: string) => void;
  onSaveDiscordConfig: () => void | Promise<void>;
  discordConfigError: string;
  discordConfigSaving: boolean;
  tokenChecking: boolean;
  devicePairingError: string;
  devicePairingLoading: boolean;
  devicePairingRequests: DevicePairingEntry[];
  pairedDevices: DevicePairingEntry[];
  onApproveDevicePairing: (requestId?: string | null) => void | Promise<void>;
  formatDeviceId: (value?: string | null) => string;
  onApprovePairing: (code: string) => void | Promise<void>;
  onClose: () => void;
};

export function PairDevicesModal({
  pairingTarget,
  pairingView,
  onSetPairingView,
  pairingError,
  pairingLoading,
  pairingRequests,
  pairedUsers,
  toggleElevated,
  elevatedUpdating,
  telegramTokenSet,
  telegramBotToken,
  onTelegramBotTokenChange,
  telegramTokenError,
  onSaveTelegramToken,
  discordTokenSet,
  discordBotToken,
  onDiscordBotTokenChange,
  discordTokenError,
  onSaveDiscordToken,
  discordPairingError,
  discordPairingLoading,
  discordPairingRequests,
  discordPairedUsers,
  onApproveDiscordPairing,
  onToggleDiscordElevated,
  discordDmPolicy,
  onDiscordDmPolicyChange,
  discordGroupPolicy,
  onDiscordGroupPolicyChange,
  discordGuildsJson,
  onDiscordGuildsJsonChange,
  onSaveDiscordConfig,
  discordConfigError,
  discordConfigSaving,
  tokenChecking,
  devicePairingError,
  devicePairingLoading,
  devicePairingRequests,
  pairedDevices,
  onApproveDevicePairing,
  formatDeviceId,
  onApprovePairing,
  onClose
}: PairDevicesModalProps) {
  if (!pairingTarget) return null;

  const formatDeviceLabel = (
    label: string | null | undefined,
    fallbackId: string | null | undefined,
    fallbackText: string
  ) => {
    if (label) {
      const trimmed = String(label);
      if (trimmed.length > 12 && !trimmed.includes(' ')) {
        return formatDeviceId(trimmed);
      }
      return trimmed;
    }
    if (fallbackId) return formatDeviceId(fallbackId);
    return fallbackText;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl border border-amber-500/20 bg-[#0b0f0d] p-6 text-white shadow-xl">
        <h3 className="text-lg font-semibold">Pair Devices</h3>
        <p className="mt-2 text-sm text-white/60">Which device you want to pair?</p>

        <div className="mt-4 space-y-4">
          {!pairingView ? (
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-14 w-full justify-center gap-2 border-white/10 bg-white/5 text-base text-white hover:bg-white/10"
                onClick={() => onSetPairingView('telegram')}
              >
                <Send className="h-4 w-4" /> Telegram
              </Button>
              <Button
                variant="outline"
                className="h-14 w-full justify-center gap-2 border-white/10 bg-white/5 text-base text-white hover:bg-white/10"
                onClick={() => onSetPairingView('discord')}
              >
                <MessageCircle className="h-4 w-4" /> Discord
              </Button>
              <Button
                variant="outline"
                className="h-14 w-full justify-center gap-2 border-white/10 bg-white/5 text-base text-white hover:bg-white/10"
                onClick={() => onSetPairingView('gateway')}
              >
                <Globe className="h-4 w-4" /> Gateway
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white"
                onClick={() => onSetPairingView(null)}
              >
                Back
              </Button>
            </div>
          )}

          {pairingView === 'telegram' ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Telegram pairing</h4>
                {!pairingLoading ? (
                  <p className="text-xs text-white/60">
                    Add your bot token once, then message the bot and approve the pairing
                    code.
                  </p>
                ) : null}
              </div>

              {pairingError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {pairingError}
                </div>
              ) : null}

              {!telegramTokenSet ? (
                <div className="space-y-3 rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="space-y-1 text-xs text-white/60">
                    <p>1. Open Telegram BotFather and run /newbot.</p>
                    <p>2. Copy the bot token it gives you.</p>
                    <p>3. Paste it here to enable pairing.</p>
                  </div>
                  <Input
                    placeholder="123456:ABC-DEF..."
                    value={telegramBotToken}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      onTelegramBotTokenChange(event.target.value)
                    }
                    className="border-white/10 bg-white/5 text-white placeholder-white/40"
                  />
                  {telegramTokenError ? (
                    <p className="text-xs text-destructive">{telegramTokenError}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={onSaveTelegramToken}
                      disabled={!telegramBotToken.trim() || tokenChecking}
                      loading={tokenChecking}
                    >
                      Save Token
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                {pairingLoading ? (
                  <div className="flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                  </div>
                ) : !telegramTokenSet ? (
                  <p className="text-sm text-white/60">
                    Add your bot token to see pairing requests.
                  </p>
                ) : pairingRequests.length > 0 ? (
                  pairingRequests.map((req) => (
                    <div
                      key={req.code}
                      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {req.meta?.username || req.telegramUserId || 'Pending user'}
                        </p>
                        {req.telegramUserId ? (
                          <p className="text-xs text-white/60">{req.telegramUserId}</p>
                        ) : null}
                        <p className="text-xs font-mono text-white/60">{req.code}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => onApprovePairing(req.code)}
                      >
                        Approve
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/60">No pending pairing codes.</p>
                )}
              </div>

              <div className="border-t border-white/10 pt-3">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Paired users
                </h5>
                <p className="text-xs text-white/60">
                  Grant elevated access to let a paired user run host actions.
                </p>
                <div className="mt-3 space-y-2">
                  {pairingLoading ? (
                    <div className="flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-6">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                    </div>
                  ) : pairedUsers.length > 0 ? (
                    pairedUsers.map((entry) => (
                      <div
                        key={entry.telegramUserId}
                        className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {entry.meta?.username || entry.telegramUserId}
                          </p>
                          {entry.meta?.firstName || entry.meta?.lastName ? (
                            <p className="text-xs text-white/60">
                              {[entry.meta?.firstName, entry.meta?.lastName]
                                .filter(Boolean)
                                .join(' ')}
                            </p>
                          ) : null}
                          <p className="text-xs text-white/60">{entry.telegramUserId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.elevated ? (
                            <Badge className="border-amber-400/40 bg-amber-500/10 text-amber-50">
                              Elevated
                            </Badge>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() =>
                              toggleElevated(entry.telegramUserId, !entry.elevated)
                            }
                            disabled={elevatedUpdating[entry.telegramUserId]}
                          >
                            {entry.elevated ? 'Revoke' : 'Grant'}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/60">No paired users yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {pairingView === 'discord' ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Discord pairing</h4>
                {!discordPairingLoading ? (
                  <p className="text-xs text-white/60">
                    Add your bot token once, then DM the bot to generate a pairing
                    code.
                  </p>
                ) : null}
              </div>

              {discordPairingError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {discordPairingError}
                </div>
              ) : null}

              {discordPairingLoading ? (
                <div className="flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                </div>
              ) : !discordTokenSet ? (
                <div className="space-y-3 rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="space-y-1 text-xs text-white/60">
                    <p>1. Create a Discord bot in the Developer Portal.</p>
                    <p>2. Enable Message Content + Server Members intents.</p>
                    <p>3. Invite the bot to your server and paste the token here.</p>
                  </div>
                  <Input
                    placeholder="Discord bot token"
                    value={discordBotToken}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onDiscordBotTokenChange(event.target.value)
                    }
                    className="border-white/10 bg-white/5 text-white placeholder-white/40"
                  />
                  {discordTokenError ? (
                    <p className="text-xs text-destructive">{discordTokenError}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={onSaveDiscordToken}
                      disabled={!discordBotToken.trim() || tokenChecking}
                      loading={tokenChecking}
                    >
                      Save Token
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {discordPairingRequests.length > 0 ? (
                      discordPairingRequests.map((req) => (
                        <div
                          key={req.code}
                          className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">
                              {req.meta?.username || req.discordUserId || 'Pending user'}
                            </p>
                            {req.discordUserId ? (
                              <p className="text-xs text-white/60">{req.discordUserId}</p>
                            ) : null}
                            <p className="text-xs font-mono text-white/60">{req.code}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => onApproveDiscordPairing(req.code)}
                          >
                            Approve
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">No pending pairing codes.</p>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Paired users
                    </h5>
                    <p className="text-xs text-white/60">
                      Grant elevated access to let a paired user run host actions.
                    </p>
                    <div className="mt-3 space-y-2">
                      {discordPairingLoading ? (
                        <p className="text-sm text-white/60">Loading users…</p>
                      ) : discordPairedUsers.length > 0 ? (
                        discordPairedUsers.map((entry) => (
                          <div
                            key={entry.discordUserId}
                            className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">
                                {entry.meta?.username || entry.discordUserId}
                              </p>
                              {entry.meta?.firstName || entry.meta?.lastName ? (
                                <p className="text-xs text-white/60">
                                  {[entry.meta?.firstName, entry.meta?.lastName]
                                    .filter(Boolean)
                                    .join(' ')}
                                </p>
                              ) : null}
                              <p className="text-xs text-white/60">
                                {entry.discordUserId}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {entry.elevated ? (
                                <Badge className="border-amber-400/40 bg-amber-500/10 text-amber-50">
                                  Elevated
                                </Badge>
                              ) : null}
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                                onClick={() =>
                                  onToggleDiscordElevated(
                                    entry.discordUserId,
                                    !entry.elevated
                                  )
                                }
                                disabled={elevatedUpdating[entry.discordUserId]}
                              >
                                {entry.elevated ? 'Revoke' : 'Grant'}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-white/60">No paired users yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 space-y-3">
                    <div className="space-y-1">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-white/60">
                        Discord access controls
                      </h5>
                      <p className="text-xs text-white/60">
                        Configure DM + guild policies and allowlisted guilds.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/70">DM policy</label>
                      <select
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-xs"
                        value={discordDmPolicy || 'pairing'}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          onDiscordDmPolicyChange(event.target.value)
                        }
                      >
                        <option value="pairing" className="bg-white text-black">
                          pairing
                        </option>
                        <option value="allowlist" className="bg-white text-black">
                          allowlist
                        </option>
                        <option value="open" className="bg-white text-black">
                          open
                        </option>
                        <option value="disabled" className="bg-white text-black">
                          disabled
                        </option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/70">Guild policy</label>
                      <select
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-xs"
                        value={discordGroupPolicy || 'allowlist'}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          onDiscordGroupPolicyChange(event.target.value)
                        }
                      >
                        <option value="allowlist" className="bg-white text-black">
                          allowlist
                        </option>
                        <option value="open" className="bg-white text-black">
                          open
                        </option>
                        <option value="disabled" className="bg-white text-black">
                          disabled
                        </option>
                      </select>
                    </div>
                    {discordGroupPolicy === 'allowlist' ? (
                      <div className="space-y-2">
                        <label className="text-xs text-white/70">
                          Guild allowlist (JSON)
                        </label>
                        <textarea
                          className="min-h-[120px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-white shadow-xs"
                          value={discordGuildsJson}
                          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                            onDiscordGuildsJsonChange(event.target.value)
                          }
                          placeholder='{"GUILD_ID": {"channels": {"CHANNEL_ID": {"allow": true}}}}'
                        />
                        <p className="text-[11px] text-white/50">
                          Example: {"{\"123\": {\"channels\": {\"456\": {\"allow\": true}}}}"}
                        </p>
                      </div>
                    ) : null}
                    {discordConfigError ? (
                      <p className="text-xs text-destructive">{discordConfigError}</p>
                    ) : null}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={onSaveDiscordConfig}
                        disabled={discordConfigSaving}
                        loading={discordConfigSaving}
                      >
                        Save Discord Settings
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {pairingView === 'gateway' ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Gateway pairing (Control UI)</h4>
                <p className="text-xs text-white/60">
                  Open the gateway UI and approve the device request here.
                </p>
              </div>

              {devicePairingError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {devicePairingError}
                </div>
              ) : null}

              {devicePairingLoading ? (
                <p className="text-sm text-white/60">Loading devices…</p>
              ) : devicePairingRequests.length > 0 ? (
                devicePairingRequests.map((req, index) => (
                  <div
                    key={req.requestId || req.deviceId || `device-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {formatDeviceLabel(req.label, req.deviceId, 'Pending device')}
                      </p>
                      {req.deviceId ? (
                        <p className="text-xs text-white/60" title={req.deviceId}>
                          {formatDeviceId(req.deviceId)}
                        </p>
                      ) : null}
                      {req.role ? (
                        <p className="text-xs text-white/60">Role: {req.role}</p>
                      ) : null}
                      {req.requestId ? (
                        <p className="text-xs font-mono text-white/60" title={req.requestId}>
                          {formatDeviceId(req.requestId)}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => onApproveDevicePairing(req.requestId)}
                      disabled={!req.requestId}
                    >
                      Approve
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/60">
                  No pending device requests. Open the gateway UI to generate one.
                </p>
              )}

              <div className="border-t border-white/10 pt-3">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Paired devices
                </h5>
                <div className="mt-2 space-y-2">
                  {devicePairingLoading ? (
                    <p className="text-sm text-white/60">Loading devices…</p>
                  ) : pairedDevices.length > 0 ? (
                    pairedDevices.map((entry, index) => (
                      <div
                        key={entry.deviceId || entry.requestId || `paired-${index}`}
                        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      >
                        <p className="text-sm font-semibold">
                          {formatDeviceLabel(entry.label, entry.deviceId, 'Device')}
                        </p>
                        {entry.deviceId ? (
                          <p className="text-xs text-white/60" title={entry.deviceId}>
                            {formatDeviceId(entry.deviceId)}
                          </p>
                        ) : null}
                        {entry.role ? (
                          <p className="text-xs text-white/60">Role: {entry.role}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/60">No paired devices yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
