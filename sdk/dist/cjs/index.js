"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynapseFingerprintError = exports.SynapseFrozenError = exports.SynapseValidationError = exports.SynapseNotFoundError = exports.SynapseAuthError = exports.SynapseError = exports.SynapseClient = void 0;
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "SynapseClient", { enumerable: true, get: function () { return client_js_1.SynapseClient; } });
var errors_js_1 = require("./errors.js");
Object.defineProperty(exports, "SynapseError", { enumerable: true, get: function () { return errors_js_1.SynapseError; } });
Object.defineProperty(exports, "SynapseAuthError", { enumerable: true, get: function () { return errors_js_1.SynapseAuthError; } });
Object.defineProperty(exports, "SynapseNotFoundError", { enumerable: true, get: function () { return errors_js_1.SynapseNotFoundError; } });
Object.defineProperty(exports, "SynapseValidationError", { enumerable: true, get: function () { return errors_js_1.SynapseValidationError; } });
Object.defineProperty(exports, "SynapseFrozenError", { enumerable: true, get: function () { return errors_js_1.SynapseFrozenError; } });
Object.defineProperty(exports, "SynapseFingerprintError", { enumerable: true, get: function () { return errors_js_1.SynapseFingerprintError; } });
//# sourceMappingURL=index.js.map