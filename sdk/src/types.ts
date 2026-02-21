/**
 * @synapse-md/client — Type definitions
 * Synapse Protocol v2.0
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Entry priority level, controlling urgency and webhook `urgent` flag. */
export type Priority = 'low' | 'info' | 'warn' | 'error' | 'critical';

/** Agent role within a workspace. */
export type AgentRole = 'owner' | 'admin' | 'contributor' | 'reader';

/** Agent owner type. */
export type OwnerType = 'human' | 'service' | 'anonymous';

/** Agent status. */
export type AgentStatus = 'active' | 'pending' | 'revoked';

/** Namespace permission level. */
export type PermissionLevel = 'read' | 'write' | 'admin';

/** Bridge policy for a workspace. */
export type BridgePolicy = 'none' | 'admin-only' | 'open';

/** Webhook status. */
export type WebhookStatus = 'active' | 'failed';

// ─── Core Entities ────────────────────────────────────────────────────────────

/**
 * A single entry written to a namespace.
 * Entries are the fundamental unit of agent communication.
 */
export interface Entry {
  /** Unique entry ID (`syn-` prefix) */
  id: string;
  /** Parent workspace ID */
  workspace_id: string;
  /** Agent that wrote this entry */
  from_agent: string;
  /** Logical channel (e.g. `status`, `decisions`, `handoff`) */
  namespace: string;
  /** Entry body — plain text or structured text */
  content: string;
  /** Searchable labels */
  tags: string[];
  /** Urgency level */
  priority: Priority;
  /** Time-to-live string (`30m`, `24h`, `7d`) or null for never */
  ttl: string | null;
  /** ISO 8601 creation timestamp */
  created_at: string;
}

/**
 * Namespace metadata returned by the list namespaces endpoint.
 */
export interface NamespaceInfo {
  /** Namespace name */
  namespace: string;
  /** Number of active (non-expired) entries */
  count: number;
  /** ISO 8601 timestamp of the most recent entry */
  lastEntry: string | null;
}

/**
 * Authentication and identity information for the current API key.
 */
export interface AuthInfo {
  /** Workspace ID */
  workspaceId: string;
  /** Workspace name */
  workspaceName: string;
  /** Agent info — null when authenticating with a workspace key */
  agent: {
    agentId: string;
    displayName: string;
    role: AgentRole;
  } | null;
  /** Summary of read/write access */
  permissions: {
    read: boolean;
    write: boolean;
  };
}

/**
 * A registered webhook that receives real-time entry notifications.
 */
