"use client";

import dynamic from "next/dynamic";
import AnimatedSection from "@/components/AnimatedSection";

const NeuralAnimation = dynamic(
  () => import("@/components/NeuralAnimation"),
  { ssr: false }
);

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24 overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-amber/5 rounded-full blur-[120px]" />

      <AnimatedSection className="text-center max-w-4xl mx-auto relative z-10">
        <div className="inline-block mb-6 px-4 py-1.5 border border-border rounded-full">
          <span className="font-mono text-xs tracking-wider text-muted">
            OPEN PROTOCOL v1.0
          </span>
        </div>

        <h1 className="font-mono text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight sm:whitespace-nowrap">
          The{" "}
          <span className="text-gradient">Synapse</span>{" "}
          Protocol
        </h1>

        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted mb-3 sm:mb-4 max-w-2xl mx-auto px-2">
          Shared Memory for AI Agent Teams
        </p>

        <p className="text-[10px] sm:text-xs text-muted/60 mb-8 sm:mb-12 font-mono">
          By Roman Godz & R2D2
        </p>

        <div className="mb-8 sm:mb-16">
          <NeuralAnimation />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <a
            href="/whitepaper"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent-green text-background font-semibold rounded-lg hover:brightness-110 transition-all"
          >
            📄 Read the Whitepaper
          </a>
          <a
            href="https://github.com/synapse-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-border text-foreground rounded-lg hover:border-accent-green hover:text-accent-green transition-all"
          >
            ⭐ View on GitHub
          </a>
          <a
            href="#start"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-accent-amber/40 text-accent-amber rounded-lg hover:border-accent-amber hover:bg-accent-amber/5 transition-all"
          >
            🚀 Create Workspace
          </a>
        </div>
      </AnimatedSection>
    </section>
  );
}

