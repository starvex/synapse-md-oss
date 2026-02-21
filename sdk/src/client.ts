/**
 * @synapse-md/client — SynapseClient
 * Synapse Protocol v2.0 TypeScript client.
 *
 * Zero external dependencies. Requires Node.js 18+ (native fetch + crypto).
 */

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { throwSynapseError } from './errors.js';
import type {
  SynapseConfig,
  Entry,
  NamespaceInfo,
  AuthInfo,
  Webhook,
  AuditEvent,
  Permission,
  Agent,
  ReadOptions,
  WriteOptions,
  CreateWebhookOptions,
  RegisterAgentOptions,
  AuditLogOptions,
} from './types.js';

const DEFAULT_URL = 'https://synapse-api-production-c366.up.railway.app/api/v1';
const DEFAULT_TIMEOUT = 10_000;

/**
 * SynapseClient — the main entry point for the Synapse protocol SDK.
 *
 * Supports all three key types:
 * - `syn_w_` — workspace write key (full access, sent as `Authorization: Bearer`)
 * - `syn_r_` — workspace read key (read-only, sent as `Authorization: Bearer`)
 * - `syn_a_` — agent key (agent-scoped, sent as `X-Agent-Key`)
 *
 * @example
 * ```ts
 * import { SynapseClient } from '@synapse-md/client';
 *
 * const synapse = new SynapseClient({ apiKey: 'syn_a_xxx' });
 * const entries = await synapse.read('tasks');
 * ```
 */
export class SynapseClient {
  private readonly config: Required<SynapseConfig>;
  /** Cached workspace ID — fetched lazily via whoami() */
  private _workspaceId: string | null = null;
  /** Whether the key is an agent key (syn_a_) vs a workspace key (syn_w_ / syn_r_) */
  private readonly isAgentKey: boolean;

  constructor(config: SynapseConfig) {
    if (!config.apiKey) {
      throw new Error('SynapseClient: apiKey is required');
    }
    this.config = {
      url: (config.url ?? DEFAULT_URL).replace(/\/$/, ''),
      apiKey: config.apiKey,
      agentId: config.agentId ?? '',
      fingerprint: config.fingerprint ?? '',
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };
    this.isAgentKey = config.apiKey.startsWith('syn_a_');
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  /**
   * Build the auth headers appropriate for the key type.
   * - Agent keys → `X-Agent-Key`
   * - Workspace keys → `Authorization: Bearer`
   */
  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.isAgentKey) {
      headers['X-Agent-Key'] = this.config.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    if (this.config.fingerprint) {
      headers['X-Agent-Fingerprint'] = this.config.fingerprint;
    }
    return headers;
  }

