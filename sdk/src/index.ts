/**
 * @synapse-md/client
 *
 * TypeScript client SDK for the Synapse protocol.
 * Connect any agent in 3 lines — zero external dependencies.
 *
 * @example
 * ```ts
 * import { SynapseClient } from '@synapse-md/client';
 *
 * const synapse = new SynapseClient({ apiKey: 'syn_a_xxx' });
 * const entries = await synapse.read('tasks');
 * ```
 *
 * @module
 */

export { SynapseClient } from './client.js';

export {
  SynapseError,
  SynapseAuthError,
  SynapseNotFoundError,
  SynapseValidationError,
  SynapseFrozenError,
  SynapseFingerprintError,
} from './errors.js';

export type {
  // Primitives
  Priority,
  AgentRole,
  OwnerType,
  AgentStatus,
  PermissionLevel,
  BridgePolicy,
  WebhookStatus,

  // Core entities
  Entry,
  NamespaceInfo,
  AuthInfo,
  Webhook,
  WebhookPayload,
  AuditEvent,
  Permission,
  Agent,
  Workspace,

  // Config
  SynapseConfig,
  BridgeOptions,

  // Method options
  ReadOptions,
  WriteOptions,
  CreateWebhookOptions,
  RegisterAgentOptions,
  AuditLogOptions,
} from './types.js';
