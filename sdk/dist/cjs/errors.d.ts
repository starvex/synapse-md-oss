/**
 * @synapse-md/client — Error classes
 * All errors thrown by SynapseClient extend SynapseError.
 */
/**
 * Base class for all Synapse SDK errors.
 *
 * @example
 * ```ts
 * try {
 *   await synapse.read('tasks');
 * } catch (err) {
 *   if (err instanceof SynapseError) {
 *     console.error(err.code, err.status, err.message);
 *   }
 * }
 * ```
 */
export declare class SynapseError extends Error {
    /** HTTP status code */
    readonly status: number;
    /** Machine-readable error code from the server (e.g. `AUTH_INVALID`) */
    readonly code: string;
    /** Validation error details (only present for `SynapseValidationError`) */
    readonly details?: string[];
    constructor(message: string, status: number, code: string, details?: string[]);
}
/**
 * Thrown when authentication fails (HTTP 401) or the key lacks
 * sufficient permissions (HTTP 403, non-specific).
 *
 * Server codes: `AUTH_MISSING`, `AUTH_INVALID`, `INSUFFICIENT_PERMISSIONS`,
 * `OWNER_REQUIRED`, `AUTH_ERROR`
 */
export declare class SynapseAuthError extends SynapseError {
    constructor(message: string, status: number, code: string);
}
/**
 * Thrown when a requested resource does not exist or has expired (HTTP 404).
 *
 * Server codes: `NOT_FOUND`, `AGENT_NOT_FOUND`, `PERMISSION_NOT_FOUND`,
 * `INVITATION_NOT_FOUND`
 */
export declare class SynapseNotFoundError extends SynapseError {
    constructor(message: string, code: string);
}
/**
 * Thrown when the request body fails server-side validation (HTTP 400).
 *
 * Server codes: `VALIDATION_ERROR`, `WORKSPACE_MISMATCH`,
 * `NAMESPACE_NOT_BRIDGEABLE`, `INVITATION_INVALID`
 *
 * @example
 * ```ts
 * } catch (err) {
 *   if (err instanceof SynapseValidationError) {
 *     console.error('Validation failed:', err.details);
 *   }
 * }
 * ```
 */
export declare class SynapseValidationError extends SynapseError {
    constructor(message: string, code: string, details?: string[]);
}
/**
 * Thrown when the workspace is frozen and a write is attempted (HTTP 403).
 *
 * Server code: `WORKSPACE_FROZEN`
 */
export declare class SynapseFrozenError extends SynapseError {
    constructor(message: string);
}
/**
 * Thrown when the `X-Agent-Fingerprint` header does not match the expected
 * value (HTTP 403 with a fingerprint-specific code).
 *
 * Server code: `FINGERPRINT_MISMATCH`
 */
export declare class SynapseFingerprintError extends SynapseError {
    constructor(message: string);
}
/**
 * Internal helper — parse a raw error response body and throw the correct
 * SynapseError subclass.
 *
 * @internal
 */
export declare function throwSynapseError(status: number, body: {
    error?: string;
    code?: string;
    details?: string[];
}): never;
//# sourceMappingURL=errors.d.ts.map