import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import type { GmailStatus } from './types';

type TabConnectionsProps = {
  mobileTab: string;
  showConnectionsDesktop: boolean;
  gmailLoading: boolean;
  gmailStatus: GmailStatus;
  gmailMode: string;
  onGmailModeChange: (mode: string) => void;
  onConnectGmail: () => void | Promise<void>;
  onDisconnectGmail: () => void | Promise<void>;
  gmailError: string;
  gmailConnecting: boolean;
  gmailDisconnecting: boolean;
};

export function TabConnections({
  mobileTab,
  showConnectionsDesktop,
  gmailLoading,
  gmailStatus,
  gmailMode,
  onGmailModeChange,
  onConnectGmail,
  onDisconnectGmail,
  gmailError,
  gmailConnecting,
  gmailDisconnecting
}: TabConnectionsProps) {
  return (
    <Card
      className={`rounded-none lg:rounded-2xl border-white/10 bg-white/5 ${
        mobileTab === 'connections' ? 'block' : 'hidden'
      } ${showConnectionsDesktop ? 'lg:block' : 'lg:hidden'}`}
    >
      <CardHeader>
        <CardTitle className="text-white">Gmail Access</CardTitle>
        <p className="text-sm text-white/60">
          Connect Gmail so your Claw can read and send emails on your behalf.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {gmailLoading ? (
          <p className="text-sm text-white/60">Loading Gmail status…</p>
        ) : gmailStatus.connected ? (
          <>
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
              <p className="text-xs text-white/60">Connected as</p>
              <p className="font-medium text-white">
                {gmailStatus.email || 'Unknown email'}
              </p>
              <p className="mt-1 text-xs text-white/60">
                Permissions: {gmailStatus.can_read ? 'Read' : '—'}{' '}
                {gmailStatus.can_send ? 'Send' : ''}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onDisconnectGmail}
              disabled={gmailDisconnecting}
              loading={gmailDisconnecting}
            >
              Disconnect Gmail
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2 text-xs text-white/60">
              <p>Choose what your Claw can do:</p>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="gmail-mode"
                  value="read_send"
                  checked={gmailMode === 'read_send'}
                  onChange={() => onGmailModeChange('read_send')}
                />
                <span>
                  <span className="font-semibold text-white">Read & send</span> —
                  full read/write access.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="gmail-mode"
                  value="read"
                  checked={gmailMode === 'read'}
                  onChange={() => onGmailModeChange('read')}
                />
                <span>
                  <span className="font-semibold text-white">Read mail</span> —
                  view inbox and summarize messages.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="gmail-mode"
                  value="send"
                  checked={gmailMode === 'send'}
                  onChange={() => onGmailModeChange('send')}
                />
                <span>
                  <span className="font-semibold text-white">Send mail</span> —
                  draft and send emails for you.
                </span>
              </label>
            </div>
            <Button onClick={onConnectGmail} loading={gmailConnecting}>
              Connect Google
            </Button>
          </>
        )}
        {gmailError ? (
          <p className="text-xs text-red-200">{gmailError}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
