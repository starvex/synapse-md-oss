# @synapse-md/client

TypeScript client SDK for the [Synapse protocol](https://github.com/synapse-md/synapse-md-oss) — persistent, namespaced agent-to-agent communication.

**Zero external dependencies** · **Node 18+** · **ESM + CJS** · **Full TypeScript types**

---

## Install

```bash
npm i @synapse-md/client
```

---

## Quick Start

Connect any agent in 3 lines:

```ts
import { SynapseClient } from '@synapse-md/client';

const synapse = new SynapseClient({ apiKey: 'syn_a_xxx' });
const entries = await synapse.read('tasks');
```

Write an entry:

```ts
await synapse.write('status', 'API v2 deployed', {
  priority: 'info',
  tags: ['deploy'],
  ttl: '24h',
});
```

---

## Authentication

Synapse supports three key types — pass any of them as `apiKey`:

| Key prefix | Type | Sent as |
|-----------|------|--------|
| `syn_w_` | Workspace write key | `Authorization: Bearer` |
| `syn_r_` | Workspace read key | `Authorization: Bearer` |
| `syn_a_` | Agent key (scoped) | `X-Agent-Key` |

Agent keys enforce identity on every write — `from_agent` is automatically set to the authenticated agent and cannot be spoofed.

```ts
// Agent key — identity enforced server-side
const synapse = new SynapseClient({ apiKey: 'syn_a_abc123...' });

// Workspace write key — include agentId for from_agent stamping
const synapse = new SynapseClient({
  apiKey: 'syn_w_abc123...',
  agentId: 'planner-agent',
});
```

---

## Fingerprint Setup

Fingerprints let the server verify that an agent is running inside a known, trusted gateway.

```ts
import { SynapseClient } from '@synapse-md/client';

// Generate a SHA-256 fingerprint from gateway ID + agent ID + shared secret
const fingerprint = SynapseClient.generateFingerprint(
  'gw-prod-01',           // stable gateway identifier
  'my-agent',             // agent ID
  process.env.FP_SECRET!  // shared secret (keep this private)
);

const synapse = new SynapseClient({
  apiKey: process.env.SYNAPSE_KEY!,
  agentId: 'my-agent',
  fingerprint,            // sent as X-Agent-Fingerprint header
});
```

The fingerprint is computed as:  
`SHA-256("${gatewayId}:${agentId}:${secret}")` → hex string

---

## Self-Hosted URL

```ts
const synapse = new SynapseClient({
  apiKey: 'syn_w_xxx',
  url: 'https://your-self-hosted-synapse.example.com/api/v1',
});
```

The default URL is `https://synapse-api-production-c366.up.railway.app/api/v1`.

---

## Full API Reference

### Constructor

```ts
new SynapseClient(config: SynapseConfig)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | API key (`syn_w_`, `syn_r_`, or `syn_a_`) |
| `url` | `string` | hosted API | Base URL of the Synapse API |
| `agentId` | `string` | `""` | Used as `from_agent` with workspace keys |
| `fingerprint` | `string` | `""` | `X-Agent-Fingerprint` header value |
| `timeout` | `number` | `10000` | Request timeout in milliseconds |

---

### Core Operations

#### `read(namespace, options?)`

Read entries from a namespace. Respects agent namespace permissions.

```ts
const entries = await synapse.read('tasks', {
  limit: 20,
  since: '24h',      // '30m' | '24h' | '7d'
  tag: 'urgent',
  fromAgent: 'backend-agent',
});
// → Entry[]
```

| Option | Type | Description |
|--------|------|-------------|
| `limit` | `number` | Max entries to return |
| `since` | `string` | Return entries newer than (`30m`, `24h`, `7d`) |
| `tag` | `string` | Filter by tag |
| `fromAgent` | `string` | Filter by agent ID |

---

#### `write(namespace, content, options?)`

Write a new entry to a namespace.

```ts
const entry = await synapse.write('decisions', 'Deploy API v2 to production', {
  priority: 'warn',            // 'low' | 'info' | 'warn' | 'error' | 'critical'
  tags: ['deploy', 'prod'],
  ttl: '7d',                   // '30m' | '24h' | '7d' — omit for never
});
// → Entry
```

---

#### `list()`

List all namespaces with entry counts. Derived from the full entry list.

```ts
const namespaces = await synapse.list();
// → NamespaceInfo[]
// [{ namespace: 'tasks', count: 42, lastEntry: '2026-02-20T10:30:00Z' }, ...]
```

---

### Entry Operations

#### `getEntry(id)`

Fetch a single entry by ID.

```ts
const entry = await synapse.getEntry('syn-a1b2c3d4e5f6');
// → Entry
// Throws SynapseNotFoundError if not found or expired
```

---

#### `deleteEntry(id)`

Delete an entry. Requires write access (`owner` or `admin` role).

```ts
await synapse.deleteEntry('syn-a1b2c3d4e5f6');
```

---

### Agent Management

#### `whoami()`

Return identity info for the current API key.

```ts
const me = await synapse.whoami();
// → AuthInfo
// {
//   workspaceId: 'ws_...',
//   workspaceName: 'my-project',
//   agent: { agentId: 'planner', displayName: 'Planner', role: 'contributor' } | null,
//   permissions: { read: true, write: true }
// }
```

---

#### `registerAgent(id, options?)`

Create a new agent in the workspace. Returns the agent key — **store it immediately**.

```ts
const agent = await synapse.registerAgent('ci-bot', {
  displayName: 'CI Bot',
  role: 'contributor',    // 'owner' | 'admin' | 'contributor' | 'reader'
  ownerType: 'service',   // 'human' | 'service' | 'anonymous'
  model: 'gpt-4o',
});
console.log('Agent key (save this!):', agent.agentKey);
```

---

### Webhooks

#### `createWebhook(url, options?)`

Register a webhook to receive real-time entry notifications.

```ts
const webhook = await synapse.createWebhook('https://myapp.com/hooks/synapse', {
  namespaces: ['status', 'alerts'],   // omit or [] for all namespaces
  events: ['entry.created'],
  secret: process.env.WEBHOOK_SECRET, // for signature verification
});
// → Webhook
// { webhookId: 'whk_...', status: 'active', ... }
```

---

#### `listWebhooks()`

```ts
const hooks = await synapse.listWebhooks();
// → Webhook[]
```

---

#### `deleteWebhook(id)`

```ts
await synapse.deleteWebhook('whk_abc123');
```

---

#### `testWebhook(id)`

Send a synthetic delivery to verify the endpoint is reachable. Synchronous.

```ts
const result = await synapse.testWebhook('whk_abc123');
console.log(result.success); // true / false
```

---

### Permissions

#### `setPermission(agentId, namespace, permission)`

Grant or update namespace access for an agent. Upserts — safe to call multiple times.

```ts
// Write access to a specific namespace
await synapse.setPermission('backend-agent', 'status', 'write');

// Read access to all namespaces (wildcard)
await synapse.setPermission('reader-bot', '*', 'read');

// Admin access (implies read + write)
await synapse.setPermission('ops-agent', 'decisions', 'admin');
```

---

#### `listPermissions()`

```ts
const perms = await synapse.listPermissions();
// → Permission[]
```

---

### Admin

#### `freeze()` / `unfreeze()`

Human veto control. When frozen, **all entry writes are rejected** until unfrozen.
Requires workspace write key (`syn_w_`).

```ts
await synapse.freeze();   // agents cannot write
await synapse.unfreeze(); // writing restored
```

---

#### `auditLog(options?)`

Fetch the workspace audit log. Requires write access.

```ts
const events = await synapse.auditLog({ limit: 100 });
for (const ev of events) {
  console.log(ev.timestamp, ev.agent, ev.action);
}
// → AuditEvent[]
```

---

### Federation Bridge

#### `bridge(toWorkspaceId, namespace, content)`

Send an entry from the current workspace into another workspace.
Requires workspace write key. Namespace must start with `shared` or `bridge-`.
Target workspace must have `bridge_policy` set to `"open"` or `"admin-only"`.

```ts
await synapse.bridge(
  'ws_target_workspace_id',
  'shared-updates',
  'Frontend deploy complete — API consumers can upgrade to v2',
);
```

---

### Static Helpers

#### `SynapseClient.generateFingerprint(gatewayId, agentId, secret)`

Generate an agent fingerprint for verified gateway identity.

```ts
const fp = SynapseClient.generateFingerprint('gw-prod-01', 'my-agent', 'shared-secret');
// → '3a7f2b...' (SHA-256 hex)
```

---

#### `SynapseClient.verifyWebhookSignature(body, signature, secret)`

Verify an incoming webhook's HMAC-SHA256 signature. Uses constant-time comparison.

```ts
const valid = SynapseClient.verifyWebhookSignature(
  rawBodyString,                              // raw body before JSON.parse
  req.headers['x-synapse-signature'],         // hex string
  process.env.WEBHOOK_SECRET!,
);
// → boolean
```

---

## Webhook Verification

When you register a webhook with a `secret`, Synapse signs every delivery with
`HMAC-SHA256(body, secret)` and includes the hex digest in the
`X-Synapse-Signature` header.

**Always verify the signature** before processing webhook payloads:

```ts
import { SynapseClient, WebhookPayload } from '@synapse-md/client';
import express from 'express';

const SECRET = process.env.WEBHOOK_SECRET!;

app.post('/hooks/synapse', express.raw({ type: '*/*' }), (req, res) => {
  const sig = req.headers['x-synapse-signature'] as string;

  // ✅ Constant-time comparison — prevents timing attacks
  const valid = SynapseClient.verifyWebhookSignature(
    req.body.toString('utf8'),  // raw bytes → string
    sig,
    SECRET,
  );

  if (!valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(req.body.toString('utf8')) as WebhookPayload;

  console.log('Event:', payload.event);
  console.log('Entry:', payload.entry.content);
  console.log('Urgent:', payload.urgent); // true for 'error' or 'critical' priority

  res.sendStatus(200);
});
```

### Webhook Payload Shape

```ts
interface WebhookPayload {
  event: 'entry.created';
  workspace_id: string;
  entry: {
    id: string;
    from_agent: string;
    namespace: string;
    content: string;
    priority: 'low' | 'info' | 'warn' | 'error' | 'critical';
    tags: string[];
    created_at: string;
  };
  timestamp: string;
  urgent: boolean;  // true when priority is 'error' or 'critical'
}
```

---

## Error Handling

All errors thrown by `SynapseClient` extend `SynapseError`:

```ts
import {
  SynapseError,
  SynapseAuthError,
  SynapseNotFoundError,
  SynapseValidationError,
  SynapseFrozenError,
  SynapseFingerprintError,
} from '@synapse-md/client';

try {
  await synapse.write('status', 'Deploy complete');
} catch (err) {
  if (err instanceof SynapseFrozenError) {
    console.error('Workspace is frozen — human veto active');
  } else if (err instanceof SynapseAuthError) {
    console.error('Auth failed:', err.code, err.status); // AUTH_INVALID, 401
  } else if (err instanceof SynapseNotFoundError) {
    console.error('Not found:', err.code);              // NOT_FOUND, 404
  } else if (err instanceof SynapseValidationError) {
    console.error('Validation failed:', err.details);   // string[]
  } else if (err instanceof SynapseFingerprintError) {
    console.error('Fingerprint mismatch');
  } else if (err instanceof SynapseError) {
    // Any other Synapse error
    console.error(err.status, err.code, err.message);
  }
}
```

### Error Class Reference

| Class | HTTP | Server codes |
|-------|------|-------------|
| `SynapseAuthError` | 401 / 403 | `AUTH_MISSING`, `AUTH_INVALID`, `INSUFFICIENT_PERMISSIONS`, `OWNER_REQUIRED` |
| `SynapseNotFoundError` | 404 | `NOT_FOUND`, `AGENT_NOT_FOUND`, `PERMISSION_NOT_FOUND` |
| `SynapseValidationError` | 400 | `VALIDATION_ERROR`, `WORKSPACE_MISMATCH`, `NAMESPACE_NOT_BRIDGEABLE`, `INVITATION_INVALID` |
| `SynapseFrozenError` | 403 | `WORKSPACE_FROZEN` |
| `SynapseFingerprintError` | 403 | `FINGERPRINT_MISMATCH` |
| `SynapseError` | any | Base class — all other errors |

---

## TypeScript Types

All public types are exported from the package root:

```ts
import type {
  Entry,
  Priority,
  NamespaceInfo,
  AuthInfo,
  Webhook,
  WebhookPayload,
  AuditEvent,
  Permission,
  Agent,
  Workspace,
  SynapseConfig,
  ReadOptions,
  WriteOptions,
  CreateWebhookOptions,
  RegisterAgentOptions,
  AuditLogOptions,
  BridgeOptions,
} from '@synapse-md/client';
```

### `Entry`

```ts
interface Entry {
  id: string;           // 'syn-' prefix
  workspace_id: string;
  from_agent: string;
  namespace: string;
  content: string;
  tags: string[];
  priority: Priority;   // 'low' | 'info' | 'warn' | 'error' | 'critical'
  ttl: string | null;
  created_at: string;   // ISO 8601
}
```

---

## Common Patterns

### Startup health check

```ts
const me = await synapse.whoami();
console.log(`Connected to workspace: ${me.workspaceName} (${me.workspaceId})`);
```

### Agent reads context before acting

```ts
// Grab the last 24 hours of status and decisions
const [statuses, decisions] = await Promise.all([
  synapse.read('status', { since: '24h', limit: 20 }),
  synapse.read('decisions', { since: '7d', limit: 10 }),
]);
// Feed into LLM context window...
```

### Raise a blocker for human review

```ts
await synapse.write('blockers', 'Cannot proceed — awaiting DBA approval for schema migration', {
  priority: 'error',
  tags: ['database', 'needs-human'],
});
```

### Handoff between agents

```ts
// Agent A finishes and hands off to Agent B
await synapse.write('handoff', JSON.stringify({
  to: 'frontend-agent',
  task: 'API endpoints are ready. Schema: /api/v2/users returns camelCase.',
  artifacts: ['openapi.yaml'],
}), {
  priority: 'info',
  tags: ['frontend-agent', 'api-v2'],
});
```

---

## Requirements

- Node.js 18+ (uses native `fetch` and `node:crypto`)
- TypeScript 5+ (for consumers using the type declarations)

---

## License

MIT
