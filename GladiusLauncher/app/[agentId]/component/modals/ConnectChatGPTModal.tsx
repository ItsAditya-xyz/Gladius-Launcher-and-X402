'use client';

import { Button } from '../../../../components/ui/button';

type ConnectChatGPTModalProps = {
  open: boolean;
  onClose: () => void;
  authUrl: string;
  redirectUrl: string;
  onRedirectChange: (value: string) => void;
  authLoading: boolean;
  enableLoading: boolean;
  error: string;
  onRefreshLink: () => void | Promise<void>;
  onEnable: () => void | Promise<void>;
};

export function ConnectChatGPTModal({
  open,
  onClose,
  authUrl,
  redirectUrl,
  onRedirectChange,
  authLoading,
  enableLoading,
  error,
  onRefreshLink,
  onEnable
}: ConnectChatGPTModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black p-6 text-white shadow-2xl">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Connect ChatGPT</h3>
          <p className="text-sm text-white/60">
            Connect your ChatGPT account to use your ChatGPT subscription for this Claw.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {authLoading ? (
            <div className="flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            </div>
          ) : authUrl ? (
            <div className="space-y-4 rounded-md border border-white/10 bg-white/5 p-4">
              <div className="space-y-2">
                <p className="text-sm text-white/80">
                  1. Open the auth link and sign in with ChatGPT.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                  asChild
                >
                  <a href={authUrl} target="_blank" rel="noreferrer">
                    Open auth link
                  </a>
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white/80">
                  2. After sign-in, you will be redirected to a localhost URL. Copy the full URL
                  from the address bar and paste it below.
                </p>
                <textarea
                  value={redirectUrl}
                  onChange={(event) => onRedirectChange(event.target.value)}
                  placeholder="http://localhost:1455/auth/callback?code=...&state=..."
                  className="min-h-[88px] w-full rounded-md border border-white/10 bg-black/60 p-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
                />
                <p className="text-xs text-white/50">
                  Seeing a localhost error page is expected. We only need the URL.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/60">Generate an auth link to continue.</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={onRefreshLink}
              disabled={authLoading}
            >
              Refresh link
            </Button>
            <Button onClick={onEnable} disabled={enableLoading || !redirectUrl} loading={enableLoading}>
              Enable ChatGPT
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
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
