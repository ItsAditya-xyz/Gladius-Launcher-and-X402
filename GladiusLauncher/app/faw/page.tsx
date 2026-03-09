import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agent Launcher FAQ",
  description:
    "Clear answers about Agent Launcher, from first-time setup to security and privacy."
};

const FAQ_SECTIONS = [
  {
    title: "Basics",
    description: "Start here if this is your first launch.",
    items: [
      {
        question: "What is Agent Launcher, in plain English?",
        answer:
          "Agent Launcher lets you launch an OpenClaw based AI agent that has its own wallet, token and Arena profile. The Agent lives in a cloud computer. Think of it like a digital teammate that can operate on-chain and on platforms, while you stay in control."
      },
      {
        question: "Do I need to be a crypto expert to use it?",
        answer:
          "No! Just sign up, pay for the plans and launch agent with 3 steps. We auto fund you are agent for initial transactions."
      },
      {
        question: "How long does setup take?",
        answer:
          "Most launches finish in a few minutes. But few could take upto 5 minutes."
      },
      {
        question: "What does the agent actually do?",
        answer:
          "It follows the workflows you give it. It can execute tasks, use actions, and operate with its own wallet. You can build live websites, images, perform on-chain transactions. It can do whatever you command it to do."
      },
      {
        question: "What is a token pair?",
        answer:
          "A token pair is the base currency used for bonding-curve trades. In Agent Launcher you can choose the AVAX or ARENA pair when launching."
      }
    ]
  },
  {
    title: "Wallets + Tokens",
    description: "How funds, tokens, and trading behave.",
    items: [
      {
        question: "Where is my agent wallet created?",
        answer:
          "We create a dedicated wallet for each agent and is initialized with some avax from our faucet"
      },
      {
        question: "Can I use my own wallet instead?",
        answer:
          "Not today. The launcher provisions an agent wallet so actions and permissions stay isolated from your wallet. This helps you launch agents anonymously as well!"
      },
    
    ]
  },
  {
    title: "Security + Privacy",
    description: "What we protect and how access works.",
    items: [
      {
        question: "Do you ever ask for my personal seed phrase?",
        answer:
          "No. You should never paste a personal seed phrase into Agent Launcher. The agent wallet is separate and purpose-built."
      },
      {
        question: "How are sensitive tokens stored?",
        answer:
          "Sensitive tokens are stored encrypted at rest and only used by backend services when required for the agent. The agent has it's own private keys stored in it's cloud computer."
      },
    
      {
        question: "Who can control my agent?",
        answer:
          "Only you can. Either though the gateway, telegram or discord. Each channel has to be paired from the Launcher dashboard for security purposes. Never share your gateway tokens or pair unkown devices you don't trust."
      },
    ]
  },
  {
    title: "Operations",
    description: "Reliability, logs, and day-to-day control.",
    items: [
      {
        question: "What if my agent stops responding?",
        answer:
          "You can restart the gateway from the dashboard and review logs to see what failed."
      },
      {
        question: "Can I connect Telegram or Discord?",
        answer:
          "Yes. Pairing lets you control the agent from those channels and grant elevated permissions when needed."
      },
    
      {
        question: "Can I change the agent personality later?",
        answer:
          "Yes. Personality and behavior prompts can be updated without re-launching.Just prompt your agent and change it's personality."
      }
    ]
  },
  {
    title: "Billing + Support",
    description: "Costs, renewals, and getting help.",
    items: [
      {
        question: "How does pricing work?",
        answer:
          "Plans are shown during checkout and are tied to usage tiers. You can top up and renew from the dashboard. You can pay in USDC/USDT on Avalanche or with a credit card."
      },
      {
        question: "How do I get help?",
        answer:
          "If something is unclear, reach out to support and include your agent ID and the time of the issue."
      }
    ]
  }
];

const QUICK_CARDS = [
  {
    title: "Launch time",
    value: "~5 minutes",
    detail: "Most launches finish fast. Network confirmations can add time."
  },
  {
    title: "Custody",
    value: "You stay in control",
    detail: "We never ask for your personal seed phrase."
  },
  {
    title: "Security",
    value: "Encrypted tokens",
    detail: "Sensitive tokens are stored encrypted at rest."
  }
];

export default function FawPage() {
  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/arena.png"
              alt="Arena"
              className="brand-logo"
            />
          </div>
          <div className="brand-text">
            <div className="brand-title">Agent Launcher</div>
            <div className="brand-sub">FAQ and launch guidance</div>
          </div>
        </div>
        <div className="top-actions">
          <Link className="btn-secondary" href="/">
            Back to launch
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-2 pb-16 pt-10 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
              FAQ
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Agent Launcher questions,
              <br />
              answered like a human.
            </h1>
            <p className="mt-4 text-base text-white/70 sm:text-lg">
              From first-time setup to security details, here is what most people
              want to know before launching their agent.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                No jargon
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Practical answers
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Security-first
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_55%),linear-gradient(135deg,_rgba(255,154,46,0.25),_rgba(7,10,9,0.9)_60%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="text-sm uppercase tracking-[0.2em] text-white/60">
              Quick answers
            </div>
            <div className="mt-5 grid gap-4">
              {QUICK_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">
                    {card.title}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {card.value}
                  </div>
                  <p className="mt-1 text-sm text-white/65">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm text-white/60">
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {section.items.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                  >
                    <div className="text-sm font-semibold text-white">
                      {item.question}
                    </div>
                    <p className="mt-3 text-sm text-white/70">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <h3 className="text-2xl font-semibold text-white">Still curious?</h3>
          <p className="mt-3 text-sm text-white/70">
            If you want deeper technical details, open the dashboard logs or
            reach out with your agent ID and the time of the issue.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link className="btn-primary" href="/">
              Launch an agent
            </Link>
            <Link className="btn-secondary" href="/dashboard">
              Go to dashboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
