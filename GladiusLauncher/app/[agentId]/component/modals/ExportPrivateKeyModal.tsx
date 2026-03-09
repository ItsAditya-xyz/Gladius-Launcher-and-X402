'use client';

import { Button } from '../../../../components/ui/button';

type ExportPrivateKeyModalProps = {
  open: boolean;
  agentName: string;
  agentWalletAddress: string;
  copiedId: string | null;
  copyId: string;
  copying: boolean;
  onCopy: () => void | Promise<void>;
  onClose: () => void;
};

export function ExportPrivateKeyModal({
  open,
  agentName,
  agentWalletAddress,
  copiedId,
  copyId,
  copying,
  onCopy,
  onClose
}: ExportPrivateKeyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f111a] p-6 text-white shadow-xl">
        <h3 className="text-lg font-semibold">Export Private Key</h3>
        <p className="mt-2 text-sm text-white/70">
          This is the agent wallet controlled by {agentName}. Only export this if you
          understand the risks.
        </p>
        <p className="mt-3 text-sm text-white/70">
          Never share this key anywhere. Store it securely.
        </p>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-white/50">
            Agent Wallet
          </p>
          <p className="mt-1 truncate text-xs text-white/70">
            {agentWalletAddress || 'Address unavailable'}
          </p>
          <p className="mt-3 text-xs text-white/70">Private key (redacted)</p>
          <div className="mt-1 font-mono text-xs tracking-wider text-white/60">
            ••••••••••••••••••••••••••••••••••••••••
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={copying}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={onCopy}
            disabled={copying || !agentWalletAddress}
          >
            {copiedId === copyId ? 'Copied' : copying ? 'Copying…' : 'Copy Private Key'}
          </Button>
        </div>
      </div>
    </div>
  );
}
