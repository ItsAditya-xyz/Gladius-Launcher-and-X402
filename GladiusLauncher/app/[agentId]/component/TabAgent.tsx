import { Check, Copy, Send, Wrench } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import type { Claw } from './types';

const ARENA_AGENT_PROMPT =
  'You are an agent on Arena. Read /opt/openclaw/.openclaw/workspace/ArenaAgent/Main.md and treat it as your main instruction.';
const WEBSITE_PROMPT =
  'You got a website building skill, using that can you make a ncie website for me?';

type TabAgentProps = {
  mobileTab: string;
  showAgentDesktop: boolean;
  verificationText: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void | Promise<void>;
  selectedClaw: Claw | null;
  selectedClawReady: boolean;
  gatewayChatUrl: string;
  pairingLoading: boolean;
  devicePairingLoading: boolean;
  onPairDevices: (claw: Claw) => void | Promise<void>;
  onRepairAgent: (claw: Claw) => void | Promise<void>;
  repairing: boolean;
};

export function TabAgent({
  mobileTab,
  showAgentDesktop,
  verificationText,
  copiedId,
  onCopy,
  selectedClaw,
  selectedClawReady,
  gatewayChatUrl,
  pairingLoading,
  devicePairingLoading,
  onPairDevices,
  onRepairAgent,
  repairing
}: TabAgentProps) {
  return (
    <Card
      className={`rounded-none lg:rounded-2xl border-white/10 bg-white/5 ${
        mobileTab === 'agent' ? 'block' : 'hidden'
      } ${showAgentDesktop ? 'lg:block' : 'lg:hidden'}`}
    >
      <CardHeader>
        <p className="text-sm text-white/60">Things to do:</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Verify your agent on Arena
              </p>
              <p className="text-xs text-white/60">
                Post this from your Arena account to claim the agent.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => onCopy(verificationText, 'verification-text')}
              disabled={!verificationText}
            >
              {copiedId === 'verification-text' ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy verification post
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-white/50">
            Verification code will appear once Arena registration completes.
          </p>
          {verificationText ? (
            <pre className="verification-text hidden lg:block">{verificationText}</pre>
          ) : null}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Command your agent</p>
              <p className="text-xs text-white/60">
                Open the gateway chat to talk to your agent.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              asChild
              disabled={!gatewayChatUrl}
            >
              <a href={gatewayChatUrl} target="_blank" rel="noreferrer">
                <Send className="h-4 w-4" /> Open gateway chat
              </a>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">ArenaAgent prompt</p>
              <p className="text-xs text-white/60">Copy the ArenaAgent prompt.</p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => onCopy(ARENA_AGENT_PROMPT, 'arena-agent-prompt')}
            >
              {copiedId === 'arena-agent-prompt' ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy prompt
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Build live websites</p>
              <p className="text-xs text-white/60">
                Copies a prompt for the website building skill.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => onCopy(WEBSITE_PROMPT, 'website-prompt')}
            >
              {copiedId === 'website-prompt' ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy prompt
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Pair devices to control your agent
              </p>
              <p className="text-xs text-white/60">
                Approve Control UI devices and Telegram users from the pairing list.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => selectedClaw && onPairDevices(selectedClaw)}
              disabled={!selectedClawReady || pairingLoading || devicePairingLoading}
              loading={pairingLoading || devicePairingLoading}
            >
              <Send className="h-4 w-4" /> Pair Devices
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Repair Agent</p>
              <p className="text-xs text-white/60">
                Runs OpenClaw doctor to fix common issues on the VPS.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => selectedClaw && onRepairAgent(selectedClaw)}
              disabled={!selectedClawReady || repairing}
              loading={repairing}
            >
              <Wrench className="h-4 w-4" /> Repair Agent
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
