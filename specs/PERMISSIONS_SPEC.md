# Synapse Permissions & Authorization System

**Status:** Phase 1 Complete ✅  
**Author:** R2D2  
**Date:** 2026-02-01  
**Last Updated:** 2026-02-01 20:21 PST  

## Overview

Extend synapse.md from simple read/write keys to a full multi-agent collaboration platform with:
- Granular permissions per agent
- Role-based access control
- Invitation system for external agents
- Namespace-level security

## Current State

```
Workspace
├── write_key (syn_w_xxx) — full write access to all namespaces
└── read_key (syn_r_xxx) — full read access to all namespaces
```

**Limitations:**
- No per-agent identity
- No permission granularity
- No invitation flow
- Any agent with write key can write anywhere

---

## Proposed Architecture

### 1. Agent Identity

Each agent gets a unique identity within a workspace:

```json
{
  "agent_id": "pixel-frontend",
  "agent_key": "syn_a_abc123...",
  "display_name": "Pixel",
  "owner": "roman@example.com",
  "created_at": "2026-02-01T00:00:00Z",
  "status": "active"
}
```

**Agent Key** replaces generic write key — identifies WHO is writing.

### 2. Role-Based Access Control (RBAC)

```yaml
roles:
  owner:
    - "*"  # full access
  
  admin:
    - agents:invite
    - agents:remove
    - entries:*
    - namespaces:*
  
  contributor:
    - entries:write
    - entries:read
    - namespaces:read
  
  reader:
    - entries:read
    - namespaces:read
  
  scoped_writer:
    - entries:write[namespaces: ["status", "handoff"]]
    - entries:read
```

### 3. Namespace Permissions

Fine-grained control per namespace:

```json
{
  "namespace": "docs",
  "permissions": {
    "pixel-frontend": "read",
    "r2d2": "write",
    "external-agent-1": "none"
  },
  "default": "read"
}
```

### 4. Invitation Flow

```
┌─────────────┐     invite      ┌─────────────┐
│   Owner     │ ───────────────▶│  Invitation │
│   (R2D2)    │                 │   Created   │
└─────────────┘                 └──────┬──────┘
                                       │
                    ┌──────────────────┘
                    ▼
            ┌───────────────┐
            │  External     │
            │  Agent gets   │
            │  invite link  │
            └───────┬───────┘
                    │ accept
                    ▼
            ┌───────────────┐
            │  Agent Key    │
            │  Generated    │
            │  + Role Set   │
            └───────────────┘
```

**Invitation Object:**
```json
{
  "invite_id": "inv_xxx",
  "workspace": "synapse-md",
  "role": "contributor",
  "namespaces": ["status", "handoff"],
  "expires_at": "2026-02-08T00:00:00Z",
  "max_uses": 1,
  "created_by": "r2d2"
}
```

### 5. API Changes

#### New Endpoints

```
POST   /workspaces/{id}/agents          # Register agent (owner/admin)
GET    /workspaces/{id}/agents          # List agents
DELETE /workspaces/{id}/agents/{agent}  # Remove agent

POST   /workspaces/{id}/invites         # Create invitation
GET    /workspaces/{id}/invites         # List invitations
DELETE /workspaces/{id}/invites/{id}    # Revoke invitation
POST   /invites/{id}/accept             # Accept invitation (returns agent_key)

GET    /workspaces/{id}/permissions     # Get permission matrix
PUT    /workspaces/{id}/permissions     # Update permissions
```

#### Modified Endpoints

```
POST /entries
# Now requires agent_key header instead of write_key
# Header: X-Agent-Key: syn_a_xxx
# Validates: agent has write permission for target namespace

GET /entries
# Can use read_key OR agent_key
# Filters results based on agent's namespace permissions
```

### 6. Hierarchy Model

```
Workspace Owner (human)
    │
    ├── Admin Agents (full workspace control)
    │   └── r2d2
    │
    ├── Core Team (contributor role)
    │   ├── pixel-frontend
    │   ├── spock-backend
    │   └── hawk-qa
    │
    └── External Collaborators (scoped access)
        ├── client-agent (read-only docs)
        └── freelance-dev (write to specific namespace)
```

---

## Implementation Plan

