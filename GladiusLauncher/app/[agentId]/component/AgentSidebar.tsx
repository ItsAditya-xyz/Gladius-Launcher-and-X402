import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  Copy,
  LayoutGrid,
  Send
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Button } from '../../../components/ui/button';
import type { ArenaAgent, Claw, ModelOption } from './types';

type AgentSidebarProps = {
  agent: ArenaAgent | null;
  agentName: string;
  agentInitials: string;
  agentHandle: string;
  agentLoading: boolean;
  agentError: string;
  statusLabel: string;
  isAdmin: boolean;
  selectedClaw: Claw | null;
  selectedClawReady: boolean;
  isChatgptProvider: boolean;
  onConnectChatgpt: (claw: Claw) => void | Promise<void>;
  onDisconnectChatgpt: (claw: Claw) => void | Promise<void>;
  chatgptDisconnecting: boolean;
  selectedModelOptions: ModelOption[];
  selectedImageModelOptions: ModelOption[];
  selectedModelValue: string;
  selectedImageModelValue: string;
  selectedModelSaving: boolean;
  selectedImageModelSaving: boolean;
  selectedOpenGatewayUrl: string;
  selectedGatewayToken: string;
  selectedGatewayCopyId: string;
  agentTokenUrl: string;
  agentWalletAddress: string;
  agentWalletCopyId: string;
  agentWalletPrivateKeyCopying: boolean;
  copiedId: string | null;
  pairingLoading: boolean;
  devicePairingLoading: boolean;
  onCopy: (text: string, id: string) => void | Promise<void>;
  onExportPrivateKey: () => void | Promise<void>;
  onPairDevices: (claw: Claw) => void | Promise<void>;
  onModelChange: (clawId: string, nextModel: string) => void;
  onImageModelChange: (clawId: string, nextModel: string) => void;
  onSaveModel: (claw: Claw, nextModelOverride?: string) => void | Promise<void>;
  onSaveImageModel: (claw: Claw, nextModelOverride?: string) => void | Promise<void>;
};