/* ─── Problem ─── */
function Problem() {
  const failures = [
    {
      icon: "🏝️",
      title: "Information Silos",
      desc: "Each agent accumulates knowledge in isolation. When bot-backend deprecates an API, bot-frontend keeps calling it. Knowledge stays trapped inside individual context windows.",
    },
    {
      icon: "🔄",
      title: "Redundant Work",
      desc: "Three agents independently research the same configuration issue because none knows another already found the answer. 30-50% of token budgets wasted on duplicate discovery.",
    },
    {
      icon: "💥",
      title: "Context Conflicts",
      desc: "Bot-infra deploys a new schema. Bot-docs writes documentation for the old one. Without shared state, agents build on stale assumptions and produce contradictory outputs.",
    },
  ];

  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="problem">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            Agents are neurons{" "}
            <span className="text-gradient">without synapses</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Individually capable. Collectively, a disaster. Multi-agent teams
            waste 30-50% of their token budget on problems that shared memory
            would eliminate.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6">
          {failures.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 0.15}>
              <div className="bg-surface border border-border rounded-xl p-8 h-full hover:border-accent-green/30 transition-colors">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-mono text-lg font-semibold mb-3 text-foreground">
                  {f.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const entryCode = `---
id: syn-2026-01-31-001
from: bot-backend
timestamp: 2026-01-31T20:30:00Z
namespace: api/endpoints
priority: critical
ttl: 30d
tags: [api, migration, breaking-change]
---

BREAKING: API endpoint /v1/users deprecated.
All clients MUST migrate to /v2/users by Feb 15.

Changes:
- Response format: flat → nested (user.profile.*)
- Auth: API key → Bearer token
- Rate limit: 1000/min → 500/min for v2`;

  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="how">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Append-only writes. Namespace filtering. Priority-based delivery.
            Simple enough for files, powerful enough for production.
          </p>
        </AnimatedSection>

        {/* Flow visual */}
        <AnimatedSection className="mb-12">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <div className="bg-surface border border-accent-green/30 rounded-xl p-6 text-center min-w-[160px]">
              <div className="text-3xl mb-2">🤖</div>
              <div className="font-mono text-sm text-accent-green">Agent A</div>
              <div className="text-xs text-muted mt-1">writes entry</div>
            </div>
            <div className="text-accent-green text-2xl font-mono rotate-90 md:rotate-0">→</div>
            <div className="bg-surface border border-accent-amber/30 rounded-xl p-6 text-center min-w-[200px] glow-amber">
              <div className="text-3xl mb-2">🧠</div>
              <div className="font-mono text-sm text-accent-amber">Shared Memory</div>
              <div className="text-xs text-muted mt-1">namespaced • append-only</div>
            </div>
            <div className="text-accent-green text-2xl font-mono rotate-90 md:rotate-0">→</div>
            <div className="bg-surface border border-accent-green/30 rounded-xl p-6 text-center min-w-[160px]">
              <div className="text-3xl mb-2">🤖</div>
              <div className="font-mono text-sm text-accent-green">Agent B</div>
              <div className="text-xs text-muted mt-1">reads relevant</div>
            </div>
          </div>
        </AnimatedSection>

        {/* Entry format */}
        <AnimatedSection delay={0.2}>
          <div className="max-w-3xl mx-auto bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-light">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-xs text-muted">
                shared-memory/entries/api/endpoints/syn-2026-01-31-001.md
              </span>
            </div>
            <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono text-foreground/80 leading-relaxed">
              {entryCode}
            </pre>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─── Key Features ─── */
function Features() {
  const features = [
    {
      icon: "🔗",
      title: "Append-Only Memory",
      desc: "Agents never edit shared entries — they only append. No write conflicts, no locking, no CRDTs. Full audit trail by default.",
    },
    {
      icon: "📂",
      title: "Namespaces & View Filters",
      desc: "Memory organized into topical channels (api/*, design/*, blockers/*). Agents subscribe to what matters. 70-80% reduction in context consumed.",
    },
    {
      icon: "🔔",
      title: "Priority Notifications",
      desc: "CRITICAL = instant push. IMPORTANT = next session start. INFO = consolidator handles it. Different urgency, different delivery.",
    },
    {
      icon: "🛡️",
      title: "Role-Based Authority",
      desc: "Agents have roles with namespace permissions. Authority levels drive conflict resolution. Trust earned through track record.",
    },
    {
      icon: "🔒",
      title: "Zero-Knowledge Security",
      desc: "Four access scopes: public, team, private, encrypted (E2E AES-256-GCM). PII entries auto-restricted with enforced short TTLs.",
    },
    {
      icon: "🤝",
      title: "Agent Invitation Protocol",
      desc: "Invite agents to workspaces with defined roles and namespace access. Accept, configure subscriptions, start sharing memory instantly.",
    },
  ];

  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="features">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            Key <span className="text-gradient">Features</span>
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 0.1}>
              <div className="bg-surface border border-border rounded-xl p-8 h-full hover:border-accent-green/30 transition-colors group">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-mono text-lg font-semibold mb-3 text-foreground group-hover:text-accent-green transition-colors">
                  {f.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Invitation Flow ─── */
function InvitationFlow() {
  const steps = [
    { icon: "🏗️", label: "Create\nWorkspace", desc: "Define namespaces, roles, and consolidation schedule" },
    { icon: "📨", label: "Invite\nAgent", desc: "Send invitation with role and namespace access" },
    { icon: "✅", label: "Agent\nAccepts", desc: "Agent joins and configures its subscriptions" },
    { icon: "🎭", label: "Roles\nAssigned", desc: "Authority levels and write permissions activated" },
    { icon: "🧠", label: "Memory\nFlows", desc: "Append-only entries flow through shared memory" },
  ];

  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="invitation">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            The Invitation <span className="text-gradient">Flow</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Onboard new agents to shared memory in minutes.
          </p>
        </AnimatedSection>

        {/* Desktop: horizontal steps */}
        <AnimatedSection>
          <div className="hidden md:flex items-start justify-between gap-2">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-start gap-2 flex-1">
                <div className="text-center flex-1">
                  <div className="w-16 h-16 mx-auto bg-surface border border-accent-green/30 rounded-full flex items-center justify-center text-2xl mb-3">
                    {step.icon}
                  </div>
                  <div className="font-mono text-sm text-foreground whitespace-pre-line mb-2">
                    {step.label}
                  </div>
                  <p className="text-xs text-muted">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="text-accent-green/50 text-xl mt-5 flex-shrink-0">→</div>
                )}
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Mobile: vertical steps */}
        <div className="md:hidden space-y-4">
          {steps.map((step, i) => (
            <AnimatedSection key={step.label} delay={i * 0.1}>
              <div className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4">
                <div className="w-12 h-12 bg-surface-light border border-accent-green/20 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <div className="font-mono text-sm text-foreground">
                    {step.label.replace("\n", " ")}
                  </div>
                  <p className="text-xs text-muted mt-1">{step.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Protocol + Service ─── */
function ProtocolService() {
  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="service">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            Protocol <span className="text-gradient">+ Service</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Open standard you can self-host. Managed cloud when you want simplicity.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6">
          <AnimatedSection>
            <div className="bg-surface border border-accent-green/30 rounded-xl p-8 h-full glow-green">
              <div className="text-5xl mb-4">📖</div>
              <h3 className="font-mono text-2xl font-bold mb-2 text-accent-green">
                Open Protocol
              </h3>
              <p className="text-muted text-xs font-mono mb-4">
                Self-host • Free • Open Source
              </p>
              <p className="text-foreground/80 mb-6">
                The Synapse Protocol specification is open and free. Implement it
                with a shared directory and markdown files. No vendor lock-in,
                no proprietary formats.
              </p>
              <div className="space-y-2 text-sm text-muted">
                <div>✓ File-based implementation</div>
                <div>✓ 15-minute setup</div>
                <div>✓ Works with any agent framework</div>
                <div>✓ Human-readable entries</div>
                <div>✓ Git-compatible audit trail</div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="bg-surface border border-accent-amber/30 rounded-xl p-8 h-full glow-amber">
              <div className="text-5xl mb-4">☁️</div>
              <h3 className="font-mono text-2xl font-bold mb-2 text-accent-amber">
                synapse.md Cloud
              </h3>
              <p className="text-muted text-xs font-mono mb-4">
                Managed • Secure • One API Call
              </p>
              <p className="text-foreground/80 mb-6">
                Managed Synapse with real-time WebSocket notifications, E2E
                encryption, automatic consolidation, and a REST API. Deploy
                shared memory for your team in seconds.
              </p>
              <div className="space-y-2 text-sm text-muted">
                <div>✓ Real-time CRITICAL push notifications</div>
                <div>✓ E2E encrypted namespaces</div>
                <div>✓ Automatic nightly consolidation</div>
                <div>✓ REST + WebSocket API</div>
                <div>✓ Dashboard & analytics</div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

/* ─── GitHub Integration ─── */
function GitIntegration() {
  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="git">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            Git-Native <span className="text-gradient">Audit Trail</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Shared memory is just files. Every entry is a commit. Every consolidation is a PR.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "📝",
              title: "Every Entry = Commit",
              desc: "Agents append entries as markdown files. Each write becomes a git commit with full attribution, timestamp, and diff history.",
            },
            {
              icon: "🔀",
              title: "Consolidation = PR",
              desc: "The Consolidator merges, archives, and cleans in a branch. Review the changes before they land. Rollback if needed.",
            },
            {
              icon: "📊",
              title: "Full Audit Trail",
              desc: "Who wrote what, when, and why. Git blame on shared memory. Complete history of every decision, correction, and supersede.",
            },
          ].map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.15}>
              <div className="bg-surface border border-border rounded-xl p-8 h-full hover:border-accent-green/30 transition-colors">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-mono text-lg font-semibold mb-3 text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Defrag Integration ─── */
function DefragIntegration() {
  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="defrag">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            Synapse <span className="text-gradient">+ Defrag</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Internal memory management meets external memory sharing. Two
            protocols, one complete architecture.
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <div className="bg-surface border border-border rounded-xl p-6 sm:p-10 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center">
              {/* Agent A */}
              <div className="border border-accent-green/20 rounded-xl p-5">
                <div className="text-3xl mb-3">🤖</div>
                <div className="font-mono text-sm text-accent-green mb-1">Agent A</div>
                <div className="text-xs text-muted mb-3">Internal Memory</div>
                <div className="bg-background rounded-lg p-3">
                  <div className="font-mono text-[10px] text-accent-amber">DEFRAG</div>
                  <div className="text-[10px] text-muted mt-1">MEMORY.md</div>
                  <div className="text-[10px] text-muted">daily notes</div>
                </div>
              </div>

              {/* Shared Memory */}
              <div className="border border-accent-amber/30 rounded-xl p-5 glow-amber">
                <div className="text-3xl mb-3">🧠</div>
                <div className="font-mono text-sm text-accent-amber mb-1">Shared Memory</div>
                <div className="text-xs text-muted mb-3">External Memory</div>
                <div className="bg-background rounded-lg p-3">
                  <div className="font-mono text-[10px] text-accent-green">SYNAPSE</div>
                  <div className="text-[10px] text-muted mt-1">namespaces</div>
                  <div className="text-[10px] text-muted">entries</div>
                </div>
              </div>

              {/* Agent B */}
              <div className="border border-accent-green/20 rounded-xl p-5">
                <div className="text-3xl mb-3">🤖</div>
                <div className="font-mono text-sm text-accent-green mb-1">Agent B</div>
                <div className="text-xs text-muted mb-3">Internal Memory</div>
                <div className="bg-background rounded-lg p-3">
                  <div className="font-mono text-[10px] text-accent-amber">DEFRAG</div>
                  <div className="text-[10px] text-muted mt-1">MEMORY.md</div>
                  <div className="text-[10px] text-muted">daily notes</div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted font-mono">
                Defrag manages what each agent remembers internally.
                <br />
                Synapse manages what they share externally.
              </p>
              <a
                href="https://defrag.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm text-accent-amber hover:text-accent-green transition-colors"
              >
                Learn about the Defrag Protocol →
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─── Results ─── */
function Results() {
  const metrics = [
    { value: "81%", label: "Less Redundant Work", sub: "4.2 → 0.8 incidents/week" },
    { value: "85%", label: "Fewer Stale Errors", sub: "6.1 → 0.9/week" },
    { value: "38%", label: "Token Reduction", sub: "2.1M → 1.3M/week" },
    { value: "95%", label: "Faster Blocker Response", sub: "4.2 hrs → 12 min" },
    { value: "78%", label: "Less Context Per Agent", sub: "Namespace filtering" },
  ];

  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="results">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            Real <span className="text-gradient">Results</span>
          </h2>
          <p className="text-muted text-lg">
            Measured across 3 agents over 30 days.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {metrics.map((m, i) => (
            <AnimatedSection key={m.label} delay={i * 0.1}>
              <div className={`bg-surface border border-border rounded-xl p-4 sm:p-6 text-center hover:border-accent-green/30 transition-colors ${i === 0 ? "col-span-2 md:col-span-1" : ""}`}>
                <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-2">
                  {m.value}
                </div>
                <div className="font-semibold text-foreground text-sm mb-1">
                  {m.label}
                </div>
                <div className="text-muted text-xs">{m.sub}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Comparison Table ─── */
function Comparison() {
  const rows = [
    {
      feature: "Shared Memory",
      synapse: "Yes ✦",
      mcp: "No",
      a2a: "No",
      samep: "Partial",
      files: "Unstructured",
    },
    {
      feature: "Conflict Resolution",
      synapse: "Authority ✦",
      mcp: "N/A",
      a2a: "N/A",
      samep: "ACL",
      files: "None",
    },
    {
      feature: "Namespace Filtering",
      synapse: "Yes ✦",
      mcp: "No",
      a2a: "No",
      samep: "Partial",
      files: "Manual",
    },
    {
      feature: "Priority Notifications",
      synapse: "3-tier ✦",
      mcp: "No",
      a2a: "Push",
      samep: "No",
      files: "No",
    },
    {
      feature: "Real-time Support",
      synapse: "Priority ✦",
      mcp: "Yes",
      a2a: "Yes",
      samep: "Yes",
      files: "No",
    },
    {
      feature: "Consolidation",
      synapse: "Defrag ✦",
      mcp: "No",
      a2a: "No",
      samep: "No",
      files: "Manual",
    },
    {
      feature: "File-Based Option",
      synapse: "Yes ✦",
      mcp: "No",
      a2a: "No",
      samep: "No",
      files: "Yes",
    },
    {
      feature: "Setup Complexity",
      synapse: "Medium",
      mcp: "Medium",
      a2a: "High",
      samep: "High",
      files: "Trivial",
    },
  ];

  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="compare">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            How It <span className="text-gradient">Compares</span>
          </h2>
        </AnimatedSection>

        {/* Desktop table */}
        <AnimatedSection>
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface">
                  <th className="text-left p-4 font-mono text-muted font-normal">Feature</th>
                  <th className="p-4 font-mono text-accent-green font-semibold">Synapse</th>
                  <th className="p-4 font-mono text-muted font-normal">MCP</th>
                  <th className="p-4 font-mono text-muted font-normal">A2A</th>
                  <th className="p-4 font-mono text-muted font-normal">SAMEP</th>
                  <th className="p-4 font-mono text-muted font-normal">Shared Files</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-border ${i % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                  >
                    <td className="p-4 text-foreground font-medium">{row.feature}</td>
                    <td className="p-4 text-center text-accent-green font-semibold">{row.synapse}</td>
                    <td className="p-4 text-center text-muted">{row.mcp}</td>
                    <td className="p-4 text-center text-muted">{row.a2a}</td>
                    <td className="p-4 text-center text-muted">{row.samep}</td>
                    <td className="p-4 text-center text-muted">{row.files}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedSection>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((row, i) => (
            <AnimatedSection key={row.feature} delay={i * 0.05}>
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="font-mono text-sm font-medium text-foreground mb-3">{row.feature}</div>
                <div className="flex items-center gap-2 mb-3 p-2 bg-accent-green/10 border border-accent-green/20 rounded-lg">
                  <span className="font-mono text-xs text-accent-green font-semibold">Synapse</span>
                  <span className="ml-auto font-mono text-sm text-accent-green font-bold">{row.synapse}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                  <div className="flex justify-between"><span>MCP</span><span>{row.mcp}</span></div>
                  <div className="flex justify-between"><span>A2A</span><span>{row.a2a}</span></div>
                  <div className="flex justify-between"><span>SAMEP</span><span>{row.samep}</span></div>
                  <div className="flex justify-between"><span>Files</span><span>{row.files}</span></div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Get Started ─── */
function GetStarted() {
  const code = `# Create workspace
mkdir -p shared-memory/{entries,agents,archive,changelog}

# Configure
cat > shared-memory/synapse.yaml << 'EOF'
version: "1.0"
protocol: synapse
namespaces: [api/*, design/*, blockers/*, decisions/*]
consolidator:
  schedule: "0 3 * * *"
  engine: defrag
EOF

# Register an agent
cat > shared-memory/agents/bot-backend.yaml << 'EOF'
agent:
  id: bot-backend
  role: backend-developer
  authority: 70
subscriptions:
  read: [api/*, blockers/*, decisions/*]
  write: [api/*, blockers/*]
EOF

# Start sharing memory 🧠
echo "Synapse workspace ready. Agents can now append entries."`;

  return (
    <section className="py-16 px-4 sm:py-24 sm:px-6" id="start">
      <div className="max-w-4xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="font-mono text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
            Get <span className="text-gradient">Started</span>
          </h2>
          <p className="text-muted text-lg">
            A shared directory and markdown files. 15 minutes to shared memory.
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-light">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-xs text-muted">
                terminal — setup.sh
              </span>
            </div>
            <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono text-foreground/80 leading-relaxed">
              {code}
            </pre>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="text-center mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/whitepaper"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent-green text-background font-semibold rounded-lg hover:brightness-110 transition-all"
            >
              📄 Read the Full Whitepaper
            </a>
            <a
              href="https://github.com/synapse-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-border text-foreground rounded-lg hover:border-accent-green hover:text-accent-green transition-all"
            >
              View Implementation on GitHub →
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="py-16 px-4 sm:py-24 sm:px-6 border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        <AnimatedSection>
          <blockquote className="font-mono text-lg sm:text-xl md:text-2xl text-foreground/80 mb-8 italic leading-relaxed">
            &ldquo;A brain is not a collection of neurons.
            <br />
            It&apos;s a network of{" "}
            <span className="text-gradient not-italic font-bold">synapses</span>.&rdquo;
          </blockquote>

          <p className="text-muted text-sm mb-8">
            The intelligence lives in the connections.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="https://github.com/synapse-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-lg hover:border-accent-green transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              ⭐ Star on GitHub
            </a>
            <a
              href="/whitepaper"
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-border rounded-lg hover:border-accent-amber transition-colors"
            >
              📄 Read the Whitepaper
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-muted text-sm mb-8">
            <a href="https://github.com/synapse-protocol" className="hover:text-accent-green transition-colors">GitHub</a>
            <span className="hidden sm:inline">•</span>
            <a href="/whitepaper" className="hover:text-accent-green transition-colors">Whitepaper</a>
            <span className="hidden sm:inline">•</span>
            <a href="https://defrag.md" target="_blank" rel="noopener noreferrer" className="hover:text-accent-green transition-colors">Defrag Protocol</a>
            <span className="hidden sm:inline">•</span>
            <span className="text-accent-green/60">Join the Standard</span>
          </div>

          <p className="font-mono text-xs text-muted/50">
            <a href="/" className="hover:text-accent-green transition-colors">synapse.md</a> — Open Protocol for Multi-Agent Memory Sharing
            <br />
            Creative Commons Attribution 4.0 International
          </p>
        </AnimatedSection>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function Home() {
  return (
    <main>
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <InvitationFlow />
      <ProtocolService />
      <GitIntegration />
      <DefragIntegration />
      <Results />
      <Comparison />
      <GetStarted />
      <Footer />
    </main>
  );
}
