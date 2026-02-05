# Per-Agent API Keys Specification

## Feature Overview

### Motivation

The current Synapse API uses workspace-level API keys (one write key, one read key) shared across all agents within a workspace. This approach has several limitations:

1. **Audit Trails**: Cannot track which agent performed specific actions
2. **Security**: Key compromise affects all agents in the workspace
3. **Granular Permissions**: No ability to restrict specific agents' access
4. **Revocation**: Cannot revoke access for a single agent without affecting others
5. **Compliance**: Difficult to meet security requirements for agent-specific access control

### Solution

Implement per-agent API keys that provide:
- Individual authentication credentials for each agent
- Granular permission control (read, write, admin)
- Complete audit trail of agent actions
- Selective key revocation
- Automatic agent identification in requests

### Migration Path

The implementation maintains backward compatibility:
- Existing workspace keys continue to function
- Workspace keys require explicit `agentId` in request body
- Gradual migration to agent-specific keys
- No breaking changes to existing integrations

## API Endpoints Specification

### Create Agent Key

**Endpoint**: `POST /api/v1/workspaces/:wsId/agents/:agentId/keys`

**Authentication**: Workspace admin key or agent admin key

**Request Body**:
```json
{
  "name": "Agent Primary Key",
  "permissions": ["read", "write"],
  "expiresAt": "2024-12-31T23:59:59Z" // optional
}
```

**Response** (201):
```json
{
  "keyId": "key_abc123",
  "key": "syn_a_agent-001_xK9mN2pQ7vR3sL8fH4jD",
  "name": "Agent Primary Key",
  "permissions": ["read", "write"],
  "createdAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2024-12-31T23:59:59Z",
  "agentId": "agent-001"
}
```

**Error Responses**:
- 400: Invalid request body or permissions
- 403: Insufficient permissions to create keys for this agent
- 404: Workspace or agent not found

### List Agent Keys

**Endpoint**: `GET /api/v1/workspaces/:wsId/agents/:agentId/keys`

**Authentication**: Workspace admin key, agent admin key, or agent's own key

**Response** (200):
```json
{
  "keys": [
    {
      "keyId": "key_abc123",
      "name": "Agent Primary Key",
      "permissions": ["read", "write"],
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUsed": "2024-01-20T14:22:15Z",
      "expiresAt": "2024-12-31T23:59:59Z",
      "revoked": false
    }
  ]
}
```

**Note**: The actual key value is never returned in list operations.

### Revoke Key

**Endpoint**: `DELETE /api/v1/workspaces/:wsId/keys/:keyId`

**Authentication**: Workspace admin key or agent admin key

**Response** (204): No content

**Error Responses**:
- 403: Insufficient permissions to revoke this key
- 404: Key not found

### List All Keys (Admin)

**Endpoint**: `GET /api/v1/workspaces/:wsId/keys`

**Authentication**: Workspace admin key only

**Query Parameters**:
- `agentId`: Filter by specific agent (optional)
- `revoked`: Include revoked keys (default: false)

**Response** (200):
```json
{
  "keys": [
    {
      "keyId": "key_abc123",
      "agentId": "agent-001",
      "name": "Agent Primary Key",
      "permissions": ["read", "write"],
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUsed": "2024-01-20T14:22:15Z",
      "expiresAt": "2024-12-31T23:59:59Z",
      "revoked": false
    }
  ]
}
```

## Key Format and Structure

### Agent Key Format

```
syn_a_{agentId}_{randomString}
```

**Components**:
- `syn`: Synapse prefix
- `a`: Agent key indicator
- `{agentId}`: The agent identifier (URL-safe)
- `{randomString}`: 24-character cryptographically secure random string

**Examples**:
- `syn_a_agent-001_xK9mN2pQ7vR3sL8fH4jD`
- `syn_a_frontend_mP8qR5tY9wE2nA6bC3xF`

### Permission Levels

1. **read**: Can read entries and workspace metadata
2. **write**: Can create and update entries (implies read)
3. **admin**: Can manage agent keys and settings (implies read/write)

### Key Metadata

```json
{
  "keyId": "key_abc123",
  "workspaceId": "ws_xyz789",
  "agentId": "agent-001",
  "name": "User-friendly key name",
  "permissions": ["read", "write"],
  "keyHash": "sha256_hash_of_key",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastUsed": "2024-01-20T14:22:15Z",
  "expiresAt": "2024-12-31T23:59:59Z", // nullable
  "revoked": false
}
```

## Authentication Flow Changes

### Agent Key Authentication

1. **Request Processing**:
   - Extract API key from `Authorization: Bearer {key}` header
   - Parse key format to identify type (workspace vs agent)
   - For agent keys (`syn_a_*`), extract `agentId` from key format
   - Validate key and permissions

2. **Automatic Agent Identification**:
   - Agent keys automatically identify the requesting agent
   - No need for explicit `agentId` in request body
   - All operations are automatically scoped to the authenticated agent

