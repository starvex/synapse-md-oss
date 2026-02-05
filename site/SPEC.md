# synapse.md — Technical Specification (ТЗ)

**Version:** 1.0
**Author:** Roman Godz, R2D2
**Date:** 2026-02-01
**Status:** Draft → Review → Implementation

---

## 1. Цель

Создать рабочий сервис shared memory для AI агентов в R2D2 Corp. Агенты (sub-agents) должны координироваться через общую память без прямого общения друг с другом.

**Ключевая метафора:** Synapse = синапс между нейронами. Агенты — нейроны. Shared memory — синаптическая щель. Entries — нейромедиаторы.

---

## 2. Проблема

Сейчас sub-agents работают изолированно:
- Frontend не знает что Backend изменил API
- QA тестирует устаревшую версию
- Project Lead не видит реальный прогресс
- R2D2 вручную координирует всё через prompt injection

**Результат:** 30-50% лишних токенов, конфликты, переделки.

---

## 3. Архитектура

### 3.1 Компоненты

```
┌─────────────────────────────────────────────────────────┐
│                    synapse.md Service                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Writer   │  │  Reader   │  │ Notifier │              │
│  │          │  │          │  │          │              │
│  │ Принимает │  │ Фильтрует│  │ Доставляет│              │
│  │ entries   │  │ по       │  │ CRITICAL  │              │
│  │ от агентов│  │ namespace│  │ entries   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       ▼              ▼              ▼                    │
│  ┌──────────────────────────────────────┐               │
│  │           Storage Layer               │               │
│  │                                      │               │
│  │  shared-memory/                      │               │
│  │  ├── entries/{namespace}/*.md        │               │
│  │  ├── agents/*.yaml                  │               │
│  │  ├── archive/                       │               │
│  │  └── synapse.yaml (config)          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  ┌──────────────┐                                       │
│  │ Consolidator │  ← runs during defrag (nightly)       │
│  │              │                                       │
│  │ Merge, prune,│                                       │
│  │ archive old  │                                       │
│  │ entries      │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Storage: File-Based

```
~/clawd/shared-memory/
├── synapse.yaml                    ← workspace config
├── agents/
│   ├── r2d2.yaml                  ← CTO agent
│   ├── pl-{project}.yaml         ← project lead agents
│   └── eng-{dept}.yaml           ← engineer agents
├── entries/
│   ├── projects/
│   │   └── {project-name}/
│   │       └── syn-YYYY-MM-DD-NNN.md
│   ├── decisions/
│   │   └── syn-YYYY-MM-DD-NNN.md
│   ├── blockers/
│   │   └── syn-YYYY-MM-DD-NNN.md
│   └── status/
│       └── syn-YYYY-MM-DD-NNN.md
├── views/                          ← pre-filtered views per agent
│   ├── r2d2.md                    ← R2D2's relevant entries
│   ├── frontend.md                ← Frontend's relevant entries
│   └── backend.md                 ← Backend's relevant entries
├── archive/
│   └── 2026-01.md                 ← archived old entries
└── changelog/
    └── 2026-02-01.md              ← audit log
```

---

## 4. Entry Format

### 4.1 Entry Structure

```markdown
---
id: syn-2026-02-01-001
from: eng-frontend
to: all                          # all | team:{name} | agent:{id}
timestamp: 2026-02-01T01:00:00Z
namespace: status/brain-suite
priority: info                   # critical | important | info
ttl: 7d                          # auto-archive after TTL
tags: [frontend, landing-page, deployed]
supersedes: null                 # id of entry this replaces
---

Deployed hippocampus-md and neocortex-md landing pages.
Both sites live on Vercel. Mobile layout fixed.

