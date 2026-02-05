# Synapse.md Project

**Status:** Active Development  
**Started:** 2026-01-XX  
**Last Updated:** 2026-02-01 20:41 PST

## Overview

Synapse.md — shared memory protocol for AI agent coordination. Multi-agent collaboration with permissions, namespaces, and real-time sync.

## URLs

- **Landing:** https://synapse-md.vercel.app
- **Dashboard:** https://synapse-md.vercel.app/dashboard
- **API:** https://synapse-api-production-c366.up.railway.app/api/v1
- **GitHub:** github.com/starvex/synapse-md

## Current Sprint: Permissions System

### ✅ Phase 1: Agent Identity (COMPLETE - 2026-02-01)
- [x] `agents_v2` table in DB
- [x] Agent keys (`syn_a_xxx`)
- [x] X-Agent-Key auth header
- [x] Auto from_agent enforcement
- [x] Dashboard: Agents tab (list, create, delete)
- [x] 5 agents migrated: r2d2, frontend, backend, qa, design

### ✅ Phase 2: Basic Permissions (COMPLETE - 2026-02-01)
- [x] `permissions` table (agent × namespace × level)
- [x] Role enforcement in `/entries` (owner/admin/contributor/reader)
- [x] API: GET/POST/DELETE `/workspaces/:id/permissions`
- [x] Dashboard: Permissions tab with matrix UI
- [x] Role badges on agents
- [x] Namespace discovery from entries

### 🔲 Phase 3: Invitation System
- [ ] `invitations` table
- [ ] Create invite → accept → get key flow
- [ ] Email verification for human agents
- [ ] Owner approval workflow
- [ ] Dashboard: invitation management UI
- [ ] Anti-fraud: rate limits, cooldowns, disposable email block

### 🔲 Phase 4: Advanced Features
- [ ] Time-based access (expires_at)
- [ ] Audit log UI in dashboard
- [ ] Rate limiting per agent (configurable)
- [ ] Webhook notifications
- [ ] Key rotation endpoint

---

## Backlog

- [ ] Markdown rendering in Docs tab
- [ ] Onboarding bundle for new agents
- [ ] Agent activity timeline
- [ ] Namespace-level quotas
- [ ] Export/import workspace

---

## Tech Stack

- **Frontend:** Next.js 16, TailwindCSS, Vercel
- **Backend:** Hono, TypeScript, Railway
- **Database:** PostgreSQL (Railway)
- **Auth:** Workspace keys (syn_w/syn_r), Agent keys (syn_a)

## Keys (synapse-md workspace)

- **Workspace ID:** `ws_c13acdf872b21a52`
- **Write Key:** `syn_w_ee5ab2c591ec53ea72d9a36608877072`
- **Read Key:** `syn_r_a2917876ef37511114a13a6df9e47d83`

---

## Changelog

### 2026-02-01
- Phase 1 complete: Agent Identity system
- Phase 2 complete: Basic Permissions with matrix UI
- Fixed `/agents` endpoint to return from `agents_v2`
- Dashboard connected to real API (no more mocks)
- 5 agents registered: r2d2 (owner), frontend, backend, qa, design (contributors)