3. **Entry Tagging**:
   - Entries created with agent keys are automatically tagged with `agentId`
   - Audit logs include agent information for all operations

### Backward Compatibility

**Workspace Keys**:
- Continue to work for all existing functionality
- Must include `agentId` in request body for entry operations
- Gradually deprecated in favor of agent keys

**Request Body Changes**:
```json
// Workspace key requests (backward compatible)
{
  "agentId": "agent-001", // required for workspace keys
  "content": "Entry content",
  "tags": ["tag1", "tag2"]
}

// Agent key requests (agentId auto-detected)
{
  "content": "Entry content",
  "tags": ["tag1", "tag2"]
}
```

## Database Schema

### New Table: `agent_keys`

```sql
CREATE TABLE agent_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  key_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_permissions CHECK (
    permissions <@ ARRAY['read', 'write', 'admin']
  )
);

-- Indexes for performance
CREATE INDEX idx_agent_keys_workspace_agent ON agent_keys(workspace_id, agent_id);
CREATE INDEX idx_agent_keys_key_hash ON agent_keys(key_hash) WHERE NOT revoked;
CREATE INDEX idx_agent_keys_workspace_active ON agent_keys(workspace_id) WHERE NOT revoked;
```

### Schema Considerations

1. **Key Storage**: Store bcrypt hash of the key, never plaintext
2. **Soft Deletion**: Use `revoked` flag instead of hard deletion
3. **Indexing**: Optimize for key lookup and agent filtering
4. **Constraints**: Validate permission arrays and expiration dates

### Migration Script

```sql
-- Add agent_id column to existing entries table for tracking
ALTER TABLE entries ADD COLUMN agent_id VARCHAR(255);

-- Update existing entries to mark as "legacy" if needed
UPDATE entries SET agent_id = 'legacy' WHERE agent_id IS NULL;

-- Add index for agent-based queries
CREATE INDEX idx_entries_agent ON entries(agent_id);
```

## Dashboard Integration

### Key Management UI

#### Workspace Admin View

**Location**: `/workspaces/:wsId/keys`

**Features**:
- List all keys across agents
- Filter by agent, permission level, or status
- Bulk revocation capabilities
- Key usage statistics and last activity
- Export audit logs

**UI Components**:
```typescript
interface KeyListView {
  filters: {
    agentId?: string;
    permissions?: Permission[];
    status: 'active' | 'revoked' | 'expired' | 'all';
  };
  columns: ['agent', 'name', 'permissions', 'created', 'lastUsed', 'actions'];
  actions: ['revoke', 'view-details'];
}
```

#### Agent Detail Page

**Location**: `/workspaces/:wsId/agents/:agentId`

**Key Management Section**:
- List agent's keys
- Create new key button
- Key usage charts
- Recent activity log

**UI Flow**:
1. **Create Key Modal**:
   - Key name input
   - Permission checkboxes (read, write, admin)
   - Optional expiration date
   - Generate key button

2. **Key Display**:
   - Show generated key once (copy-to-clipboard)
   - Security warning about key storage
   - Key metadata display

#### Key Details Modal

**Features**:
- Full key metadata
- Usage history chart
- Associated entries count
- Revoke key action

### Implementation Guidelines

1. **Security**:
   - Never display full API keys in UI after creation
   - Implement copy-to-clipboard for key generation
   - Show clear security warnings

2. **UX**:
   - Clear visual distinction between agent and workspace keys
   - Intuitive permission management
   - Confirmation dialogs for destructive actions

3. **Monitoring**:
   - Key usage analytics
   - Unusual activity alerts
   - Permission change audit trails

## Implementation Checklist

### Backend Implementation

- [ ] Database schema migration
- [ ] Agent key generation and validation
- [ ] Authentication middleware updates
- [ ] API endpoint implementation
- [ ] Key revocation mechanism
- [ ] Audit logging enhancements
- [ ] Backward compatibility testing

### Frontend Implementation

- [ ] Key management UI components
- [ ] Agent detail page integration
- [ ] Workspace admin key dashboard
- [ ] Key creation flow
- [ ] Usage analytics charts
- [ ] Security warning components

### Testing & Security

- [ ] Unit tests for key generation/validation
- [ ] Integration tests for auth flow
- [ ] Security audit of key storage
- [ ] Performance testing for key lookup
- [ ] Backward compatibility verification
- [ ] Documentation and examples

## Notes for Implementation

1. **Security Priority**: Implement secure key generation and hashing before any other features
2. **Gradual Rollout**: Deploy with feature flags for controlled rollout
3. **Monitoring**: Implement comprehensive logging for security audit
4. **Documentation**: Update API documentation and provide migration guides
5. **Testing**: Extensive testing of auth flows and backward compatibility

This specification provides the foundation for implementing per-agent API keys while maintaining system security and backward compatibility.