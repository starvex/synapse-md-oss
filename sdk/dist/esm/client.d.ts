/**
 * @synapse-md/client — SynapseClient
 * Synapse Protocol v2.0 TypeScript client.
 *
 * Zero external dependencies. Requires Node.js 18+ (native fetch + crypto).
 */
import type { SynapseConfig, Entry, NamespaceInfo, AuthInfo, Webhook, AuditEvent, Permission, Agent, ReadOptions, WriteOptions, CreateWebhookOptions, RegisterAgentOptions, AuditLogOptions } from './types.js';
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
export declare class SynapseClient {
    private readonly config;
    /** Cached workspace ID — fetched lazily via whoami() */
    private _workspaceId;
    /** Whether the key is an agent key (syn_a_) vs a workspace key (syn_w_ / syn_r_) */
    private readonly isAgentKey;
    constructor(config: SynapseConfig);
    /**
     * Build the auth headers appropriate for the key type.
     * - Agent keys → `X-Agent-Key`
     * - Workspace keys → `Authorization: Bearer`
     */
    private authHeaders;
    /**
     * Core fetch wrapper with timeout, error parsing, and typed response.
     */
    private request;
    /**
     * GET with query string builder.
     */
    private get;
    /**
     * Lazily resolve the workspace ID from the auth token.
     * The result is cached for the lifetime of the client instance.
     */
    private workspaceId;
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
    read(namespace: string, options?: ReadOptions): Promise<Entry[]>;
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
    write(namespace: string, content: string, options?: WriteOptions): Promise<Entry>;
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
    list(): Promise<NamespaceInfo[]>;
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
    getEntry(id: string): Promise<Entry>;
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
    deleteEntry(id: string): Promise<void>;
    /**
     * Return identity and permission info for the current API key.
     *
     * @example
     * ```ts
     * const me = await synapse.whoami();
     * console.log(me.workspaceId, me.agent?.agentId);
     * ```
     */
    whoami(): Promise<AuthInfo>;
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
    registerAgent(id: string, options?: RegisterAgentOptions): Promise<Agent>;
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
    createWebhook(url: string, options?: CreateWebhookOptions): Promise<Webhook>;
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
    listWebhooks(): Promise<Webhook[]>;
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
    deleteWebhook(id: string): Promise<void>;
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
    testWebhook(id: string): Promise<{
        success: boolean;
    }>;
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
    setPermission(agentId: string, namespace: string, permission: 'read' | 'write' | 'admin'): Promise<void>;
    /**
     * List all permission rows in the workspace.
     *
     * @example
     * ```ts
     * const perms = await synapse.listPermissions();
     * ```
     */
    listPermissions(): Promise<Permission[]>;
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
    freeze(): Promise<void>;
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
    unfreeze(): Promise<void>;
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
    auditLog(options?: AuditLogOptions): Promise<AuditEvent[]>;
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
    bridge(toWorkspaceId: string, namespace: string, content: string): Promise<Entry>;
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
    static generateFingerprint(gatewayId: string, agentId: string, secret: string): string;
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
    static verifyWebhookSignature(body: string, signature: string, secret: string): boolean;
}
//# sourceMappingURL=client.d.ts.map