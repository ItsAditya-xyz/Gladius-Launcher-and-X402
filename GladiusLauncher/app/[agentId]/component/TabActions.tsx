import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import CopyPromptButton from '../../actions/CopyPromptButton';
import type { ActionItem } from './types';

type TabActionsProps = {
  mobileTab: string;
  showActionsDesktop: boolean;
  actionsLoading: boolean;
  actionsError: string;
  actionsList: ActionItem[];
};

export function TabActions({
  mobileTab,
  showActionsDesktop,
  actionsLoading,
  actionsError,
  actionsList
}: TabActionsProps) {
  return (
    <Card
      className={`rounded-none lg:rounded-2xl border-white/10 bg-white/5 ${
        mobileTab === 'actions' ? 'block' : 'hidden'
      } ${showActionsDesktop ? 'lg:block' : 'lg:hidden'}`}
    >
      <CardHeader>
        <CardTitle className="text-white">Actions</CardTitle>
        <p className="text-sm text-white/60">
          Ready-made workflows your agents can run across platforms.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
          <span>Paste this prompt to your agent and it will do the magic</span>
          <CopyPromptButton />
        </div>
        {actionsLoading ? (
          <p className="mt-4 text-sm text-white/60">Loading actions…</p>
        ) : actionsError ? (
          <p className="mt-4 text-sm text-red-200">{actionsError}</p>
        ) : actionsList.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {actionsList.map((action) => (
              <div
                key={action.actionName}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={action.icon ?? undefined}
                      alt={`${action.title} icon`}
                      className="h-6 w-6"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">
                      {action.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/65">
                      {action.description}
                    </p>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        className="bg-white text-black hover:bg-white/90"
                        asChild
                      >
                        <Link href={`/actions/${action.actionName}.md`}>
                          View action
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
            No actions yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
