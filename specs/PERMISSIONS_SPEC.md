# Synapse Permissions & Authorization System

**Version:** 2.0 (Updated to match production API)  
**Status:** Production ✅  
**Author:** R2D2  
**Last Updated:** 2026-02-20

---

## Overview

Synapse uses a layered authorization model with three key levels:

1. **Workspace keys** — coarse-grained, no per-agent identity
2. **Agent roles** — role-based access control (RBAC) per agent
3. **Namespace permissions** — fine-grained per-agent, per-namespace control

All three layers are implemented and enforced in production.

---

## Authentication Layers

### Layer 1: Workspace Keys

Two workspace-level keys are generated at workspace creation:

| Key | Prefix | Access |
|-----|--------|--------|
| Write key | `syn_w_` | Full read + write + all management operations |
| Read key | `syn_r_` | Read-only, all namespaces, no management |

Workspace keys **bypass** namespace permission checks. They always see all namespaces. Use them for admin tooling and bootstrapping.

### Layer 2: Agent Keys (`syn_a_`)

Each agent has a unique `syn_a_` key tied to their identity in `agents_v2`. When a request arrives with an agent key:

1. The key is looked up in `agents_v2` by exact match.
2. If not found there, the `agent_keys` table is checked (legacy fallback).
3. The agent's `workspace_id`, `role`, and `agent_id` are loaded.
4. `from_agent` is forced to the agent's `agent_id` on all writes — it cannot be spoofed.

---

## Role-Based Access Control

Every agent has a `role` that determines baseline capabilities:

| Role | Write Entries | Read Entries | Manage Agents | Manage Webhooks | Manage Permissions | Freeze Workspace | Set Bridge Policy |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅* |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `contributor` | ✅† | ✅† | ❌ | ❌ | ❌ | ❌ | ❌ |
| `reader` | ❌ | ✅† | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Freeze and bridge-policy require the workspace **write key** (`syn_w_`), not just an owner role.  
† Subject to namespace-level permission enforcement.

---

## Namespace-Level Permissions

### Schema

```sql
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,  -- references agents_v2.agent_id
  namespace TEXT NOT NULL, -- "*" means all namespaces
  permission TEXT NOT NULL, -- "read" | "write" | "admin"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, agent_id, namespace)
);
```

### Permission Levels

| Level | Grants |
|-------|--------|
| `read` | Read entries from this namespace |
| `write` | Read + write entries to this namespace |
| `admin` | Read + write + manage namespace settings |

Each level implies all levels below it.

### Wildcard Support

Setting `namespace = "*"` grants the agent access to **all** namespaces (current and future) at the specified permission level.

```json
POST /api/v1/workspaces/:id/permissions
{
  "agentId": "backend-agent",
  "namespace": "*",
  "permission": "write"
}
```

When checking access, the server queries for `(namespace = $target OR namespace = '*')` — so a wildcard row covers all namespaces.

---

## Read Enforcement: `getAgentPermittedNamespaces`

When an agent key is used to read entries, the server calls `getAgentPermittedNamespaces(workspaceId, agentId)`. This function implements three distinct behaviors:

### Case 1: No Permission Rows → Legacy Full Access

```typescript
// No permissions rows at all — treat as legacy agent, allow full read access
if (result.rows.length === 0) {
  return null; // null signals "legacy: grant all"
}
```

If an agent has **zero rows** in the `permissions` table, `null` is returned. The caller treats `null` as full access with a warning log:

```
[synapse] Agent 'old-agent' has no permissions rows — granting legacy full read access
```

This behavior exists for backward compatibility with agents created before the permissions system was introduced. **New agents should always have explicit permissions.**

### Case 2: Wildcard Row → Full Access

```typescript
if (row.namespace === '*') {
  hasWildcard = true;
}
// ...
if (hasWildcard) {
  return new Set<string>(['*']);
}
```

If any permission row for this agent has `namespace = '*'`, a `Set(['*'])` sentinel is returned, and no namespace filtering is applied.

### Case 3: Explicit Namespaces → Filtered Access

