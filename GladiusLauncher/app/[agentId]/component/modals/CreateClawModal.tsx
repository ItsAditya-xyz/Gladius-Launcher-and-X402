'use client';

import { Check, ChevronDown, Copy } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { BalanceRow, ModelOption, PlanId, PlanOption } from '../types';

type CreateClawModalProps = {
  createOpen: boolean;
  createStep: number;
  onClose: () => void;
  onBack: () => void;
  username: string;
  onUsernameChange: (value: string) => void;
  nameChecking: boolean;
  onUsernameContinue: () => void | Promise<void>;
  planOptions: PlanOption[];
  planId: PlanId;
  onPlanChange: (value: PlanId) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  createModelOptions: ModelOption[];
  modelId: string;
  onModelChange: (value: string) => void;
  createImageModelOptions: ModelOption[];
  imageModelId: string;
  onImageModelChange: (value: string) => void;
  onPlanContinue: () => void;
  balance: BalanceRow | null;
  planPricing: Record<string, number>;
  paymentAddress: string;
  copiedId: string | null;
  onCopyAddress: () => void;
  balanceRefreshing: boolean;
  onRefreshBalance: () => void;
  provisioning: boolean;
  onCreate: () => void | Promise<void>;
  error: string;
};

export function CreateClawModal({
  createOpen,
  createStep,
  onClose,
  onBack,
  username,
  onUsernameChange,
  nameChecking,
  onUsernameContinue,
  planOptions,
  planId,
  onPlanChange,
  advancedOpen,
  onToggleAdvanced,
  createModelOptions,
  modelId,
  onModelChange,
  createImageModelOptions,
  imageModelId,
  onImageModelChange,
  onPlanContinue,
  balance,
  planPricing,
  paymentAddress,
  copiedId,
  onCopyAddress,
  balanceRefreshing,
  onRefreshBalance,
  provisioning,
  onCreate,
  error
}: CreateClawModalProps) {
  if (!createOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f111a] p-6 text-white shadow-xl">
        <h3 className="text-lg font-semibold">Create a Claw</h3>

        <div className="mt-5 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-white/60">
                Step {createStep} of 3
              </p>
              <div className="flex items-center gap-2">
                {createStep > 1 ? (
                  <Button variant="ghost" size="sm" onClick={onBack}>
                    Back
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>

            {createStep === 1 ? (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-white/60">
                  Username (letters only)
                </label>
                <Input
                  placeholder="alice"
                  value={username}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onUsernameChange(event.target.value)
                  }
                />
                <p className="text-xs text-white/60">
                  Creates <span className="text-white">username.clawkai.com</span>.
                </p>
                <div className="flex justify-end">
                  <Button
                    onClick={onUsernameContinue}
                    disabled={!username.trim() || nameChecking}
                    loading={nameChecking}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}

            {createStep === 2 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-white/60">
                    Plan
                  </label>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden">
                    {planOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onPlanChange(option.id)}
                        className={`min-w-[180px] rounded-md border px-4 py-3 text-left text-sm ${
                          planId === option.id
                            ? 'border-white/30 bg-white/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/80'
                        }`}
                      >
                        <p className="text-sm font-semibold">{option.name}</p>
                        <p className="mt-1 text-xs text-white/60">{option.specs}</p>
                        <div className="mt-2 text-sm font-semibold">
                          <span className="text-emerald-400">
                            {option.price}$
                            <span className="text-xs">/{option.billing}</span>
                          </span>
                          {option.originalPrice && option.originalPrice !== option.price ? (
                            <span className="ml-2 text-xs text-red-400 line-through">
                              {option.originalPrice}$
                            </span>
                          ) : null}
                        </div>
                        {option.originalPrice && option.originalPrice !== option.price ? (
                          <p className="mt-1 text-xs text-emerald-300/90">
                            {Math.round(
                              ((option.originalPrice - option.price) / option.originalPrice) *
                                100
                            )}
                            % Off
                          </p>
                        ) : null}
                        <ul className="mt-2 space-y-1 text-xs text-white/60">
                          {option.details?.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleAdvanced}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <span>Advanced</span>
                  <span className="flex items-center gap-2 text-xs text-white/60">
                    {advancedOpen ? 'Collapse' : 'Expand'}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        advancedOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>
                {advancedOpen ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-white/60">
                        Default Model
                      </label>
                      <select
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                        value={createModelOptions.length ? modelId : ''}
                        onChange={(event) => onModelChange(event.target.value)}
                        disabled={createModelOptions.length === 0}
                      >
                        {createModelOptions.length === 0 ? (
                          <option value="" disabled>
                            Loading models...
                          </option>
                        ) : (
                          createModelOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-white/60">
                        Image Model
                      </label>
                      <select
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                        value={createImageModelOptions.length ? imageModelId : ''}
                        onChange={(event) => onImageModelChange(event.target.value)}
                        disabled={createImageModelOptions.length === 0}
                      >
                        {createImageModelOptions.length === 0 ? (
                          <option value="" disabled>
                            Loading models...
                          </option>
                        ) : (
                          createImageModelOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button onClick={onPlanContinue}>Continue</Button>
                </div>
              </div>
            ) : null}

            {createStep === 3 ? (
              <div className="space-y-3">
                {(balance?.available_cents ?? 0) >= (planPricing[planId] ?? 0) ? (
                  <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm">
                    <p className="font-medium">You are ready to create your OpenClaw Assistant!</p>
                    <p className="text-xs text-white/60">
                      Balance is sufficient for this plan.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs break-all">
                      {paymentAddress || 'Fetching deposit address...'}
                    </div>
                    <Button variant="outline" onClick={onCopyAddress} disabled={!paymentAddress}>
                      {copiedId === 'payment-address' ? (
                        <>
                          <Check className="h-4 w-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copy Address
                        </>
                      )}
                    </Button>
                    <div className="flex items-center justify-between text-sm">
                      <span>Available balance</span>
                      <span className="font-semibold">
                        ${((balance?.available_cents ?? 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={onRefreshBalance}
                      disabled={balanceRefreshing}
                      loading={balanceRefreshing}
                    >
                      Reload balance
                    </Button>
                  </>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={onCreate}
                    disabled={
                      provisioning ||
                      !username.trim() ||
                      (balance?.available_cents ?? 0) < (planPricing[planId] ?? 0)
                    }
                    loading={provisioning}
                  >
                    Create My Assistant
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
