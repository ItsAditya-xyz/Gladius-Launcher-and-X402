import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import type { Claw, LogRow } from './types';

type TabLogsProps = {
  mobileTab: string;
  showLogsDesktop: boolean;
  selectedClaw: Claw | null;
  selectedClawRemainingMicros: number | null;
  selectedClawSpendMicros: number | null;
  logRows: LogRow[];
  logsLoading: boolean;
  logsError: string;
  logsHasMore: boolean;
  logsLoadingMore: boolean;
  logsTotal: number | null;
  onLoadMore: () => void | Promise<void>;
  formatUsdFromMicros: (value: number | string | null | undefined, decimals?: number) => string;
  formatRelativeTime: (value: string | null | undefined) => string;
};

export function TabLogs({
  mobileTab,
  showLogsDesktop,
  selectedClaw,
  selectedClawRemainingMicros,
  selectedClawSpendMicros,
  logRows,
  logsLoading,
  logsError,
  logsHasMore,
  logsLoadingMore,
  logsTotal,
  onLoadMore,
  formatUsdFromMicros,
  formatRelativeTime
}: TabLogsProps) {
  return (
    <Card
      className={`rounded-none lg:rounded-2xl border-white/10 bg-white/5 ${
        mobileTab === 'logs' ? 'block' : 'hidden'
      } ${showLogsDesktop ? 'lg:block' : 'lg:hidden'}`}
    >
      <CardHeader>
        <CardTitle className="text-white">Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedClaw ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wide text-white/60">
                AI Credit Available
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                ${formatUsdFromMicros(selectedClawRemainingMicros ?? 0, 5)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wide text-white/60">
                AI Credit Spent
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                ${formatUsdFromMicros(selectedClawSpendMicros ?? 0, 5)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/60">
            Select a Claw to view AI credit totals.
          </div>
        )}
        {logsLoading ? (
          <p className="text-sm text-white/60">Loading logs…</p>
        ) : logsError ? (
          <p className="text-sm text-red-200">{logsError}</p>
        ) : logRows.length ? (
          <div className="space-y-3">
            <div className="hidden lg:block">
              <div className="overflow-hidden rounded-lg border border-white/10">
                <div className="grid grid-cols-[1.6fr_1.2fr_0.9fr_1.1fr] gap-2 bg-white/5 px-3 py-2 text-xs uppercase tracking-wide text-white/50">
                  <span>Model</span>
                  <span>Tokens</span>
                  <span>Cost</span>
                  <span>Time</span>
                </div>
                {logRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1.6fr_1.2fr_0.9fr_1.1fr] gap-2 border-t border-white/10 px-3 py-2 text-sm text-white/80"
                  >
                    <span className="truncate">{row.model || '—'}</span>
                    <span className="font-mono text-xs">
                      {Number(row.input_tokens ?? 0).toLocaleString()} →{' '}
                      {Number(row.output_tokens ?? 0).toLocaleString()}
                    </span>
                    <span>
                      $
                      {formatUsdFromMicros(
                        row.cost_micros ?? (row.cost_cents ?? 0) * 10000,
                        5
                      )}
                    </span>
                    <span
                      className="text-xs text-white/60"
                      title={
                        row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : ''
                      }
                    >
                      {formatRelativeTime(row.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 lg:hidden">
              {logRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/80"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white break-words">
                      {row.model || '—'}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs">
                    <div className="rounded-md border border-white/10 bg-white/5 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-white/50">
                        Tokens
                      </p>
                      <p className="mt-1 text-sm text-white font-mono">
                        {Number(row.input_tokens ?? 0).toLocaleString()} →{' '}
                        {Number(row.output_tokens ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/5 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-white/50">
                        Cost
                      </p>
                      <p className="mt-1 text-sm text-white">
                        $
                        {formatUsdFromMicros(
                          row.cost_micros ?? (row.cost_cents ?? 0) * 10000,
                          5
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/60">
                    <span className="text-[10px] uppercase tracking-wide text-white/50">
                      Time
                    </span>
                    <span
                      title={
                        row.created_at ? new Date(row.created_at).toLocaleString() : ''
                      }
                    >
                      {formatRelativeTime(row.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {logsHasMore ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button variant="outline" onClick={onLoadMore} disabled={logsLoadingMore}>
                  {logsLoadingMore ? 'Loading…' : 'Load more'}
                </Button>
                {logsTotal !== null ? (
                  <span className="text-xs text-white/50">
                    Showing {logRows.length} of {logsTotal}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/60">
            No logs yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
