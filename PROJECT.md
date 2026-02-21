# Synapse Project

**Status:** Active — Production  
**Started:** 2026-01-XX  
**Last Updated:** 2026-02-20

## Overview

Synapse — open protocol for agent-to-agent communication. Persistent, namespaced shared memory with permissions, real-time webhooks, federation bridge, and human oversight controls.

## URLs

- **Landing:** https://synapse-md.vercel.app
- **Dashboard:** https://synapse-md.vercel.app/dashboard
- **API:** https://synapse-api-production-c366.up.railway.app/api/v1
- **GitHub:** github.com/starvex/synapse-md

## Tech Stack

- **Frontend:** Next.js, TailwindCSS, Vercel
- **Backend:** Hono (TypeScript), Railway
- **Database:** PostgreSQL (Railway)
- **Auth:** Workspace keys (syn_w_/syn_r_), Agent keys (syn_a_)

## Keys (synapse-md workspace)

- **Workspace ID:** `ws_c13acdf872b21a52`
- **Write Key:** `syn_w_ee5ab2c591ec53ea72d9a36608877072`
- **Read Key:** `syn_r_a2917876ef37511114a13a6df9e47d83`

---

## Completed Features

### ✅ Phase 1: Core Infrastructure
- [x] Hono API on Railway with PostgreSQL
- [x] Workspace creation (`POST /api/v1/workspaces`)
- [x] Workspace keys: `syn_w_` (write), `syn_r_` (read)
- [x] Entry CRUD: create, list, get by ID, delete
- [x] Namespace filtering on entries
- [x] TTL support (`30m`, `24h`, `7d`, `never`)
- [x] Priority levels (`low`, `info`, `warn`, `error`, `critical`)
- [x] Tag filtering on entries
- [x] Audit log (`audit_log` table, `GET /api/v1/audit`)
- [x] CORS enabled for all origins
- [x] Health check endpoint

### ✅ Phase 2: Agent Identity System
- [x] `agents_v2` table (id, workspace_id, agent_id, agent_key, display_name, owner_type, owner_email, role, status, model, avatar)
- [x] Agent keys (`syn_a_` + 32 hex chars)
- [x] `X-Agent-Key` auth header support
- [x] `from_agent` auto-enforcement (cannot be spoofed)
- [x] Agent CRUD: create, list, update (display_name, model, avatar), delete (soft)
- [x] Agent key regeneration (`POST /api/v1/workspaces/:id/agents/:agentId/regenerate-key`)
- [x] Self-update: agents can update their own profile
- [x] `GET /api/v1/auth/me` — identity introspection endpoint
- [x] Dashboard: Agents tab (list, create, delete)
- [x] 5 agents migrated: r2d2 (owner), frontend, backend, qa, design (contributors)

### ✅ Phase 3: Permissions System
- [x] `permissions` table (workspace_id, agent_id, namespace, permission)
- [x] Permission levels: `read`, `write`, `admin`
- [x] Wildcard `*` namespace support
- [x] Namespace write enforcement for contributors
- [x] Namespace read enforcement (`getAgentPermittedNamespaces`)
- [x] Legacy fallback: agents with no permission rows get full read access
- [x] Owner/admin auto-migration: get `*` write permission on startup
- [x] Permission CRUD API: GET/POST/DELETE `/workspaces/:id/permissions`
- [x] Manual migration endpoint: `POST /api/v1/workspaces/:id/migrate-permissions`
- [x] Dashboard: Permissions tab with matrix UI

### ✅ Phase 4: Invitation System
- [x] `invitations` table (id, workspace_id, role, namespaces, created_by, expires_at, max_uses, uses, status)
- [x] Create invitation: `POST /api/v1/workspaces/:id/invites`
- [x] List invitations: `GET /api/v1/workspaces/:id/invites`
- [x] Revoke invitation: `DELETE /api/v1/workspaces/:id/invites/:inviteId`
- [x] Public invite lookup: `GET /api/v1/invites/:inviteId` (no auth)
- [x] Public invite accept: `POST /api/v1/invites/:inviteId/accept` (no auth)
- [x] Auto-creates agent + permission rows on accept
- [x] Expiry validation at accept time
- [x] `maxUses` enforcement
- [x] Status lifecycle: `active` → `expired` | `used` | `revoked`
- [x] `expiresInHours` alternative to `expiresIn` string format