  /**
   * Core fetch wrapper with timeout, error parsing, and typed response.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.config.url}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeout);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { ...this.authHeaders(), ...extraHeaders },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        throw new Error(`SynapseClient: request timed out after ${this.config.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let errBody: { error?: string; code?: string; details?: string[] } = {};
      try {
        errBody = await res.json() as typeof errBody;
      } catch {
        // ignore parse failure — use status-only error
      }
      throwSynapseError(res.status, errBody);
    }

    // 204 No Content
    if (res.status === 204) {
      return undefined as unknown as T;
    }

    return res.json() as Promise<T>;
  }

  /**
   * GET with query string builder.
   */
  private get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    let qs = '';
    if (params) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') {
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
      }
      if (parts.length) qs = `?${parts.join('&')}`;
    }
    return this.request<T>('GET', `${path}${qs}`);
  }

  /**
   * Lazily resolve the workspace ID from the auth token.
   * The result is cached for the lifetime of the client instance.
   */
  private async workspaceId(): Promise<string> {
    if (!this._workspaceId) {
      const info = await this.whoami();
      this._workspaceId = info.workspaceId;
    }
    return this._workspaceId;
  }

  // ─── Core Operations ─────────────────────────────────────────────────────────

  /**
   * Read entries from a namespace.
   *
   * @param namespace - The namespace to read from (e.g. `"tasks"`, `"status"`)
   * @param options   - Optional filters: limit, tag, fromAgent, since
   *
   * @example
   * ```ts
   * const entries = await synapse.read('tasks', { limit: 10, since: '1h' });
   * ```
   */
  async read(namespace: string, options: ReadOptions = {}): Promise<Entry[]> {
    const res = await this.get<{ entries: Entry[]; total: number }>('/entries', {
      namespace,
      limit: options.limit,
      tag: options.tag,
      from_agent: options.fromAgent,
      since: options.since,
    });
    return res.entries;
  }

  /**
   * Write a new entry to a namespace.
   *
   * @param namespace - Target namespace
   * @param content   - Entry body (plain text or structured text)
   * @param options   - Optional: priority, tags, ttl
   *
   * @example
   * ```ts
   * const entry = await synapse.write('status', 'Deploy complete', {
   *   priority: 'info',
   *   tags: ['deploy'],
   *   ttl: '24h',
   * });
   * ```
   */
  async write(namespace: string, content: string, options: WriteOptions = {}): Promise<Entry> {
    const body: Record<string, unknown> = {
      namespace,
      content,
    };
    if (this.config.agentId) body['from_agent'] = this.config.agentId;
    if (options.priority) body['priority'] = options.priority;
    if (options.tags?.length) body['tags'] = options.tags;
    if (options.ttl) body['ttl'] = options.ttl;

    const res = await this.request<{ id: string; createdAt: string; message: string }>(
      'POST',
      '/entries',
      body,
    );

    // Reconstruct a full Entry from the minimal create response
    return {
      id: res.id,
      workspace_id: this._workspaceId ?? '',
      from_agent: this.config.agentId,
      namespace,
      content,
      tags: options.tags ?? [],
      priority: options.priority ?? 'info',
      ttl: options.ttl ?? null,
      created_at: res.createdAt,
    };
  }

  /**
   * List all namespaces in the workspace with entry counts.
   *
   * @example
   * ```ts
   * const namespaces = await synapse.list();
   * for (const ns of namespaces) {
   *   console.log(ns.namespace, ns.count);
   * }
   * ```
   */
  async list(): Promise<NamespaceInfo[]> {
    // The /entries endpoint without a namespace filter returns all entries.
    // We derive namespace stats by reading the full list and aggregating.
    // The API doesn't expose a dedicated /namespaces endpoint yet, but the
    // workspace status endpoint gives entry counts.
    const res = await this.get<{ entries: Entry[] }>('/entries', { limit: 1000 });
    const map = new Map<string, { count: number; lastEntry: string | null }>();
    for (const e of res.entries) {
      const existing = map.get(e.namespace);
      const isNewer = !existing || e.created_at > (existing.lastEntry ?? '');
      map.set(e.namespace, {
        count: (existing?.count ?? 0) + 1,
        lastEntry: isNewer ? e.created_at : (existing?.lastEntry ?? null),
      });
    }
    return Array.from(map.entries()).map(([namespace, stats]) => ({
      namespace,
      count: stats.count,
      lastEntry: stats.lastEntry,
    }));
  }

  // ─── Entry Operations ────────────────────────────────────────────────────────

  /**
   * Fetch a single entry by ID.
   *
   * @param id - Entry ID (`syn-` prefix)
   * @throws {SynapseNotFoundError} If the entry doesn't exist or has expired
   *
   * @example
   * ```ts
   * const entry = await synapse.getEntry('syn-a1b2c3d4e5f6');
   * ```
   */
  async getEntry(id: string): Promise<Entry> {
    const res = await this.get<{ entry: Entry }>(`/entries/${encodeURIComponent(id)}`);
    return res.entry;
  }

  /**
   * Delete an entry by ID.
   *
   * Requires write access. Only workspace keys or `owner`/`admin` agent keys
   * may delete entries.
   *
   * @param id - Entry ID (`syn-` prefix)
   * @throws {SynapseNotFoundError} If the entry doesn't exist
   *
   * @example
   * ```ts
   * await synapse.deleteEntry('syn-a1b2c3d4e5f6');
   * ```
   */
  async deleteEntry(id: string): Promise<void> {
    await this.request<void>('DELETE', `/entries/${encodeURIComponent(id)}`);
  }

  // ─── Agent Management ────────────────────────────────────────────────────────

  /**
   * Return identity and permission info for the current API key.
   *
   * @example
   * ```ts
   * const me = await synapse.whoami();
   * console.log(me.workspaceId, me.agent?.agentId);
   * ```
   */
  async whoami(): Promise<AuthInfo> {
    return this.get<AuthInfo>('/auth/me');
  }

  /**
   * Register a new agent in the workspace.
   *
   * Requires workspace write key or an `owner`/`admin` agent key.
   * The new agent's key is returned in `agent.agentKey` — **store it immediately**.
   *
   * @param id      - Workspace-scoped agent identifier
   * @param options - Role, displayName, ownerType, model
   *
   * @example
   * ```ts
   * const agent = await synapse.registerAgent('ci-bot', {
   *   displayName: 'CI Bot',
   *   role: 'contributor',
   * });
   * console.log('Save this key:', agent.agentKey);
   * ```
   */
  async registerAgent(id: string, options: RegisterAgentOptions = {}): Promise<Agent> {
    const wsId = await this.workspaceId();
    return this.request<Agent>('POST', `/workspaces/${wsId}/agents`, {
      agentId: id,
      displayName: options.displayName ?? id,
      ownerType: options.ownerType ?? 'service',
      role: options.role ?? 'contributor',
      model: options.model,
    });
  }

  // ─── Webhooks ────────────────────────────────────────────────────────────────

  /**
   * Register a webhook to receive real-time entry notifications.
   *
   * @param url     - HTTPS endpoint that will receive `POST` deliveries
   * @param options - namespaces, events, secret
   *
   * @example
   * ```ts
   * const webhook = await synapse.createWebhook('https://myapp.com/hooks/synapse', {
   *   namespaces: ['tasks', 'alerts'],
   *   secret: process.env.WEBHOOK_SECRET,
   * });
   * ```
   */
  async createWebhook(url: string, options: CreateWebhookOptions = {}): Promise<Webhook> {
    const wsId = await this.workspaceId();
    return this.request<Webhook>('POST', `/workspaces/${wsId}/webhooks`, {
      url,
      namespaces: options.namespaces ?? [],
      events: options.events ?? ['entry.created'],
      secret: options.secret,
    });
  }

  /**
   * List all webhooks registered in the workspace.
   *
   * @example
   * ```ts
   * const hooks = await synapse.listWebhooks();
   * for (const h of hooks) {
   *   console.log(h.webhookId, h.status, h.failureCount);
   * }
   * ```
   */
  async listWebhooks(): Promise<Webhook[]> {
    const wsId = await this.workspaceId();
    const res = await this.get<{ webhooks: Webhook[] }>(`/workspaces/${wsId}/webhooks`);
    return res.webhooks;
  }

  /**
   * Delete a webhook by ID.
   *
   * @param id - Webhook ID (`whk_` prefix)
   *
   * @example
   * ```ts
   * await synapse.deleteWebhook('whk_abc123');
   * ```
   */
  async deleteWebhook(id: string): Promise<void> {
    const wsId = await this.workspaceId();
    await this.request<void>('DELETE', `/workspaces/${wsId}/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * Send a synthetic test event to verify a webhook endpoint is reachable.
   *
   * Delivery is synchronous — the result reflects actual reachability.
   *
   * @param id - Webhook ID (`whk_` prefix)
   *
   * @example
   * ```ts
   * const result = await synapse.testWebhook('whk_abc123');
   * console.log(result.success); // true
   * ```
   */
  async testWebhook(id: string): Promise<{ success: boolean }> {
    const wsId = await this.workspaceId();
    return this.request<{ success: boolean }>(
      'POST',
      `/workspaces/${wsId}/webhooks/${encodeURIComponent(id)}/test`,
    );
  }

  // ─── Permissions ─────────────────────────────────────────────────────────────

  /**
   * Grant or update a namespace permission for an agent.
   *
   * Requires workspace write key or `owner`/`admin` agent key.
   * This call is an upsert — if a row already exists for the same
   * `(agentId, namespace)` pair, it is updated.
   *
   * Use namespace `"*"` to grant access to all current and future namespaces.
   *
   * @param agentId    - Agent to grant permission to
   * @param namespace  - Namespace name or `"*"` for wildcard
   * @param permission - `read` | `write` | `admin`
   *
   * @example
   * ```ts
   * await synapse.setPermission('backend-agent', 'status', 'write');
   * await synapse.setPermission('reader-bot', '*', 'read');
   * ```
   */
  async setPermission(
    agentId: string,
    namespace: string,
    permission: 'read' | 'write' | 'admin',
  ): Promise<void> {
    const wsId = await this.workspaceId();
    await this.request<void>('POST', `/workspaces/${wsId}/permissions`, {
      agentId,
      namespace,
      permission,
    });
  }

  /**
   * List all permission rows in the workspace.
   *
   * @example
   * ```ts
   * const perms = await synapse.listPermissions();
   * ```
   */
  async listPermissions(): Promise<Permission[]> {
    const wsId = await this.workspaceId();
    const res = await this.get<{ permissions: Permission[] }>(`/workspaces/${wsId}/permissions`);
    return res.permissions;
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  /**
   * Freeze the workspace — all entry writes are rejected until unfrozen.
   *
   * Requires workspace **write** key (`syn_w_`). This is the human veto mechanism.
   *
   * @example
   * ```ts
   * await synapse.freeze(); // agents can no longer write
   * ```
   */
  async freeze(): Promise<void> {
    const wsId = await this.workspaceId();
    await this.request<void>('POST', `/workspaces/${wsId}/freeze`, { frozen: true });
  }

  /**
   * Unfreeze the workspace — restores normal write access.
   *
   * Requires workspace **write** key (`syn_w_`).
   *
   * @example
   * ```ts
   * await synapse.unfreeze(); // agents may write again
   * ```
   */
  async unfreeze(): Promise<void> {
    const wsId = await this.workspaceId();
    await this.request<void>('POST', `/workspaces/${wsId}/freeze`, { frozen: false });
  }

  /**
   * Fetch the workspace audit log.
   *
   * Requires write access. Returns API activity for the workspace.
   *
   * @param options - agentId filter, event filter, limit
   *
   * @example
   * ```ts
   * const events = await synapse.auditLog({ limit: 100 });
   * for (const ev of events) {
   *   console.log(ev.timestamp, ev.agent, ev.action);
   * }
   * ```
   */
  async auditLog(options: AuditLogOptions = {}): Promise<AuditEvent[]> {
    const res = await this.get<{ events: AuditEvent[] }>('/audit', {
      limit: options.limit,
    });
    return res.events;
  }

  // ─── Federation Bridge ────────────────────────────────────────────────────────

  /**
   * Bridge an entry from the current workspace into a target workspace.
   *
   * Requires workspace **write** key (`syn_w_`). The target workspace must
   * have `bridge_policy` set to `"open"` or `"admin-only"`. The namespace
   * must start with `shared` or `bridge-`.
   *
   * @param toWorkspaceId - Target workspace ID (`ws_` prefix)
   * @param namespace     - Namespace in the target workspace (must start with `shared` or `bridge-`)
   * @param content       - Entry content
   *
   * @example
   * ```ts
   * await synapse.bridge('ws_target123', 'shared-updates', 'Deploy complete in prod');
   * ```
   */
  async bridge(toWorkspaceId: string, namespace: string, content: string): Promise<Entry> {
    const wsId = await this.workspaceId();
    const res = await this.request<{ id: string; createdAt: string; bridgedFrom: unknown; message: string }>(
      'POST',
      '/bridge',
      {
        from_workspace: wsId,
        to_workspace: toWorkspaceId,
        namespace,
        content,
        from_agent: this.config.agentId || undefined,
      },
    );
    return {
      id: res.id,
      workspace_id: toWorkspaceId,
      from_agent: this.config.agentId,
      namespace,
      content,
      tags: [],
      priority: 'info',
      ttl: null,
      created_at: res.createdAt,
    };
  }

  // ─── Static Helpers ───────────────────────────────────────────────────────────

  /**
   * Generate an agent fingerprint for the `X-Agent-Fingerprint` header.
   *
   * The fingerprint is a SHA-256 hex digest of `"${gatewayId}:${agentId}:${secret}"`.
   * It lets the server verify the agent is running inside a known gateway.
   *
   * @param gatewayId - Stable gateway identifier (e.g. OpenClaw node ID)
   * @param agentId   - Agent ID within the workspace
   * @param secret    - Shared secret known by both the gateway and the server
   *
   * @example
   * ```ts
   * const fp = SynapseClient.generateFingerprint('gw-prod-01', 'r2d2', process.env.FP_SECRET!);
   * const synapse = new SynapseClient({ apiKey, fingerprint: fp });
   * ```
   */
  static generateFingerprint(gatewayId: string, agentId: string, secret: string): string {
    return createHash('sha256')
      .update(`${gatewayId}:${agentId}:${secret}`)
      .digest('hex');
  }

  /**
   * Verify an incoming webhook signature.
   *
   * Synapse signs webhook deliveries with HMAC-SHA256 using the secret you
   * provided at webhook creation. The signature is sent in the
   * `X-Synapse-Signature` header as a hex string.
   *
   * Always use this method instead of a plain `===` comparison — it uses
   * constant-time comparison to prevent timing attacks.
   *
   * @param body      - Raw request body string (before JSON parsing)
   * @param signature - Value of the `X-Synapse-Signature` header
   * @param secret    - Webhook signing secret
   * @returns `true` if the signature is valid
   *
   * @example
   * ```ts
   * // In your Express webhook handler:
   * app.post('/hooks/synapse', express.raw({ type: '*\/*' }), (req, res) => {
   *   const sig = req.headers['x-synapse-signature'] as string;
   *   const valid = SynapseClient.verifyWebhookSignature(req.body.toString(), sig, SECRET);
   *   if (!valid) return res.status(401).send('Bad signature');
   *   const payload = JSON.parse(req.body.toString());
   *   // handle payload...
   *   res.sendStatus(200);
   * });
   * ```
   */
  static verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    try {
      const expected = createHmac('sha256', secret).update(body).digest('hex');
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(signature, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