export function AgentSidebar({
  agent,
  agentName,
  agentInitials,
  agentHandle,
  agentLoading,
  agentError,
  statusLabel,
  isAdmin,
  selectedClaw,
  selectedClawReady,
  isChatgptProvider,
  onConnectChatgpt,
  onDisconnectChatgpt,
  chatgptDisconnecting,
  selectedModelOptions,
  selectedImageModelOptions,
  selectedModelValue,
  selectedImageModelValue,
  selectedModelSaving,
  selectedImageModelSaving,
  selectedOpenGatewayUrl,
  selectedGatewayToken,
  selectedGatewayCopyId,
  agentTokenUrl,
  agentWalletAddress,
  agentWalletCopyId,
  agentWalletPrivateKeyCopying,
  copiedId,
  pairingLoading,
  devicePairingLoading,
  onCopy,
  onExportPrivateKey,
  onPairDevices,
  onModelChange,
  onImageModelChange,
  onSaveModel,
  onSaveImageModel
}: AgentSidebarProps) {
  return (
    <aside className="hidden lg:flex h-full w-72 flex-col border-r border-white/10 bg-white/5 text-white/80 backdrop-blur">
      <div className="flex items-center border-b border-white/10 px-4 py-3 lg:py-4 min-h-[64px]">
        <div className="flex w-full items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white">
            {agent?.pfp_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={agent.pfp_url}
                  alt={agentName}
                  className="h-full w-full object-cover"
                />
              </>
            ) : (
              <span>{agentInitials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{agentName}</p>
            <p className="truncate text-xs text-white/60">
              {agentHandle || (agentLoading ? 'Loading agent...' : 'Arena agent')}
            </p>
            {agentError ? (
              <p className="mt-1 text-[10px] text-red-300">{agentError}</p>
            ) : agent ? (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-white/50">
                {statusLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <nav className="space-y-1 px-3 py-4 text-sm">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-white bg-white/10"
          >
            <LayoutGrid className="h-4 w-4" /> Claws
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-white/70 hover:text-white hover:bg-white/10"
            >
              <LayoutGrid className="h-4 w-4" /> Admin
            </Link>
          ) : null}
          <a
            href="https://t.me/+ThHPHKW1rvE1YTFl"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            <Send className="h-4 w-4" /> Support
          </a>
        </nav>
        <div className="px-3 pb-4 space-y-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Models</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {isChatgptProvider ? (
                <>
                  <span className="text-xs text-emerald-300/90">ChatGPT connected</span>
                  <Button
                    variant="destructive"
                    className="shadow-xs"
                    size="sm"
                    onClick={() => selectedClaw && onDisconnectChatgpt(selectedClaw)}
                    disabled={!selectedClaw || !selectedClawReady || chatgptDisconnecting}
                  >
                    Disconnect ChatGPT
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  size="sm"
                  onClick={() => selectedClaw && onConnectChatgpt(selectedClaw)}
                  disabled={!selectedClaw || !selectedClawReady}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/chatgpt.webp" alt="ChatGPT" className="h-4 w-4 rounded-sm" />
                  Connect ChatGPT
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/70">Text</label>
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-xs focus-visible:border-white/30 focus-visible:ring-white/20 focus-visible:ring-[3px]"
                value={selectedModelOptions.length ? selectedModelValue : ''}
                disabled={
                  !selectedClaw ||
                  !selectedClawReady ||
                  isChatgptProvider ||
                  selectedModelOptions.length === 0 ||
                  selectedModelSaving
                }
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  if (!selectedClaw) return;
                  const nextValue = event.target.value;
                  onModelChange(selectedClaw.id, nextValue);
                  onSaveModel(selectedClaw, nextValue);
                }}
              >
                {selectedModelOptions.length === 0 ? (
                  <option value="" disabled className="bg-white text-black">
                    Loading models...
                  </option>
                ) : (
                  selectedModelOptions.map((option) => (
                    <option key={option.id} value={option.id} className="bg-white text-black">
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/70">Image</label>
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-xs focus-visible:border-white/30 focus-visible:ring-white/20 focus-visible:ring-[3px]"
                value={selectedImageModelOptions.length ? selectedImageModelValue : ''}
                disabled={
                  !selectedClaw ||
                  !selectedClawReady ||
                  selectedImageModelOptions.length === 0 ||
                  selectedImageModelSaving
                }
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  if (!selectedClaw) return;
                  const nextValue = event.target.value;
                  onImageModelChange(selectedClaw.id, nextValue);
                  onSaveImageModel(selectedClaw, nextValue);
                }}
              >
                {selectedImageModelOptions.length === 0 ? (
                  <option value="" disabled className="bg-white text-black">
                    Loading image models...
                  </option>
                ) : (
                  selectedImageModelOptions.map((option) => (
                    <option key={option.id} value={option.id} className="bg-white text-black">
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Gateway</p>
            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() =>
                selectedOpenGatewayUrl &&
                window.open(selectedOpenGatewayUrl, '_blank', 'noopener,noreferrer')
              }
              disabled={!selectedClaw || !selectedClawReady || !selectedOpenGatewayUrl}
            >
              Open Gateway <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => onCopy(selectedGatewayToken, selectedGatewayCopyId)}
              disabled={!selectedGatewayToken}
            >
              {copiedId === selectedGatewayCopyId ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Token
                </>
              )}
            </Button>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-white/50">Arena</p>
            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() =>
                agentTokenUrl &&
                window.open(agentTokenUrl, '_blank', 'noopener,noreferrer')
              }
              disabled={!agentTokenUrl}
            >
              View Token <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => onCopy(agentWalletAddress, agentWalletCopyId)}
              disabled={!agentWalletAddress}
            >
              {copiedId === agentWalletCopyId ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Agent Address
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={onExportPrivateKey}
              disabled={agentWalletPrivateKeyCopying || !agentWalletAddress}
            >
              <Copy className="h-4 w-4" /> Export Private Key
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => selectedClaw && onPairDevices(selectedClaw)}
            disabled={
              !selectedClaw ||
              !selectedClawReady ||
              pairingLoading ||
              devicePairingLoading
            }
            loading={pairingLoading || devicePairingLoading}
          >
            <Send className="h-4 w-4" /> Pair Devices
          </Button>
        </div>
      </div>
      <div className="border-t border-white/10" />
    </aside>
  );
}