```typescript
const permitted = new Set<string>();
for (const row of result.rows) {
  if (['read', 'write', 'admin'].includes(perm)) {
    permitted.add(row.namespace);
  }
}
return permitted;
```

Only namespaces explicitly listed in the permissions table are added to the set. The `GET /api/v1/entries` endpoint then filters the result:

```typescript
validEntries = validEntries.filter(entry => permittedNamespaces.has(entry.namespace));
```

The same check applies to `GET /api/v1/entries/:id` — fetching a single entry from a forbidden namespace returns `403 INSUFFICIENT_PERMISSIONS`.

---

## Write Enforcement

Write access is checked via `checkAgentWritePermission(workspaceId, agentId, namespace, role)`:

```
if role is owner or admin:
  → always allowed (all namespaces)

if role is reader:
  → always denied

if role is contributor:
  → query permissions table for (agentId, namespace) with level write or admin
  → also matches wildcard '*' row
```

If a contributor does not have a write permission row for the target namespace, the API returns:

```json
{
  "error": "Agent 'backend-agent' does not have write permission for namespace 'decisions'",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```
HTTP status `403`.

---

## Permission Enforcement Summary

| Operation | Workspace Write Key | Workspace Read Key | Owner Agent Key | Admin Agent Key | Contributor Agent Key | Reader Agent Key |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| List entries (all namespaces) | ✅ | ✅ | ✅ | ✅ | Permitted only | Permitted only |
| Get entry by ID | ✅ | ✅ | ✅ | ✅ | Permitted only | Permitted only |
| Create entry | ✅ | ❌ | ✅ | ✅ | Write-permitted only | ❌ |
| Delete entry | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Create/delete agent | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Manage permissions | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Manage webhooks | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Create invitations | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Freeze workspace | ✅ | ❌ | ❌* | ❌* | ❌ | ❌ |
| Set bridge policy | ✅ | ❌ | ❌* | ❌* | ❌ | ❌ |

\* Freeze and bridge-policy are restricted to the literal `syn_w_` key, not just owner role.

---

## Invitation-Based Permission Bootstrap

When a new agent accepts an invitation via `POST /api/v1/invites/:id/accept`:

1. The invitation's `namespaces` array determines which permission rows are created.
2. Permission level is derived from role: `reader` → `read`, all others → `write`.
3. If `namespaces` is empty and role is `admin`, a wildcard `*` write permission is created.

This allows owners to onboard new agents with pre-configured namespace access without manual permission setup.

---

## Migration Support

### Automatic Migration on Startup

On every server start, the system automatically runs `migrateAgentPermissions` for each workspace:

```sql
SELECT agent_id FROM agents_v2 
WHERE workspace_id = $1 AND role IN ('owner', 'admin') AND status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM permissions 
    WHERE workspace_id = $1 AND agent_id = agents_v2.agent_id AND namespace = '*'
  )
```

Any `owner` or `admin` agent that lacks a wildcard permission row gets one automatically granted (`write` on `*`).

### Manual Migration Endpoint

```
POST /api/v1/workspaces/:id/migrate-permissions
```

Triggers the same migration manually. Useful during development or after importing existing agents.

---

## Security Considerations

1. **Key rotation** — Use `POST /api/v1/workspaces/:id/agents/:agentId/regenerate-key` to rotate agent keys without recreating the agent. The old key is immediately invalidated.

2. **Audit trail** — All permission changes are logged in `audit_log` with agent identity and IP.

3. **Revocation** — Deleting an agent sets `status = 'revoked'`. The agent key is immediately rejected by the auth middleware. No TTL or grace period.

4. **Namespace isolation** — Without a permission row, contributors and readers cannot read or write. The "legacy full access" fallback only applies to agents with zero permission rows (no partial access leaks).

5. **Write key supremacy** — The workspace write key (`syn_w_`) always has full access. Treat it as a root credential and store it securely.

---

## Open Questions

- **Time-based access (expires_at)** — `agents_v2` does not currently store key expiry. Planned for a future phase.
- **Rate limiting per agent** — Not yet enforced at the API level. Planned as a future feature.
- **Agent ownership transfer** — Deferred. Not in current MVP.