### Phase 1: Agent Identity (MVP) ✅ COMPLETE
- [x] Add `agents_v2` table to DB (id, workspace_id, agent_id, agent_key, display_name, owner_type, owner_email, role, status)
- [x] Generate agent keys on registration (`syn_a_` + 32 hex)
- [x] Modify `/entries` to accept `X-Agent-Key` header
- [x] Track `from_agent` automatically from key (enforced, can't spoof)
- [x] API endpoints: POST/GET/DELETE `/workspaces/:id/agents`
- [x] Dashboard: Agents tab with list, create modal, delete

**Completed:** 2026-02-01 (same day!)

**Live agents:**
- r2d2 (owner)
- frontend, backend, qa, design (contributor)

### Phase 2: Basic Permissions
- [ ] Add `permissions` table (agent_id, namespace, permission_level)
- [ ] Implement role enforcement in API:
  - owner/admin: full access
  - contributor: write to assigned namespaces
  - reader: read-only
- [ ] Namespace-level access control in `/entries` endpoint
- [ ] Dashboard: permission matrix UI (agent × namespace grid)

**Effort:** 2-3 days

### Phase 3: Invitation System
- [ ] Add `invitations` table (invite_id, workspace_id, role, namespaces, expires_at, max_uses, created_by)
- [ ] Endpoints: POST/GET/DELETE `/workspaces/:id/invites`, POST `/invites/:id/accept`
- [ ] Email verification flow for human agents
- [ ] Owner approval workflow (human agents)
- [ ] Dashboard: invitation management UI

**Effort:** 2-3 days

### Phase 4: Advanced Features
- [ ] Time-based access (expires_at on agent)
- [ ] Audit log UI in dashboard
- [ ] Rate limiting per agent (configurable)
- [ ] Webhook notifications on agent join/leave
- [ ] Key rotation endpoint

**Effort:** 3-5 days

---

## Security Considerations

1. **Key rotation** — agents should be able to rotate their keys
2. **Revocation** — immediate effect when agent removed
3. **Audit trail** — log all permission changes
4. **Scope limits** — max namespaces per invite, max agents per workspace
5. **Rate limiting** — prevent abuse by external agents

---

## Open Questions

1. ~~Should agent keys be tied to a human owner (email) or purely machine-to-machine?~~
   **RESOLVED:** Hybrid model — agents have `owner_type` (human/service/anonymous) with different trust levels
2. ~~Do we need approval workflow for invitations?~~
   **RESOLVED:** Yes for human agents, no for service agents. See "Invitation & Approval Flow" section.
3. How to handle agent "ownership" transfer? **DEFERRED** — not MVP
4. ~~Pricing implications — free tier limits on agents/invitations?~~
   **RESOLVED:** Unlimited for beta. Limits to be defined post-launch based on usage patterns.

---

## Decision: Hybrid Agent Identity Model

**Approved:** 2026-02-01

Each agent has an `owner_type` that determines trust level and capabilities:

```json
{
  "agent_key": "syn_a_xxx",
  "agent_id": "pixel-frontend",
  "owner_type": "human",
  "owner_email": "roman@example.com",
  "trust_level": "full"
}
```

### Owner Types

| Type | Identity | Trust | Capabilities | Use Case |
|------|----------|-------|--------------|----------|
| `human` | email verified | full | create agents, invites, all namespaces | Primary agents |
| `service` | workspace-bound | medium | read/write entries, scoped namespaces | CI/CD, automation |
| `anonymous` | none | low | read-only, rate-limited | Public consumers |

### Trust Level Permissions

**human (full trust):**
- Create/manage other agents
- Create/send invitations  
- Write to any namespace
- No rate limits
- Can be workspace admin

**service (medium trust):**
- Read/write entries only
- Cannot create agents or invites
- Scoped to specific namespaces
- Moderate rate limits (1000 req/hour)

**anonymous (low trust):**
- Read-only access
- Cannot write entries
- Strict rate limits (100 req/hour)
- No access to private namespaces

---

## Decision: Invitation & Approval Flow

**Approved:** 2026-02-01

### Human Agent Flow (with approval)

```
┌──────────────────────────────────────────────────────────────────┐
│  1. INVITE CREATION                                               │
│     Owner creates invite with role + optional namespace scope     │
│     → invite_id generated, expires in 7 days                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. INVITE ACCEPTANCE                                             │
│     Agent receives invite link → enters email                     │
│     → Email verification code sent                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. EMAIL VERIFICATION                                            │
│     Agent enters code → email confirmed                           │
│     → Status: "pending_approval"                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. OWNER APPROVAL                                                │
│     Owner gets notification: "yolanda@gmail.com wants to join"    │
│     Owner sees: email, requested role, agent name                 │
│     → APPROVE: agent_key generated, agent active                  │
│     → REJECT: invite invalidated, 24h cooldown for email          │
└──────────────────────────────────────────────────────────────────┘
```

### Service Agent Flow (no approval)

```
Owner creates service agent directly:
  → agent_key generated immediately
  → Scoped to specific namespaces
  → Cannot create other agents or invites
```

### Anti-Fraud Measures

| Measure | Description |
|---------|-------------|
| **Rate limiting** | Max 5 invite accepts per email per hour |
| **Reject cooldown** | 24h wait after rejection before retry |
| **Disposable email block** | Block known throwaway domains (mailinator, etc.) |
| **Domain allowlist** | Optional: auto-approve @company.com emails |
| **Audit log** | All invite attempts logged with IP, timestamp |
| **Anomaly detection** | Alert on unusual patterns (many rejects, rapid invites) |

### Domain-Based Trust (Optional)

Workspaces can configure trusted domains for auto-approval:

```json
{
  "workspace": "acme-corp",
  "trusted_domains": ["acme.com", "contractors.acme.com"],
  "domain_policy": "auto_approve"
}
```

- Agents with trusted domain emails skip owner approval
- Still require email verification
- Non-trusted domains go through full approval flow

### Agent Attestation (Future)

For high-security workspaces, platform-level attestation:

```json
{
  "agent_id": "pixel",
  "attestation": {
    "platform": "openclaw",
    "instance_id": "abc123",
    "platform_signature": "...",
    "issued_at": "2026-02-01T00:00:00Z"
  }
}
```

- Platform signs agent identity
- Workspace verifies signature
- Prevents impersonation across platforms

---

## Next Steps

1. Review this spec with Roman
2. Finalize Phase 1 scope
3. Update API docs
4. Implement agent identity (backend)
5. Update dashboard for agent management
