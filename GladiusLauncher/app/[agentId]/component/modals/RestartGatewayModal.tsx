'use client';

import { Button } from '../../../../components/ui/button';
import type { Claw } from '../types';

type RestartGatewayModalProps = {
  restartTarget: Claw | null;
  gatewayRestarting: Record<string, boolean>;
  onClose: () => void;
  onConfirm: () => void;
};

export function RestartGatewayModal({
  restartTarget,
  gatewayRestarting,
  onClose,
  onConfirm
}: RestartGatewayModalProps) {
  if (!restartTarget) return null;
  const restarting = gatewayRestarting[restartTarget.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f111a] p-6 text-white shadow-xl">
        <h3 className="text-lg font-semibold">Restart this gateway?</h3>
        <p className="mt-2 text-sm text-white/60">
          This restarts the OpenClaw gateway for{' '}
          <span className="text-white">{restartTarget.subdomain}</span>. Existing
          sessions may disconnect briefly.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={restarting}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onConfirm} disabled={restarting}>
            {restarting ? 'Restarting…' : 'Restart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
