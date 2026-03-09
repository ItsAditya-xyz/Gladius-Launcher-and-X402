'use client';

import { Check, Copy, Info } from 'lucide-react';
import { ethers } from 'ethers';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { supabase } from '../../../lib/supabaseClient';
import type { BalanceRow, Claw, Transaction } from './types';

type TokenBalance = {
  raw: bigint;
  decimals: number;
  formatted: string;
};

type TabBalanceProps = {
  mobileTab: string;
  showBalanceDesktop: boolean;
  agentId: string | null;
  agentTokenAddress?: string | null;
  agentTokenSymbol?: string | null;
  provisioningBase: string;
  vaultAddress: string | null;
  impersonationUserId?: string | null;
  selectedClaw: Claw | null;
  selectedClawRemainingMicros: number | null;
  formatUsdFromMicros: (value: number | string | null | undefined, decimals?: number) => string;
  formatClawLabel: (value: string | null | undefined) => string;
  getPlanLabel: (planIdValue: string | null | undefined) => string;
  formatDateShort: (value: string | number | Date | null | undefined) => string;
  creditDrafts: Record<string, string>;
  creditLoading: Record<string, boolean>;
  onCreditChange: (id: string, value: string) => void;
  onAddCredits: (claw: Claw) => void | Promise<void>;
  paymentLoading: boolean;
  paymentError: string;
  paymentAddress: string;
  balance: BalanceRow | null;
  onCopyAddress: () => void | Promise<void>;
  copiedId: string | null;
  transactions: Transaction[];
};

