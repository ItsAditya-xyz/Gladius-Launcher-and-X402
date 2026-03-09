import {
  LogOut,
  Moon,
  RefreshCw,
  Send,
  Sun
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { ArenaAgent, Claw } from './types';

type AgentTopbarProps = {
  agent: ArenaAgent | null;
  agentName: string;
  agentInitials: string;
  agentHandle: string;
  statusLabel: string;
  desktopTab: string;
  onDesktopTabChange: (tabId: string) => void;
  selectedClaw: Claw | null;
  selectedClawReady: boolean;
  selectedGatewayRestarting: boolean;
  onRequestRestart: (claw: Claw) => void;
  actionsDisabled: boolean;
  user: any;
  profileOpen: boolean;
  onToggleProfile: () => void;
  onToggleTheme: () => void;
  theme: string;
  onSignOut: () => void | Promise<void>;
};

const DESKTOP_TABS = [
  { id: 'agent', label: 'Agent' },
  { id: 'logs', label: 'Logs' },
  { id: 'balance', label: 'Balance' },
  { id: 'actions', label: 'Actions' }
];

export function AgentTopbar({
  agent,
  agentName,
  agentInitials,
  agentHandle,
  statusLabel,
  desktopTab,
  onDesktopTabChange,
  selectedClaw,
  selectedClawReady,
  selectedGatewayRestarting,
  onRequestRestart,
  user,
  profileOpen,
  onToggleProfile,
  onToggleTheme,
  theme,
  onSignOut
}: AgentTopbarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3 lg:px-6 lg:py-4 backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="flex w-full items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white">
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
              {agentHandle || statusLabel}
            </p>
          </div>
        </div>
        <div className="hidden lg:flex items-center">
          {DESKTOP_TABS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onDesktopTabChange(tab.id)}
              className={`px-4 py-2 text-sm transition ${
                index > 0 ? 'border-l border-white/10' : ''
              } ${
                desktopTab === tab.id
                  ? 'border-b-2 border-white text-white'
                  : 'border-b-2 border-transparent text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-2">
        <div className="hidden lg:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => selectedClaw && onRequestRestart(selectedClaw)}
            disabled={!selectedClaw || !selectedClawReady || selectedGatewayRestarting}
            aria-label="Restart gateway"
            title="Restart"
          >
            <RefreshCw
              className={`h-4 w-4 ${selectedGatewayRestarting ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
        <div className="relative">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white"
            onClick={onToggleProfile}
            aria-label="Account menu"
          >
            {user?.user_metadata?.avatar_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover"
                />
              </>
            ) : (
              <span>{user?.email?.[0]?.toUpperCase() || '?'}</span>
            )}
          </button>
          {profileOpen ? (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-[#0f111a] p-2 text-white/80 shadow-lg">
              <p className="truncate px-3 py-2 text-xs text-white/60">
                {user?.email || 'Unknown account'}
              </p>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white"
                onClick={onToggleTheme}
              >
                <span>Theme</span>
                <span className="flex items-center gap-1">
                  {theme === 'dark' ? (
                    <Sun className="h-3 w-3" />
                  ) : (
                    <Moon className="h-3 w-3" />
                  )}
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </span>
              </button>
              <a
                href="https://t.me/+ThHPHKW1rvE1YTFl"
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Send className="h-3 w-3" /> Support
              </a>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