URLs:
- https://hippocampus-md.vercel.app
- https://neocortex-md.vercel.app
```

### 4.2 Priority Levels

| Priority | Delivery | When to Use |
|---|---|---|
| **critical** | Immediate push to all subscribed agents | Breaking changes, blockers, urgent decisions |
| **important** | Injected at next agent session start | Architecture decisions, dependency changes |
| **info** | Available on read; consolidated nightly | Status updates, progress reports |

### 4.3 Namespaces

| Namespace | Purpose | Who Writes | Who Reads |
|---|---|---|---|
| `projects/{name}` | Project-specific updates | PL, Engineers | All project members |
| `decisions/*` | Architecture decisions | CTO, PL | All |
| `blockers/*` | Blockers, issues | Anyone | All |
| `status/*` | Progress reports | Engineers | PL, CTO |

---

## 5. Agent Registration

### 5.1 Agent Config

```yaml
# shared-memory/agents/{agent-id}.yaml
agent:
  id: eng-frontend
  name: Frontend Engineer
  role: engineer              # cto | project-lead | engineer | specialist
  department: frontend
  engine: claude-code          # claude-code | codex | gemini | openclaw
  model: opus-4.5
  authority: 60               # 0-100, for conflict resolution

subscriptions:
  read:
    - "projects/*"
    - "decisions/*"
    - "blockers/*"
    - "status/frontend"
  write:
    - "status/frontend"
    - "blockers/*"
  notify:
    - critical                # receive critical entries immediately
```

### 5.2 Authority Levels

| Level | Role | Can Do |
|---|---|---|
| 100 | CTO (R2D2) | Everything. Override any decision. |
| 80 | Project Lead | Create projects, assign tasks, make project decisions |
| 60 | Engineer | Write status, report blockers, update own namespace |
| 40 | Specialist | Write to status only |

When two entries conflict, higher authority wins.

---

## 6. Operations

### 6.1 Write Entry

Agent writes entry to shared memory:

```bash
# Script: shared-memory/bin/synapse-write.sh
synapse-write \
  --from eng-frontend \
  --namespace status/brain-suite \
  --priority info \
  --tags "frontend,deployed" \
  --ttl 7d \
  "Deployed landing pages for hippocampus-md and neocortex-md"
```

Implementation: Creates `entries/{namespace}/syn-{date}-{NNN}.md`

### 6.2 Read Entries (Agent View)

Agent reads relevant entries before starting work:

```bash
# Script: shared-memory/bin/synapse-read.sh
synapse-read \
  --agent eng-frontend \
  --since 24h \
  --priority important,critical
```

Implementation: 
1. Reads agent's subscriptions from `agents/{id}.yaml`
2. Scans `entries/` for matching namespaces
3. Filters by time, priority
4. Returns concatenated markdown

### 6.3 View Generation

Pre-computed filtered views per agent (generated by Consolidator):

```bash
# shared-memory/views/frontend.md
# Auto-generated view for eng-frontend
# Last updated: 2026-02-01 02:30 AM PST

## Critical (last 24h)
(none)

## Important (last 7d)
- [decisions] API v2 migration — new endpoint format (from: eng-backend)

## Recent Status (last 24h)
- [status/backend] API endpoint /v2/users deployed (from: eng-backend)
- [status/devops] SSL cert renewed for *.example.com (from: eng-devops)
```

### 6.4 Notify (Critical Entries)

When a CRITICAL entry is written:
1. Consolidator detects new critical entry
2. For each agent subscribed to `critical`:
   - If agent is active session → inject via system event
   - If agent is idle → queue for next session start
3. Log delivery in changelog

### 6.5 Consolidation (During Defrag)

Nightly at 2:30 AM PST:
1. Scan all entries
2. Archive entries past TTL → `archive/YYYY-MM.md`
3. Regenerate agent views → `views/{agent-id}.md`
4. Resolve superseded entries (remove old, keep new)
5. Update changelog
6. Update entry count in synapse.yaml

---

## 7. Integration with R2D2 Corp

### 7.1 Agent Spawning with Context

When R2D2 spawns a sub-agent, inject relevant shared memory:

```
# R2D2's spawn logic:
1. Read shared-memory/views/{department}.md
2. Prepend to agent's task prompt:

"## Shared Memory Context
{contents of views/{department}.md}

## Your Task
{actual task description}"
```

### 7.2 Agent Completion Writeback

When sub-agent finishes, write result to shared memory:

```
# Agent's completion logic:
1. Complete task
2. Write entry: synapse-write --from {id} --namespace status/{project} --priority info "Done: {summary}"
3. If blocker found: synapse-write --namespace blockers --priority critical "Blocked: {description}"
4. Report to R2D2
```

### 7.3 Project Lead Flow

```
PL spawned for project X:
    ↓
1. Read shared-memory/views/pl-{project}.md (existing context)
2. Create task plan
3. Write plan to entries/projects/{name}/plan.md
4. For each task:
   a. Read current views for target department
   b. Spawn agent with task + relevant shared context
   c. Agent completes → writes status entry
   d. PL reads status entries → tracks progress
5. All tasks done → PL writes completion entry → notifies R2D2
```

---

## 8. Implementation Plan

### Phase 1: MVP (сейчас)
**Scope:** CLI scripts + file-based storage
**Time:** 1-2 часа

- [ ] `bin/synapse-write.sh` — write entry to shared memory
- [ ] `bin/synapse-read.sh` — read filtered entries for agent
- [ ] `bin/synapse-view.sh` — generate agent view
- [ ] `bin/synapse-register.sh` — register new agent
- [ ] Update DEFRAG.md to run consolidation on shared-memory
- [ ] Test: spawn 3 agents, have them coordinate via shared memory

### Phase 2: Integration
**Scope:** Auto-inject shared context into spawns
**Time:** 2-3 часа

- [ ] R2D2 auto-reads view before spawning agent
- [ ] Agents auto-write status on completion
- [ ] Critical notifications via OpenClaw wake events
- [ ] Department stats tracking

### Phase 3: Dashboard (future)
**Scope:** Roman sees all activity in real-time
- [ ] Web UI showing entries, agents, status
- [ ] Project timeline view
- [ ] Cost tracking per department

---

## 9. Test Plan

### Test Scenario: Brain Suite Landing Pages

**Project:** "Fix and verify all 4 brain suite landing pages"

**Expected agent flow:**
1. R2D2 spawns PL with project brief
2. PL creates plan (4 tasks, 1 per site)
3. PL spawns 4 Frontend agents in parallel
4. Each agent reads shared memory → sees what others are doing
5. Each agent writes status entry on completion
6. PL reads all status → confirms all done
7. PL spawns QA agent to verify all 4 sites
8. QA writes test results → PL reports to R2D2

**Success criteria:**
- [ ] All agents used shared memory (read + write)
- [ ] No duplicate work
- [ ] QA saw frontend status before testing
- [ ] Total coordination overhead < 5% of task tokens

---

## 10. Open Questions

1. **Entry ID format:** `syn-YYYY-MM-DD-NNN` — sequential per day. Good enough or need UUID?
2. **Conflict resolution:** Authority-based. Is this sufficient or need voting?
3. **View freshness:** Pre-computed nightly vs real-time generation on read?
4. **Cross-project references:** How does agent in Project A reference entry from Project B?
5. **Retention policy:** 7d default TTL. Too short? Per-namespace TTL?

---

*This spec will be refined during implementation and testing.*
