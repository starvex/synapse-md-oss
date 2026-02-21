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
export { SynapseError, SynapseAuthError, SynapseNotFoundError, SynapseValidationError, SynapseFrozenError, SynapseFingerprintError, } from './errors.js';
export type { Priority, AgentRole, OwnerType, AgentStatus, PermissionLevel, BridgePolicy, WebhookStatus, Entry, NamespaceInfo, AuthInfo, Webhook, WebhookPayload, AuditEvent, Permission, Agent, Workspace, SynapseConfig, BridgeOptions, ReadOptions, WriteOptions, CreateWebhookOptions, RegisterAgentOptions, AuditLogOptions, } from './types.js';
//# sourceMappingURL=index.d.ts.map