export function TabBalance({
  mobileTab,
  showBalanceDesktop,
  agentId,
  agentTokenAddress,
  agentTokenSymbol,
  provisioningBase,
  vaultAddress,
  impersonationUserId,
  selectedClaw,
  selectedClawRemainingMicros,
  formatUsdFromMicros,
  formatClawLabel,
  getPlanLabel,
  formatDateShort,
  creditDrafts,
  creditLoading,
  onCreditChange,
  onAddCredits,
  paymentLoading,
  paymentError,
  paymentAddress,
  balance,
  onCopyAddress,
  copiedId,
  transactions
}: TabBalanceProps) {
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimToAddress, setClaimToAddress] = useState('');
  const [claimTokenKey, setClaimTokenKey] = useState<
    'avax' | 'wavax' | 'arena' | 'gladius' | 'agent'
  >('avax');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState<{
    message: string;
    txHash?: string;
  } | null>(null);
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance | null>>(
    {}
  );
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState('');

  const avaxRpcUrl =
    process.env.NEXT_PUBLIC_AVAX_RPC_URL ||
    'https://avalanche-c-chain-rpc.publicnode.com';
  const wavaxTokenAddress = (
    process.env.NEXT_PUBLIC_WAVAX_ADDRESS || '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
  ).trim();
  const arenaTokenAddress = (process.env.NEXT_PUBLIC_ARENA_TOKEN_ADDRESS || '').trim();
  const gladiusTokenAddress = (process.env.NEXT_PUBLIC_GLADIUS_TOKEN_ADDRESS || '').trim();
  const agentTokenAddressValue = (agentTokenAddress || '').trim();
  const nativeTokenAddress = '0x0000000000000000000000000000000000000000';

  const tokenOptions = useMemo(
    () => [
      {
        key: 'avax' as const,
        label: 'AVAX',
        address: nativeTokenAddress,
        icon: '/icons/avax.png',
        configured: true,
        isNative: true
      },
      {
        key: 'wavax' as const,
        label: 'WAVAX',
        address: wavaxTokenAddress,
        icon: '/icons/avax.png',
        configured: ethers.isAddress(wavaxTokenAddress),
        isNative: false
      },
      {
        key: 'arena' as const,
        label: 'ARENA',
        address: arenaTokenAddress,
        icon: '/icons/arena.png',
        configured: ethers.isAddress(arenaTokenAddress),
        isNative: false
      },
      {
        key: 'agent' as const,
        label: agentTokenSymbol
          ? `Agent (${agentTokenSymbol.toUpperCase()})`
          : 'Agent Token',
        address: agentTokenAddressValue,
        icon: '/icons/arena.png',
        configured: ethers.isAddress(agentTokenAddressValue),
        isNative: false
      },
      {
        key: 'gladius' as const,
        label: 'GLADIUS',
        address: gladiusTokenAddress,
        icon: '/icons/GLADIUS.png',
        configured: ethers.isAddress(gladiusTokenAddress),
        isNative: false
      }
    ],
    [arenaTokenAddress, gladiusTokenAddress, wavaxTokenAddress, agentTokenAddressValue, agentTokenSymbol]
  );

  const formatTokenUnits = (value: bigint, decimals: number) => {
    const full = ethers.formatUnits(value, decimals);
    const [whole, frac] = full.split('.');
    if (!frac) return whole;
    return `${whole}.${frac.slice(0, 6)}`;
  };

  const loadTokenBalances = async () => {
    const vault = (vaultAddress || '').trim();
    if (!vault || !ethers.isAddress(vault)) {
      setBalancesError('Vault address not available.');
      setTokenBalances({});
      return;
    }
    setBalancesLoading(true);
    setBalancesError('');
    try {
      const provider = new ethers.JsonRpcProvider(avaxRpcUrl);
      const nextBalances: Record<string, TokenBalance | null> = {};

      const avaxBalance = await provider.getBalance(vault);
      nextBalances.avax = {
        raw: avaxBalance,
        decimals: 18,
        formatted: formatTokenUnits(avaxBalance, 18)
      };

      const erc20Abi = [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const erc20Tokens = tokenOptions.filter(
        (token) => !token.isNative && token.configured
      );

      await Promise.all(
        erc20Tokens.map(async (token) => {
          try {
            const contract = new ethers.Contract(token.address, erc20Abi, provider);
            const [balanceRaw, decimals] = await Promise.all([
              contract.balanceOf(vault),
              contract.decimals()
            ]);
            nextBalances[token.key] = {
              raw: balanceRaw,
              decimals,
              formatted: formatTokenUnits(balanceRaw, decimals)
            };
          } catch (error) {
            nextBalances[token.key] = null;
            console.error('[claim] failed to load token balance', token.key, error);
          }
        })
      );

      tokenOptions
        .filter((token) => !token.isNative && !token.configured)
        .forEach((token) => {
          nextBalances[token.key] = null;
        });

      setTokenBalances(nextBalances);
    } catch (error) {
      setBalancesError('Failed to load vault balances.');
      setTokenBalances({});
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (!claimOpen) return;
    loadTokenBalances();
  }, [claimOpen, vaultAddress]);

  useEffect(() => {
    if (claimOpen) return;
    setClaimError('');
    setClaimSuccess(null);
    setClaimLoading(false);
  }, [claimOpen]);

  const handleClaim = async () => {
    setClaimError('');
    setClaimSuccess(null);
    const vault = (vaultAddress || '').trim();
    if (!vault || !ethers.isAddress(vault)) {
      setClaimError('Vault address not available.');
      return;
    }
    const token = tokenOptions.find((option) => option.key === claimTokenKey);
    if (!token) {
      setClaimError('Select a token to claim.');
      return;
    }
    if (!token.configured) {
      setClaimError(`${token.label} token address is not configured.`);
      return;
    }
    const toAddress = claimToAddress.trim();
    if (!ethers.isAddress(toAddress)) {
      setClaimError('Enter a valid destination address.');
      return;
    }
    if (!provisioningBase) {
      setClaimError('Missing provisioning API base URL.');
      return;
    }
    if (!supabase) {
      setClaimError('Supabase is not configured.');
      return;
    }

    setClaimLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing auth session.');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Authorization': `Bearer ${accessToken}`
      };
      if (impersonationUserId) {
        headers['X-Impersonate-User'] = impersonationUserId;
      }
      const body: Record<string, string> = {
        wallet_address: toAddress,
        token_address: token.isNative ? nativeTokenAddress : token.address
      };
      if (agentId) {
        body.agent_id = agentId;
      }
      body.vault_address = vault;

      const response = await fetch(`${provisioningBase}/payments/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Claim request failed.');
      }
      if (payload?.tx_hash) {
        setClaimSuccess({ message: 'Txn done.', txHash: payload.tx_hash });
      } else {
        setClaimSuccess({ message: 'Txn done.' });
      }
      await loadTokenBalances();
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Claim request failed.');
    } finally {
      setClaimLoading(false);
    }
  };

  const selectedToken = tokenOptions.find((option) => option.key === claimTokenKey);
  const canClaim =
    !!selectedToken &&
    selectedToken.configured &&
    ethers.isAddress(claimToAddress.trim()) &&
    !!vaultAddress &&
    ethers.isAddress(vaultAddress) &&
    !!provisioningBase &&
    !claimLoading;

  return (
    <Card
      className={`rounded-none lg:rounded-2xl border-white/10 bg-white/5 ${
        mobileTab === 'balance' ? 'block' : 'hidden'
      } ${showBalanceDesktop ? 'lg:block' : 'lg:hidden'}`}
    >
      <CardHeader>
        <CardTitle className="text-white">Balance</CardTitle>
        <p className="text-sm text-white/60">
          Your deposit address for Base, Avalanche, and Monad deposits (USDC/USDT/USDT0).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedClaw ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Selected Claw
                </p>
                <p className="text-sm font-semibold text-white">
                  {formatClawLabel(selectedClaw.subdomain)}
                </p>
                <p className="text-xs text-white/60">
                  Plan: {getPlanLabel(selectedClaw.plan_id)}
                  {selectedClaw.created_at
                    ? ` • Started ${formatDateShort(selectedClaw.created_at)}`
                    : ''}
                </p>
              </div>
              {selectedClawRemainingMicros !== null ? (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    AI Credit Remaining
                  </p>
                  <p className="text-lg font-semibold text-white">
                    ${formatUsdFromMicros(selectedClawRemainingMicros, 5)}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-white/60">
                Add credit
              </span>
              <Input
                type="number"
                min="1"
                step="1"
                className="w-28 border-white/10 bg-white/5 text-white placeholder-white/40"
                placeholder="USD"
                value={creditDrafts[selectedClaw.id] ?? ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onCreditChange(selectedClaw.id, event.target.value)
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddCredits(selectedClaw)}
                disabled={creditLoading[selectedClaw.id]}
                loading={creditLoading[selectedClaw.id]}
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/60">
            Select a Claw to view plan details and add credit.
          </div>
        )}
        {paymentLoading ? (
          <p className="text-sm text-white/70">Loading address…</p>
        ) : paymentError ? (
          <p className="text-sm text-destructive">{paymentError}</p>
        ) : paymentAddress ? (
          <>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Available balance
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                ${((balance?.available_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs break-all">
              {paymentAddress}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="text-[10px] uppercase tracking-wide text-white/50">
                Deposit with
              </span>
              <span className="text-xs text-white/60">USDC/USDT on Avalanche</span>
              <span className="inline-flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/usdt.png" alt="USDT" className="h-5 w-5" />
                <span className="text-xs font-semibold text-white">USDT</span>
              </span>
              <span className="inline-flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/usdc.png" alt="USDC" className="h-5 w-5" />
                <span className="text-xs font-semibold text-white">USDC</span>
              </span>
            </div>
            <Button variant="outline" onClick={onCopyAddress}>
              {copiedId === 'payment-address' ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Deposit Address
                </>
              )}
            </Button>
          </>
        ) : (
          <p className="text-sm text-white/60">No address assigned.</p>
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
                Vault address
                <span
                  className="inline-flex items-center text-white/40 hover:text-white/70"
                  title="Agent's token trading fee is sent in the Vault address which can be claimed by owner"
                  aria-label="Agent's token trading fee is sent in the Vault address which can be claimed by owner"
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
              </p>
              <p className="text-xs text-white/70 break-all">
                {vaultAddress || 'Vault not ready yet.'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setClaimOpen(true)}
              disabled={!vaultAddress}
            >
              Claim Funds
            </Button>
          </div>
        </div>

        {transactions.filter((tx) => tx.type !== 'withdraw').length ? (
          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-white/60">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Recent activity
            </p>
            <div className="mt-2 space-y-2">
              {transactions
                .filter((tx) => tx.type !== 'withdraw')
                .slice(0, 5)
                .map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="capitalize text-white/70">
                        {tx.type === 'provision' ? 'Claw Creation' : tx.type}
                      </span>
                      <span className="text-[11px] text-white/50">
                        {formatDateShort(tx.created_at)}
                      </span>
                    </div>
                    <span className="text-white/70">
                      {(tx.amount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/50">No transactions yet.</p>
        )}

        {claimOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f1412] p-6 text-white shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Claim Funds</h3>
                  <p className="text-xs text-white/60">
                    Transfer vault funds to a wallet you control.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setClaimOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      Vault balances
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadTokenBalances}
                      disabled={balancesLoading}
                      loading={balancesLoading}
                    >
                      Refresh
                    </Button>
                  </div>
                  {balancesError ? (
                    <p className="mt-2 text-xs text-destructive">{balancesError}</p>
                  ) : (
                    <div className="mt-3 space-y-2 text-sm">
                      {tokenOptions.map((token) => {
                        const balanceEntry = tokenBalances[token.key];
                        const balanceLabel = token.configured
                          ? balanceEntry
                            ? balanceEntry.formatted
                            : balancesLoading
                              ? 'Loading...'
                              : 'Unavailable'
                          : 'Not configured';
                        return (
                          <div
                            key={token.key}
                            className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={token.icon} alt={token.label} className="h-4 w-4" />
                              <span className="text-sm font-semibold text-white">
                                {token.label}
                              </span>
                            </div>
                            <span className="text-sm text-white/80">{balanceLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-white/60">
                    Token to claim
                  </label>
                  <select
                    className="w-full rounded-md border border-white/10 bg-[#0f1412] px-3 py-2 text-sm text-white shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    style={{ colorScheme: 'dark' }}
                    value={claimTokenKey}
                    onChange={(event) =>
                      setClaimTokenKey(
                        event.target.value as 'avax' | 'wavax' | 'arena' | 'gladius' | 'agent'
                      )
                    }
                  >
                    {tokenOptions.map((option) => (
                      <option
                        key={option.key}
                        value={option.key}
                        disabled={!option.configured}
                      >
                        {option.label}
                        {!option.configured ? ' (not configured)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-white/60">
                    Destination wallet
                  </label>
                  <Input
                    placeholder="0x..."
                    value={claimToAddress}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setClaimToAddress(event.target.value)
                    }
                  />
                </div>

                {claimError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {claimError}
                  </div>
                ) : null}
                {claimSuccess ? (
                  <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{claimSuccess.message}</span>
                      {claimSuccess.txHash ? (
                        <a
                          href={`https://snowtrace.io/tx/${claimSuccess.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-200 underline underline-offset-2"
                        >
                          View on Snowtrace
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setClaimOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleClaim} loading={claimLoading} disabled={!canClaim}>
                    Claim
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
