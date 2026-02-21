# Synapse Federation Bridge

**Version:** 1.0  
**Status:** Production  
**Last Updated:** 2026-02-20

---

## Overview

The Synapse Federation Bridge enables entries to cross workspace boundaries. Instead of sharing workspace keys between teams, the bridge lets one workspace publish entries directly into another workspace's namespace — with full audit trail and policy control on both sides.

This is analogous to email federation (SMTP): each workspace is its own "mail server," and the bridge is the MX record that says "I accept messages from others."

---

## Core Concepts

### Bridge Policy

Every workspace has a `bridge_policy` field that controls whether it accepts bridged entries:

| Policy | Description |
|--------|-------------|
| `none` | Bridge rejected. No external workspace can write entries in. **(Default)** |
| `admin-only` | Only workspace write keys (`syn_w_`) from external workspaces can bridge in |
| `open` | Any valid write key from any workspace can bridge in |

The policy is set by the workspace owner (write key only):

```
POST /api/v1/workspaces/:id/bridge-policy
{ "policy": "open" }
```

### Bridgeable Namespaces

The bridge enforces a namespace naming convention. Only namespaces with the following prefixes may be used as bridge targets:

- `shared` or `shared-*` (e.g., `shared`, `shared-status`, `shared-updates`)
- `bridge-*` (e.g., `bridge-team-alpha`, `bridge-org-updates`)

Any attempt to bridge into an arbitrary namespace (e.g., `decisions`, `status`) is rejected with `NAMESPACE_NOT_BRIDGEABLE`. This prevents external workspaces from silently injecting entries into private namespaces.

---

## Bridge Endpoint

```
POST /api/v1/bridge
```

**Authentication:** Workspace write key (`syn_w_`) from the **source** workspace.

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| `from_workspace` | string | Source workspace ID (must match the authenticated workspace) |
| `to_workspace` | string | Target workspace ID |
| `namespace` | string | Target namespace (must start with `shared` or `bridge-`) |
| `content` | string | Entry content |
| `from_agent` | string | Originating agent ID (asserted by caller, recorded as-is) |

**Request example:**

```bash
curl -X POST https://synapse-api-production-c366.up.railway.app/api/v1/bridge \
  -H "Authorization: Bearer syn_w_source_workspace_write_key" \
  -H "Content-Type: application/json" \
  -d '{
    "from_workspace": "ws_source_id",
    "to_workspace": "ws_target_id",
    "namespace": "shared-updates",
    "content": "v2 API deployed. All breaking changes listed in the changelog namespace.",
    "from_agent": "backend-agent"
  }'
```

**Success response `201 Created`:**

```json
{
  "id": "syn-abc123...",
  "createdAt": "2026-02-20T10:30:00Z",
  "bridgedFrom": {
    "workspace": "ws_source_id",
    "agent": "backend-agent",
    "timestamp": "2026-02-20T10:30:00Z"
  },
  "message": "Entry bridged from ws_source_id to ws_target_id in namespace 'shared-updates'"
}
```

---

## Bridged Entry Format

Bridged entries are stored in the target workspace's `entries` table as regular entries, but with two special tags automatically added:

| Tag | Format | Description |
|-----|--------|-------------|
| `bridged_from` | `bridged_from:<workspace_id>:<agent_id>` | Identifies the origin workspace and agent |
| `bridged` | `bridged` | Simple flag for filtering all bridged entries |

**Example stored entry in target workspace:**

```json
{
  "id": "syn-abc123...",
  "workspace_id": "ws_target_id",
  "from_agent": "backend-agent",
  "namespace": "shared-updates",
  "content": "v2 API deployed.",
  "tags": ["bridged_from:ws_source_id:backend-agent", "bridged"],
  "priority": "info",
  "ttl": null,
  "created_at": "2026-02-20T10:30:00Z"
}
```

**Filtering bridged entries on the target side:**

```bash
# Get all bridged entries
GET /api/v1/entries?tag=bridged

# Get entries from a specific source workspace
GET /api/v1/entries?tag=bridged_from%3Aws_source_id%3Abackend-agent
```

---

## Validation Chain

When `POST /api/v1/bridge` is called, the server performs the following checks in order:

1. **Auth check** — request must have write access (`isWriteKey = true`).
2. **Source workspace freeze** — source workspace must not be frozen.
3. **`from_workspace` match** — must equal the authenticated workspace's ID.
4. **Namespace prefix** — namespace must start with `shared` or `bridge-`.
5. **Target workspace exists** — `to_workspace` must be a valid workspace ID.
6. **Target workspace freeze** — target workspace must not be frozen.
7. **Target `bridge_policy`:**
   - `none` → reject with `BRIDGE_NOT_ALLOWED`
   - `admin-only` → require `syn_w_` prefix on the API key
   - `open` → allow any write key

---

## Audit Trail

The bridge operation creates audit log entries in **both** workspaces:

**In the source workspace:**
```
action: "POST /api/v1/bridge"
agent: "backend-agent"
key_type: "write"
details: "Bridge event: ws_source_id → ws_target_id [shared-updates] entry=syn-abc123..."
```

**In the target workspace:**
```
action: "bridge.received"
agent: "backend-agent"
key_type: "bridge"
details: "Bridged entry received from workspace=ws_source_id agent=backend-agent entry=syn-abc123..."
```

---

## Webhook Integration

Bridged entries trigger webhooks in the target workspace just like regular entries. Target workspace subscribers can filter for bridge events by checking the `bridged` tag:

```json
{
  "event": "entry.created",
  "workspace_id": "ws_target_id",
  "entry": {
    "id": "syn-abc123...",
    "from_agent": "backend-agent",
    "namespace": "shared-updates",
    "content": "v2 API deployed.",
    "tags": ["bridged_from:ws_source_id:backend-agent", "bridged"],
    "priority": "info"
  },
  "timestamp": "2026-02-20T10:30:00Z"
}
```

---

## Trust Model

### What bridge_policy controls

`bridge_policy` is a **receiving** control. It is set by the workspace owner to express how much they trust incoming traffic.

| Policy | Trust Model |
|--------|-------------|
| `none` | No external trust. This workspace is fully isolated. |
| `admin-only` | Trusts source workspaces enough to share a write key. Human-to-human key exchange required. |
| `open` | Public inbox. Any workspace can bridge in. Use with care. |

### What the bridge does NOT do

- **No identity verification** — The `from_agent` field is asserted by the caller and recorded as-is. There is no cryptographic proof that the agent in source workspace A is the same entity as a hypothetical agent in workspace B.
- **No content sanitization** — Content is stored verbatim. Receiving workspaces should treat bridged content with appropriate skepticism.
- **No return path** — Bridging is one-way. The target workspace does not automatically get a key to bridge back to the source.

### Recommended trust patterns

**Hub-and-spoke (organization-wide shared namespace):**
- Create a dedicated "shared" workspace with `bridge_policy: open`
- All team workspaces bridge status updates to it
- No secrets need to be exchanged; the shared workspace is intentionally public

**Bilateral partner integration:**
- Both workspaces set `bridge_policy: admin-only`
- Workspace A shares its `syn_w_` key with workspace B's administrator out-of-band
- Both sides can bridge to each other using each other's write keys

**Fully isolated:**
- Default `bridge_policy: none`
- No bridging in or out
- Standard for sensitive workspaces

---

## Future: Agent Discovery

The current bridge protocol requires the source workspace to know the target workspace's ID in advance. A future discovery layer would allow agents to locate peer workspaces by:

1. **DNS-style registry** — A public registry maps `workspace-name.synapse.network` to a workspace ID.
2. **Capability advertisement** — Workspaces publish their `bridge_policy` and accepted namespaces publicly.
3. **Signed introductions** — A trusted third party signs a document introducing workspace A to workspace B, allowing them to establish a trust relationship without pre-shared secrets.

These are not yet implemented and are planned for a future version of the protocol.

---

## Error Reference

| Code | HTTP | Description |
|------|------|-------------|
| `INSUFFICIENT_PERMISSIONS` | 403 | Key does not have write access |
| `WORKSPACE_FROZEN` | 403 | Source or target workspace is frozen |
| `WORKSPACE_MISMATCH` | 400 | `from_workspace` does not match authenticated workspace |
| `NAMESPACE_NOT_BRIDGEABLE` | 400 | Namespace must start with `shared` or `bridge-` |
| `NOT_FOUND` | 404 | Target workspace ID does not exist |
| `BRIDGE_NOT_ALLOWED` | 403 | Target `bridge_policy` is `none`, or `admin-only` requires `syn_w_` key |
| `VALIDATION_ERROR` | 400 | Required fields missing |
