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
export class SynapseError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** Machine-readable error code from the server (e.g. `AUTH_INVALID`) */
  readonly code: string;
  /** Validation error details (only present for `SynapseValidationError`) */
  readonly details?: string[];

  constructor(message: string, status: number, code: string, details?: string[]) {
    super(message);
    this.name = 'SynapseError';
    this.status = status;
    this.code = code;
    this.details = details;

    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when authentication fails (HTTP 401) or the key lacks
 * sufficient permissions (HTTP 403, non-specific).
 *
 * Server codes: `AUTH_MISSING`, `AUTH_INVALID`, `INSUFFICIENT_PERMISSIONS`,
 * `OWNER_REQUIRED`, `AUTH_ERROR`
 */
export class SynapseAuthError extends SynapseError {
  constructor(message: string, status: number, code: string) {
    super(message, status, code);
    this.name = 'SynapseAuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a requested resource does not exist or has expired (HTTP 404).
 *
 * Server codes: `NOT_FOUND`, `AGENT_NOT_FOUND`, `PERMISSION_NOT_FOUND`,
 * `INVITATION_NOT_FOUND`
 */
export class SynapseNotFoundError extends SynapseError {
  constructor(message: string, code: string) {
    super(message, 404, code);
    this.name = 'SynapseNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
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
export class SynapseValidationError extends SynapseError {
  constructor(message: string, code: string, details?: string[]) {
    super(message, 400, code, details);
    this.name = 'SynapseValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the workspace is frozen and a write is attempted (HTTP 403).
 *
 * Server code: `WORKSPACE_FROZEN`
 */
export class SynapseFrozenError extends SynapseError {
  constructor(message: string) {
    super(message, 403, 'WORKSPACE_FROZEN');
    this.name = 'SynapseFrozenError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the `X-Agent-Fingerprint` header does not match the expected
 * value (HTTP 403 with a fingerprint-specific code).
 *
 * Server code: `FINGERPRINT_MISMATCH`
 */
export class SynapseFingerprintError extends SynapseError {
  constructor(message: string) {
    super(message, 403, 'FINGERPRINT_MISMATCH');
    this.name = 'SynapseFingerprintError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Internal helper — parse a raw error response body and throw the correct
 * SynapseError subclass.
 *
 * @internal
 */
export function throwSynapseError(status: number, body: {
  error?: string;
  code?: string;
  details?: string[];
}): never {
  const message = body.error ?? `HTTP ${status}`;
  const code = body.code ?? 'UNKNOWN';
  const details = body.details;

  switch (code) {
    case 'WORKSPACE_FROZEN':
      throw new SynapseFrozenError(message);

    case 'FINGERPRINT_MISMATCH':
      throw new SynapseFingerprintError(message);

    case 'VALIDATION_ERROR':
    case 'WORKSPACE_MISMATCH':
    case 'NAMESPACE_NOT_BRIDGEABLE':
    case 'INVITATION_INVALID':
      throw new SynapseValidationError(message, code, details);

    case 'NOT_FOUND':
    case 'AGENT_NOT_FOUND':
    case 'PERMISSION_NOT_FOUND':
    case 'INVITATION_NOT_FOUND':
      throw new SynapseNotFoundError(message, code);
  }

  if (status === 401 || status === 403) {
    throw new SynapseAuthError(message, status, code);
  }

  if (status === 404) {
    throw new SynapseNotFoundError(message, code);
  }

  throw new SynapseError(message, status, code, details);
}