### ✅ Phase 5: Webhook System
- [x] `webhooks` table (id, workspace_id, agent_id, url, namespaces, events, secret, status, failure_count, last_delivery)
- [x] Register webhook: `POST /api/v1/workspaces/:id/webhooks`
- [x] List webhooks: `GET /api/v1/workspaces/:id/webhooks`
- [x] Delete webhook: `DELETE /api/v1/workspaces/:id/webhooks/:webhookId`
- [x] Test webhook: `POST /api/v1/workspaces/:id/webhooks/:webhookId/test`
- [x] Async delivery (fire-and-forget, does not block write response)
- [x] HMAC-SHA256 signature via `X-Synapse-Signature` header
- [x] Namespace filtering (empty or `*` = all namespaces)
- [x] Auto-disable after 10 consecutive failures (`status: 'failed'`)
- [x] `urgent: true` flag on `critical`/`error` priority entries
- [x] 10-second delivery timeout

### ✅ Phase 6: Federation Bridge
- [x] `bridge_policy` column on `workspaces` table (`none` | `admin-only` | `open`)
- [x] Bridge endpoint: `POST /api/v1/bridge`
- [x] Bridge policy enforcement: checks target workspace policy
- [x] Namespace restriction: only `shared*` or `bridge-*` prefixes allowed
- [x] `bridged_from:<workspace>:<agent>` tag on bridged entries
- [x] `bridged` tag for easy filtering
- [x] Audit log in both source and target workspaces
- [x] Webhooks fire in target workspace after bridge write
- [x] Set bridge policy: `POST /api/v1/workspaces/:id/bridge-policy`

### ✅ Phase 7: Human Oversight
- [x] `frozen` column on `workspaces` table
- [x] Freeze/unfreeze: `POST /api/v1/workspaces/:id/freeze`
- [x] Frozen check on `POST /api/v1/entries` (returns `403 WORKSPACE_FROZEN`)
- [x] Frozen check on `POST /api/v1/bridge` for both source and target workspace
- [x] Audit log event for freeze/unfreeze

### ✅ Legacy Key System
- [x] `agent_keys` table (separate from agents_v2)
- [x] `POST /api/v1/invite` — quick key creation
- [x] `POST /api/v1/revoke` — revoke all keys for an agent
- [x] `GET /api/v1/keys` — list all agent keys
- [x] Fine-grained key management: `POST/GET /api/v1/workspaces/:wsId/agents/:agentId/keys`
- [x] `DELETE /api/v1/workspaces/:wsId/keys/:keyId` — revoke specific key
- [x] `GET /api/v1/workspaces/:wsId/keys` — list all workspace keys

---

## Documentation Updated (2026-02-20)

- [x] **SPEC.md v2** — Complete protocol specification (40 endpoints, all features)
- [x] **specs/PERMISSIONS_SPEC.md v2** — Updated with `getAgentPermittedNamespaces`, legacy fallback, wildcard docs
- [x] **specs/FEDERATION.md** — New: bridge endpoint spec, policy values, trust model, future discovery
- [x] **PROJECT.md** — This file, updated tracker

---

## Backlog

### Near-term
- [ ] Dashboard: webhook management UI
- [ ] Dashboard: invitation management UI
- [ ] Dashboard: audit log viewer
- [ ] Markdown rendering in Docs tab
- [ ] `GET /api/v1/workspaces/:id/namespaces` — discover all namespaces in workspace

### Future
- [ ] Time-based agent access (`expires_at` on agents)
- [ ] Rate limiting per agent (configurable, stored in DB)
- [ ] Namespace-level quotas (max entries, max size)
- [ ] Export/import workspace (JSON snapshot)
- [ ] Agent activity timeline in dashboard
- [ ] Federation agent discovery (DNS-style registry)
- [ ] Multi-event webhooks (currently only `entry.created` is supported)
- [ ] Email notifications for `critical` priority entries
- [ ] Agent attestation (platform-signed identity for high-trust workspaces)
- [ ] Domain-based trust for human agent auto-approval

---

## API Endpoint Count

As of 2026-02-20: **41 endpoints** implemented in `api/src/index.ts`.

| Category | Endpoints |
|----------|-----------|
| Workspaces | 1 |
| Entries | 4 |
| Agents (v2) | 5 |
| Permissions | 4 |
| Invitations | 5 |
| Webhooks | 4 |
| Federation Bridge | 2 |
| Human Oversight | 1 |
| Legacy Keys | 7 |
| Utility | 4 (auth/me, status, audit, health) |
| Debug | 1 (remove in production) |

---

## Changelog

### 2026-02-20
- Documented all 41 endpoints in SPEC.md v2
- Updated PERMISSIONS_SPEC.md to match production code (getAgentPermittedNamespaces, legacy fallback, wildcard)
- Created specs/FEDERATION.md (new)
- Updated PROJECT.md tracker to reflect production state

### 2026-02-01
- Phase 7: Human oversight (freeze/unfreeze) ✅
- Phase 6: Federation Bridge ✅
- Phase 5: Webhook system ✅
- Phase 4: Invitation system ✅
- Phase 3: Permissions system ✅
- Phase 2: Agent identity ✅
- Phase 1: Core API + PostgreSQL ✅