export interface Webhook {
  /** Webhook ID (`whk_` prefix) */
  webhookId: string;
  /** Agent that registered the webhook */
  agentId?: string;
  /** Target URL for delivery */
  url: string;
  /** Namespaces to watch; empty array or `["*"]` = all */
  namespaces: string[];
  /** Event types (currently only `entry.created`) */
  events: string[];
  /** Webhook status */
  status: WebhookStatus;
  /** Consecutive failure count */
  failureCount?: number;
  /** ISO 8601 timestamp of the last delivery attempt */
  lastDelivery?: string | null;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/**
 * A single audit log event.
 */
export interface AuditEvent {
  /** HTTP action, e.g. `POST /api/v1/entries` */
  action: string;
  /** Agent ID or `null` for workspace-key requests */
  agent: string | null;
  /** ISO 8601 event timestamp */
  timestamp: string;
  /** Human-readable details */
  details: string;
  /** Auth key type: `agent` or `workspace` */
  keyType: 'agent' | 'workspace';
  /** Client IP address */
  ip: string;
}

/**
 * A namespace permission row granting an agent access at a given level.
 */
export interface Permission {
  /** Permission record UUID */
  id: string;
  /** Parent workspace ID */
  workspace_id: string;
  /** Agent this permission applies to */
  agent_id: string;
  /** Namespace name, or `"*"` for wildcard */
  namespace: string;
  /** Access level */
  permission: PermissionLevel;
  /** ISO 8601 creation timestamp */
  created_at: string;
}

/**
 * An agent registered in a workspace.
 */
export interface Agent {
  /** Internal UUID */
  id: string;
  /** Workspace-scoped identifier */
  agentId: string;
  /** Human-readable name */
  displayName: string;
  /** Owner type */
  ownerType: OwnerType;
  /** Required for human agents */
  ownerEmail: string | null;
  /** Access role */
  role: AgentRole;
  /** Agent status */
  status: AgentStatus;
  /** AI model identifier */
  model: string | null;
  /** Avatar URL or emoji */
  avatar: string | null;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-update timestamp */
  updatedAt?: string;
  /** Agent key — only returned at creation time */
  agentKey?: string;
}

/**
 * Workspace information.
 */
export interface Workspace {
  /** Workspace ID (`ws_` prefix) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Full-access write key — only returned at creation */
  writeKey?: string;
  /** Read-only key — only returned at creation */
  readKey?: string;
  /** Federation policy */
  bridge_policy: BridgePolicy;
  /** When true, all entry writes are rejected */
  frozen: boolean;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/**
 * Webhook delivery payload (for receiving webhook events).
 */
export interface WebhookPayload {
  /** Event type — currently always `entry.created` */
  event: 'entry.created';
  /** Source workspace ID */
  workspace_id: string;
  /** The entry that was created */
  entry: Omit<Entry, 'workspace_id' | 'ttl'>;
  /** ISO 8601 delivery timestamp */
  timestamp: string;
  /** True for `critical` or `error` priority entries */
  urgent: boolean;
}

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * Configuration for the SynapseClient.
 */
export interface SynapseConfig {
  /**
   * API key — workspace key (`syn_w_` / `syn_r_`) or agent key (`syn_a_`).
   * Agent keys are sent as `X-Agent-Key`; workspace keys as `Authorization: Bearer`.
   */
  apiKey: string;
  /**
   * Base URL of the Synapse API.
   * @default "https://synapse-api-production-c366.up.railway.app/api/v1"
   */
  url?: string;
  /**
   * Agent ID to include as `from_agent` when using workspace keys.
   * Ignored when using agent keys (identity is enforced server-side).
   */
  agentId?: string;
  /**
   * Value for the `X-Agent-Fingerprint` header.
   * Generate with `SynapseClient.generateFingerprint()`.
   */
  fingerprint?: string;
  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  timeout?: number;
}

// ─── Method Options ───────────────────────────────────────────────────────────

/** Options for `read()`. */
export interface ReadOptions {
  /** Maximum number of entries to return */
  limit?: number;
  /** Filter by tag */
  tag?: string;
  /** Filter by agent ID */
  fromAgent?: string;
  /**
   * Return entries newer than this duration.
   * Supported: `30m`, `24h`, `7d`
   */
  since?: string;
}

/** Options for `write()`. */
export interface WriteOptions {
  /** Entry priority (default: `info`) */
  priority?: Priority;
  /** Searchable labels */
  tags?: string[];
  /**
   * Time-to-live — `30m`, `24h`, `7d`, or omit for no expiry.
   */
  ttl?: string;
}

/** Options for `createWebhook()`. */
export interface CreateWebhookOptions {
  /** Namespaces to watch; empty or omitted = all namespaces */
  namespaces?: string[];
  /** Event types (default: `["entry.created"]`) */
  events?: string[];
  /** HMAC-SHA256 signing secret */
  secret?: string;
}

/** Options for `registerAgent()`. */
export interface RegisterAgentOptions {
  /** Agent role (default: `contributor`) */
  role?: AgentRole;
  /** Human-readable display name */
  displayName?: string;
  /** Owner type (default: `service`) */
  ownerType?: OwnerType;
  /** AI model identifier */
  model?: string;
}

/** Options for `auditLog()`. */
export interface AuditLogOptions {
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by event string */
  event?: string;
  /** Maximum number of events to return */
  limit?: number;
}

/** Options for the bridge call. */
export interface BridgeOptions {
  /** Target workspace ID */
  toWorkspaceId: string;
  /** Namespace — must start with `shared` or `bridge-` */
  namespace: string;
  /** Entry content */
  content: string;
  /** Agent writing the entry */
  fromAgent?: string;
}
