type AgentMobileTabsProps = {
  mobileTab: string;
  onMobileTabChange: (tabId: string) => void;
};

const MOBILE_TABS = [
  { id: 'agents', label: 'Agents' },
  { id: 'agent', label: 'Onboard' },
  { id: 'logs', label: 'Logs' },
  { id: 'balance', label: 'Balance' },
  { id: 'actions', label: 'Actions' }
];

export function AgentMobileTabs({ mobileTab, onMobileTabChange }: AgentMobileTabsProps) {
  return (
    <div className="lg:hidden w-full py-2">
      <div className="flex flex-wrap items-center border-b border-white/10 text-sm font-medium text-white/70">
        {MOBILE_TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onMobileTabChange(tab.id)}
            className={`-mb-px px-3 py-2 transition ${
              index > 0 ? 'border-l border-white/10' : ''
            } ${
              mobileTab === tab.id
                ? 'border-b-2 border-white text-white'
                : 'border-b-2 border-transparent text-white/60 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
