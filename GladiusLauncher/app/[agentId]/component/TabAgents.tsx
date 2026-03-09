import { ArrowUpRight, Check, Copy, Send } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import type { Claw, ModelOption } from './types';

type TabAgentsProps = {
  mobileTab: string;
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
  selectedGatewayUri: string;
  selectedOpenGatewayUrl: string;
  selectedGatewayToken: string;
  selectedGatewayCopyId: string;
  copiedId: string | null;
  pairingLoading: boolean;
  devicePairingLoading: boolean;
  onCopy: (text: string, id: string) => void | Promise<void>;
  onPairDevices: (claw: Claw) => void | Promise<void>;
  onModelChange: (clawId: string, nextModel: string) => void;
  onImageModelChange: (clawId: string, nextModel: string) => void;
  onSaveModel: (claw: Claw, nextModelOverride?: string) => void | Promise<void>;
  onSaveImageModel: (claw: Claw, nextModelOverride?: string) => void | Promise<void>;
};

export function TabAgents({
  mobileTab,
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
  selectedGatewayUri,
  selectedOpenGatewayUrl,
  selectedGatewayToken,
  selectedGatewayCopyId,
  copiedId,
  pairingLoading,
  devicePairingLoading,
  onCopy,
  onPairDevices,
  onModelChange,
  onImageModelChange,
  onSaveModel,
  onSaveImageModel
}: TabAgentsProps) {
  return (
    <Card
      className={`rounded-none lg:rounded-2xl border-white/10 bg-white/5 ${
        mobileTab === 'agents' ? 'block' : 'hidden'
      } lg:hidden`}
    >
      <CardHeader>
        <CardTitle className="text-white">Agents</CardTitle>
        <p className="text-sm text-white/60">
          Manage models, gateway access, and pairing for this Claw.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedClaw ? (
          <>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
              <p className="text-xs uppercase tracking-wide text-white/50">Models</p>
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
              <div className="space-y-2">
                <label className="text-xs text-white/70">Text model</label>
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
              <div className="space-y-2">
                <label className="text-xs text-white/70">Image model</label>
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
              <p className="text-xs uppercase tracking-wide text-white/50">Gateway</p>
              <div className="space-y-2">
                <label className="text-xs text-white/70">URI</label>
                <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 break-all">
                  {selectedGatewayUri || '—'}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() =>
                  selectedOpenGatewayUrl &&
                  window.open(selectedOpenGatewayUrl, '_blank', 'noopener,noreferrer')
                }
                disabled={!selectedClawReady || !selectedOpenGatewayUrl}
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
            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => selectedClaw && onPairDevices(selectedClaw)}
              disabled={!selectedClawReady || pairingLoading || devicePairingLoading}
              loading={pairingLoading || devicePairingLoading}
            >
              <Send className="h-4 w-4" /> Pair Devices
            </Button>
          </>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/60">
            Select a Claw to manage models, gateway access, and pairing.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
