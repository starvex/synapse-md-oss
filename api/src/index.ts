import { Hono, Context } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';

// Type definitions
interface Workspace {
  id: string;
  name: string;
  write_key: string;
  read_key: string;
  created_at: string;
}

interface Agent {
  id: string;
  workspaceId: string;
  agentId: string;
  agentKey: string;
  displayName: string;
  ownerType: string; // "human" | "service" | "anonymous"
  ownerEmail: string | null;
  role: string; // "owner" | "admin" | "contributor" | "reader"
  status: string; // "active" | "pending" | "revoked"
  model: string | null; // e.g., "claude-opus-4-5", "gpt-4o"
  avatar: string | null; // avatar URL or emoji
  createdAt: string;
  updatedAt: string;
}

interface Invitation {
  id: string;
  workspaceId: string;
  role: string; // "admin" | "contributor" | "reader"
  namespaces: string[];
  createdBy: string;
  expiresAt: string | null;
  maxUses: number;
  uses: number;
  status: string; // "active" | "expired" | "revoked" | "used"
  createdAt: string;
}

interface AppContext {
  workspace?: Workspace;
  isWriteKey?: boolean;
  isReadKey?: boolean;
  apiKey?: string;
}

type AppEnvironment = {
  Variables: AppContext;
};

const app = new Hono<AppEnvironment>();
const PORT = parseInt(process.env.PORT || '3210', 10);

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database initialization
async function initDatabase() {
  const client = await pool.connect();
  try {
    const createWorkspaces = `
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        write_key TEXT UNIQUE NOT NULL,
        read_key TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const createEntries = `
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        from_agent TEXT NOT NULL,
        namespace TEXT DEFAULT 'general',
        content TEXT NOT NULL,
        tags JSONB DEFAULT '[]',
        priority TEXT DEFAULT 'info',
        ttl TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
      )
    `;

    // Keep old agents table for backward compatibility, create new table
    const createAgents = `
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        role TEXT,
        capabilities JSONB DEFAULT '[]',
        last_seen TIMESTAMPTZ DEFAULT NOW(),
        registered_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, workspace_id),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
      )
    `;

    const createAgentsV2 = `
      CREATE TABLE IF NOT EXISTS agents_v2 (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        agent_key TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        owner_type TEXT NOT NULL DEFAULT 'service',
        owner_email TEXT,
        role TEXT NOT NULL DEFAULT 'contributor',
        status TEXT NOT NULL DEFAULT 'active',
        model TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(workspace_id, agent_id),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
        CHECK (owner_type IN ('human', 'service', 'anonymous')),
        CHECK (role IN ('owner', 'admin', 'contributor', 'reader')),
        CHECK (status IN ('active', 'pending', 'revoked'))
      )
    `;
    
    // Migration: add model column if missing
    const addModelColumn = `
      ALTER TABLE agents_v2 ADD COLUMN IF NOT EXISTS model TEXT;
    `;

    const createAuditLog = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        action TEXT NOT NULL,
        agent TEXT,
        key_type TEXT,
        details TEXT,
        ip TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
      )
    `;

    const createAgentKeys = `
      CREATE TABLE IF NOT EXISTS agent_keys (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        permissions TEXT NOT NULL DEFAULT 'write',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
      )
    `;

    const createAgentKeysIndices = `
      CREATE INDEX IF NOT EXISTS idx_agent_keys_hash ON agent_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_agent_keys_workspace ON agent_keys(workspace_id);
    `;

    const createPermissions = `
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,  -- references agents_v2.agent_id
        namespace TEXT NOT NULL,  -- "*" means all namespaces
        permission TEXT NOT NULL, -- "read" | "write" | "admin"
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(workspace_id, agent_id, namespace),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
      )
    `;

    const createPermissionsIndices = `
      CREATE INDEX IF NOT EXISTS idx_permissions_workspace_agent ON permissions(workspace_id, agent_id);
      CREATE INDEX IF NOT EXISTS idx_permissions_workspace_namespace ON permissions(workspace_id, namespace);
    `;

    const createInvitations = `
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'contributor',
        namespaces JSONB DEFAULT '[]',
        created_by TEXT NOT NULL,
        expires_at TIMESTAMPTZ,
        max_uses INTEGER DEFAULT 1,
        uses INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
        CHECK (role IN ('admin', 'contributor', 'reader')),
        CHECK (status IN ('active', 'expired', 'revoked', 'used'))
      )
    `;

    const createInvitationsIndices = `
      CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON invitations(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
    `;

    await client.query(createWorkspaces);
    await client.query(createEntries);
    await client.query(createAgents);
    await client.query(createAgentsV2);
    await client.query(addModelColumn).catch(() => {}); // Ignore if column exists
    await client.query(createAuditLog);
    await client.query(createAgentKeys);
    await client.query(createAgentKeysIndices);
    await client.query(createPermissions);
    await client.query(createPermissionsIndices);
    await client.query(createInvitations);
    await client.query(createInvitationsIndices);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Key generation functions
function generateWorkspaceId(): string {
  return 'ws_' + crypto.randomBytes(8).toString('hex');
}

function generateWriteKey(): string {
  return 'syn_w_' + crypto.randomBytes(16).toString('hex');
}

function generateReadKey(): string {
  return 'syn_r_' + crypto.randomBytes(16).toString('hex');
}

function generateEntryId(): string {
  return 'syn-' + crypto.randomBytes(12).toString('hex');
}

function generateAgentKey(): string {
  const randomPart = crypto.randomBytes(16).toString('hex'); // 32 chars
  return `syn_a_${randomPart}`;
}

function generateKeyId(): string {
  return 'key_' + crypto.randomBytes(8).toString('hex');
}

function generateInvitationId(): string {
  return 'inv_' + crypto.randomBytes(12).toString('hex');
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// TTL parsing function
function parseTTL(ttl: string): Date | null {
  if (!ttl || ttl === 'never') return null;
  
  const match = ttl.match(/^(\d+)([hdm])$/);
  if (!match) return null;
  
  const [, num, unit] = match;
  const value = parseInt(num!, 10);
  const now = new Date();
  
  switch (unit) {
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000);
    default:
      return null;
  }
}

// Check if entry is expired
function isExpired(createdAt: string, ttl: string | null): boolean {
  if (!ttl) return false;
  
  const created = new Date(createdAt);
  const match = ttl.match(/^(\d+)([hdm])$/);
  if (!match) return false;
  
  const [, num, unit] = match;
  const value = parseInt(num!, 10);
  let expiryTime = created.getTime();
  
  switch (unit) {
    case 'h':
      expiryTime += value * 60 * 60 * 1000;
      break;
    case 'd':
      expiryTime += value * 24 * 60 * 60 * 1000;
      break;
    case 'm':
      expiryTime += value * 60 * 1000;
      break;
    default:
      return false;
  }
  
  return new Date() > new Date(expiryTime);
}

// Database query functions
async function getWorkspaceByKey(key: string): Promise<Workspace | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM workspaces WHERE write_key = $1 OR read_key = $1',
      [key]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function createWorkspace(id: string, name: string, writeKey: string, readKey: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO workspaces (id, name, write_key, read_key) VALUES ($1, $2, $3, $4)',
      [id, name, writeKey, readKey]
    );
  } finally {
    client.release();
  }
}

async function getEntries(workspaceId: string, limit: number): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM entries WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2',
      [workspaceId, limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getEntriesWithFilters(
  workspaceId: string, 
  sinceDate: string | null, 
  timeModifier: string | null,
  namespace: string | null, 
  fromAgent: string | null, 
  limit: number
): Promise<any[]> {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM entries WHERE workspace_id = $1';
    const params = [workspaceId];
    let paramCount = 1;

    if (sinceDate && timeModifier) {
      paramCount++;
      query += ` AND created_at > NOW() + INTERVAL '${timeModifier}'`;
    }

    if (namespace) {
      paramCount++;
      query += ` AND namespace = $${paramCount}`;
      params.push(namespace);
    }

    if (fromAgent) {
      paramCount++;
      query += ` AND from_agent = $${paramCount}`;
      params.push(fromAgent);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1}`;
    params.push(limit.toString());

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function createEntry(
  id: string, 
  workspaceId: string, 
  fromAgent: string, 
  namespace: string, 
  content: string, 
  tags: string[], 
  priority: string, 
  ttl: string | null
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO entries (id, workspace_id, from_agent, namespace, content, tags, priority, ttl) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, workspaceId, fromAgent, namespace, content, JSON.stringify(tags), priority, ttl]
    );
  } finally {
    client.release();
  }
}

// Legacy agent functions - keeping for backward compatibility but deprecated
async function getAgents(workspaceId: string): Promise<any[]> {
  // Return empty for now as we transition to new agent system
  return [];
}

async function upsertAgent(
  id: string, 
  workspaceId: string, 
  role: string | null, 
  capabilities: string[], 
  registeredAt: string
): Promise<void> {
  // Deprecated - keeping for backward compatibility
  console.warn('upsertAgent is deprecated, use createAgent instead');
}

async function getWorkspaceStats(workspaceId: string): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        w.name as workspace_name,
        (SELECT COUNT(*) FROM agents WHERE workspace_id = w.id) as agent_count,
        (SELECT COUNT(*) FROM entries WHERE workspace_id = w.id) as entry_count,
        (SELECT MAX(created_at) FROM entries WHERE workspace_id = w.id) as last_activity
       FROM workspaces w
       WHERE w.id = $1`,
      [workspaceId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getAuditLog(workspaceId: string, sinceDate: string | null, timeModifier: string | null, limit: number): Promise<any[]> {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM audit_log WHERE workspace_id = $1';
    const params = [workspaceId];

    if (sinceDate && timeModifier) {
      query += ` AND timestamp > NOW() + INTERVAL '${timeModifier}'`;
    }

    query += ' ORDER BY timestamp DESC LIMIT $2';
    params.push(limit.toString());

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function logAudit(workspaceId: string, action: string, agent: string | null, keyType: string, details: string, ip: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO audit_log (workspace_id, action, agent, key_type, details, ip) VALUES ($1, $2, $3, $4, $5, $6)',
      [workspaceId, action, agent, keyType, details, ip]
    );
  } finally {
    client.release();
  }
}

async function getAgentKey(keyHash: string): Promise<any | null> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM agent_keys WHERE key_hash = $1 AND revoked = FALSE', [keyHash]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function createAgentKey(id: string, workspaceId: string, agentId: string, keyHash: string, keyPrefix: string, permissions: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO agent_keys (id, workspace_id, agent_id, key_hash, key_prefix, permissions) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, workspaceId, agentId, keyHash, keyPrefix, permissions]
    );
  } finally {
    client.release();
  }
}

async function getAgentKeys(workspaceId: string): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM agent_keys WHERE workspace_id = $1 AND revoked = FALSE', [workspaceId]);
    return result.rows;
  } finally {
    client.release();
  }
}

async function getAgentKeysByAgent(workspaceId: string, agentId: string): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM agent_keys WHERE workspace_id = $1 AND agent_id = $2 AND revoked = FALSE', [workspaceId, agentId]);
    return result.rows;
  } finally {
    client.release();
  }
}

async function revokeAgentKey(keyId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('UPDATE agent_keys SET revoked = TRUE WHERE id = $1', [keyId]);
  } finally {
    client.release();
  }
}

async function getAllWorkspaceKeys(workspaceId: string): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM agent_keys WHERE workspace_id = $1 AND revoked = FALSE', [workspaceId]);
    return result.rows;
  } finally {
    client.release();
  }
}

async function updateKeyLastUsed(keyHash: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('UPDATE agent_keys SET last_used = NOW() WHERE key_hash = $1', [keyHash]);
  } finally {
    client.release();
  }
}

async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM workspaces WHERE id = $1', [id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// New Agent functions according to spec
async function createAgent(
  workspaceId: string, 
  agentId: string, 
  displayName: string,
  ownerType: string,
  ownerEmail: string | null,
  role: string,
  model: string | null = null
): Promise<Agent> {
  const client = await pool.connect();
  try {
    const id = generateUUID();
    const agentKey = generateAgentKey();
    const result = await client.query(
      `INSERT INTO agents_v2 (id, workspace_id, agent_id, agent_key, display_name, owner_type, owner_email, role, model) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [id, workspaceId, agentId, agentKey, displayName, ownerType, ownerEmail, role, model]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getAgentsByWorkspace(workspaceId: string): Promise<Agent[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM agents_v2 WHERE workspace_id = $1 AND status = $2 ORDER BY created_at DESC',
      [workspaceId, 'active']
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getAgentByKey(agentKey: string): Promise<Agent | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM agents_v2 WHERE agent_key = $1 AND status = $2',
      [agentKey, 'active']
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      agentId: row.agent_id,
      agentKey: row.agent_key,
      displayName: row.display_name,
      ownerType: row.owner_type,
      ownerEmail: row.owner_email,
      role: row.role,
      status: row.status,
      model: row.model,
      avatar: row.avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } finally {
    client.release();
  }
}

async function deleteAgent(workspaceId: string, agentId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE agents_v2 SET status = $1, updated_at = NOW() WHERE workspace_id = $2 AND agent_id = $3',
      ['revoked', workspaceId, agentId]
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

async function updateAgent(
  workspaceId: string, 
  agentId: string, 
  updates: { displayName?: string; model?: string; avatar?: string }
): Promise<Agent | null> {
  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.model !== undefined) {
      fields.push(`model = $${paramIndex++}`);
      values.push(updates.model);
    }
    if (updates.avatar !== undefined) {
      fields.push(`avatar = $${paramIndex++}`);
      values.push(updates.avatar);
    }
    
    if (fields.length === 0) {
      // Nothing to update, just return the agent
      const result = await client.query(
        'SELECT * FROM agents_v2 WHERE workspace_id = $1 AND agent_id = $2 AND status = $3',
        [workspaceId, agentId, 'active']
      );
      const r = result.rows[0];
      return r ? {
        id: r.id,
        workspaceId: r.workspace_id,
        agentId: r.agent_id,
        agentKey: r.agent_key,
        displayName: r.display_name,
        ownerType: r.owner_type,
        ownerEmail: r.owner_email,
        role: r.role,
        status: r.status,
        model: r.model,
        avatar: r.avatar,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      } : null;
    }
    
    fields.push('updated_at = NOW()');
    values.push(workspaceId, agentId);
    
    const query = `
      UPDATE agents_v2 
      SET ${fields.join(', ')} 
      WHERE workspace_id = $${paramIndex++} AND agent_id = $${paramIndex++} AND status = 'active'
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      agentId: row.agent_id,
      agentKey: row.agent_key,
      displayName: row.display_name,
      ownerType: row.owner_type,
      ownerEmail: row.owner_email,
      role: row.role,
      status: row.status,
      model: row.model,
      avatar: row.avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } finally {
    client.release();
  }
}

// Permission functions
async function hasPermissionForNamespace(workspaceId: string, agentId: string, namespace: string, requiredPermission: 'read' | 'write' | 'admin'): Promise<boolean> {
  const client = await pool.connect();
  try {
    // Check for specific namespace permission
    const result = await client.query(
      'SELECT permission FROM permissions WHERE workspace_id = $1 AND agent_id = $2 AND (namespace = $3 OR namespace = $4)',
      [workspaceId, agentId, namespace, '*']
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    // Check if any permission level satisfies the requirement
    for (const row of result.rows) {
      const permission = row.permission;
      if (permission === 'admin' || 
          (requiredPermission === 'write' && (permission === 'write' || permission === 'admin')) ||
          (requiredPermission === 'read' && ['read', 'write', 'admin'].includes(permission))) {
        return true;
      }
    }
    
    return false;
  } finally {
    client.release();
  }
}

function getRoleDefaultPermissions(role: string): { canRead: boolean; canWrite: boolean; hasAllNamespaces: boolean } {
  switch (role) {
    case 'owner':
    case 'admin':
      return { canRead: true, canWrite: true, hasAllNamespaces: true };
    case 'contributor':
      return { canRead: true, canWrite: false, hasAllNamespaces: false }; // Must check permissions table for namespaces
    case 'reader':
      return { canRead: true, canWrite: false, hasAllNamespaces: false }; // Read-only
    default:
      return { canRead: false, canWrite: false, hasAllNamespaces: false };
  }
}

async function checkAgentWritePermission(workspaceId: string, agentId: string, namespace: string, role: string): Promise<boolean> {
  const defaultPerms = getRoleDefaultPermissions(role);
  
  // Owner/admin have write access to all namespaces
  if (defaultPerms.hasAllNamespaces && defaultPerms.canWrite) {
    return true;
  }
  
  // Reader role cannot write anything
  if (role === 'reader') {
    return false;
  }
  
  // Contributor role must check permissions table for namespace
  if (role === 'contributor') {
    return await hasPermissionForNamespace(workspaceId, agentId, namespace, 'write');
  }
  
  return false;
}

async function getPermissions(workspaceId: string): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM permissions WHERE workspace_id = $1 ORDER BY agent_id, namespace',
      [workspaceId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function createPermission(workspaceId: string, agentId: string, namespace: string, permission: string): Promise<void> {
  const client = await pool.connect();
  try {
    const id = generateUUID();
    await client.query(
      'INSERT INTO permissions (id, workspace_id, agent_id, namespace, permission) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (workspace_id, agent_id, namespace) DO UPDATE SET permission = $5, created_at = NOW()',
      [id, workspaceId, agentId, namespace, permission]
    );
  } finally {
    client.release();
  }
}

async function deletePermission(workspaceId: string, permissionId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM permissions WHERE id = $1 AND workspace_id = $2',
      [permissionId, workspaceId]
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

// Invitation functions for Phase 3
async function createInvitation(
  workspaceId: string,
  role: string,
  namespaces: string[],
  createdBy: string,
  expiresIn?: string,
  maxUses?: number
): Promise<Invitation> {
  const client = await pool.connect();
  try {
    const id = generateInvitationId();
    let expiresAt: Date | null = null;
    
    if (expiresIn) {
      expiresAt = parseTTL(expiresIn);
    }
    
    const result = await client.query(
      `INSERT INTO invitations (id, workspace_id, role, namespaces, created_by, expires_at, max_uses) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [id, workspaceId, role, JSON.stringify(namespaces), createdBy, expiresAt, maxUses || 1]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      role: row.role,
      namespaces: typeof row.namespaces === "string" ? JSON.parse(row.namespaces) : (row.namespaces || []),
      createdBy: row.created_by,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      uses: row.uses,
      status: row.status,
      createdAt: row.created_at
    };
  } finally {
    client.release();
  }
}

async function getInvitationsByWorkspace(workspaceId: string): Promise<Invitation[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM invitations WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      role: row.role,
      namespaces: typeof row.namespaces === "string" ? JSON.parse(row.namespaces) : (row.namespaces || []),
      createdBy: row.created_by,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      uses: row.uses,
      status: row.status,
      createdAt: row.created_at
    }));
  } finally {
    client.release();
  }
}

async function getInvitationById(inviteId: string): Promise<Invitation | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM invitations WHERE id = $1',
      [inviteId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      role: row.role,
      namespaces: typeof row.namespaces === "string" ? JSON.parse(row.namespaces) : (row.namespaces || []),
      createdBy: row.created_by,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      uses: row.uses,
      status: row.status,
      createdAt: row.created_at
    };
  } finally {
    client.release();
  }
}

async function revokeInvitation(inviteId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE invitations SET status = $1 WHERE id = $2 AND status = $3',
      ['revoked', inviteId, 'active']
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

async function acceptInvitation(inviteId: string): Promise<{ valid: boolean; invitation?: Invitation; error?: string }> {
  const client = await pool.connect();
  try {
    // Get invitation and check validity
    const invitation = await getInvitationById(inviteId);
    
    if (!invitation) {
      return { valid: false, error: 'Invitation not found' };
    }
    
    if (invitation.status !== 'active') {
      return { valid: false, error: `Invitation is ${invitation.status}` };
    }
    
    // Check expiration
    if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
      // Mark as expired
      await client.query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['expired', inviteId]
      );
      return { valid: false, error: 'Invitation has expired' };
    }
    
    // Check uses limit
    if (invitation.uses >= invitation.maxUses) {
      // Mark as used
      await client.query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['used', inviteId]
      );
      return { valid: false, error: 'Invitation has reached maximum uses' };
    }
    
    // Increment uses
    await client.query(
      'UPDATE invitations SET uses = uses + 1 WHERE id = $1',
      [inviteId]
    );
    
    // Check if should mark as used
    if (invitation.uses + 1 >= invitation.maxUses) {
      await client.query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['used', inviteId]
      );
    }
    
    return { valid: true, invitation };
  } finally {
    client.release();
  }
}

// Migration function for existing owner/admin agents
async function migrateAgentPermissions(workspaceId: string): Promise<void> {
  const client = await pool.connect();
  try {
    // Get all owner/admin agents that don't have "*" permissions yet
    const agents = await client.query(
      `SELECT agent_id FROM agents_v2 
       WHERE workspace_id = $1 AND role IN ('owner', 'admin') AND status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM permissions 
         WHERE workspace_id = $1 AND agent_id = agents_v2.agent_id AND namespace = '*'
       )`,
      [workspaceId]
    );
    
    // Give them write access to all namespaces
    for (const agent of agents.rows) {
      await createPermission(workspaceId, agent.agent_id, '*', 'write');
    }
    
    console.log(`Migrated permissions for ${agents.rows.length} owner/admin agents`);
  } finally {
    client.release();
  }
}

// Initialize database when server starts
initDatabase()
  .then(async () => {
    // Phase 2: Run permission migration for all existing workspaces
    try {
      const client = await pool.connect();
      try {
        const workspaces = await client.query('SELECT id FROM workspaces');
        for (const ws of workspaces.rows) {
          await migrateAgentPermissions(ws.id);
        }
        console.log(`✅ Migrated permissions for ${workspaces.rows.length} workspaces`);
      } finally {
        client.release();
      }
    } catch (migrationError) {
      console.warn('⚠️  Permission migration failed:', migrationError);
      // Don't fail startup if migration fails
    }
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Enable CORS for all origins
app.use('/*', cors());

// Pretty JSON middleware
app.use('*', async (c, next) => {
  c.res.headers.set('Content-Type', 'application/json');
  await next();
});

// Auth middleware supporting both Authorization and X-Agent-Key headers
async function authMiddleware(c: Context<AppEnvironment>, next: () => Promise<void>): Promise<Response | void> {
  try {
    const authorization = c.req.header('Authorization');
    const agentKeyHeader = c.req.header('X-Agent-Key');
    
    if (!authorization && !agentKeyHeader) {
      return c.json({ error: 'Missing Authorization header or X-Agent-Key header', code: 'AUTH_MISSING' }, 401);
    }
    
    let token: string;
    let isAgentKeyAuth = false;
    
    if (agentKeyHeader) {
      token = agentKeyHeader;
      isAgentKeyAuth = true;
    } else if (authorization && authorization.startsWith('Bearer ')) {
      token = authorization.substring(7);
    } else {
      return c.json({ error: 'Invalid Authorization header format', code: 'AUTH_INVALID' }, 401);
    }
    
    let workspace: Workspace | undefined;
    let isWriteKey = false;
    let isReadKey = false;
    let agent: Agent | null = null;
    
    if (token.startsWith('syn_a_')) {
      // Agent key - try new agent system first, fallback to legacy
      try {
        agent = await getAgentByKey(token);
        console.log('Agent lookup result for token prefix', token.substring(0, 12), ':', agent ? `found ${agent.agentId}` : 'not found');
      } catch (e) {
        // New system might not be available, continue to legacy
        console.warn('New agent system error:', e);
      }
      
      if (agent) {
        workspace = await getWorkspaceById(agent.workspaceId) || undefined;
        // For agent keys, write access depends on role
        isWriteKey = ['owner', 'admin', 'contributor'].includes(agent.role);
        isReadKey = true; // All agents can read
      } else {
        // Fallback to legacy agent_keys system
        const keyHash = hashApiKey(token);
        const agentKeyRow = await getAgentKey(keyHash);
        if (!agentKeyRow) {
          return c.json({ error: 'Invalid or revoked agent key', code: 'AUTH_INVALID' }, 401);
        }
        
        // Update last_used timestamp
        await updateKeyLastUsed(keyHash);
        
        workspace = await getWorkspaceById(agentKeyRow.workspace_id) || undefined;
        isWriteKey = agentKeyRow.permissions === 'write' || agentKeyRow.permissions === 'admin';
        isReadKey = agentKeyRow.permissions === 'read' || agentKeyRow.permissions === 'write' || agentKeyRow.permissions === 'admin';
        
        // Create pseudo-agent for legacy keys
        agent = {
          id: agentKeyRow.id,
          workspaceId: agentKeyRow.workspace_id,
          agentId: agentKeyRow.agent_id,
          agentKey: token,
          displayName: agentKeyRow.agent_id,
          ownerType: 'service',
          ownerEmail: null,
          role: 'contributor',
          status: 'active',
          model: null,
          avatar: null,
          createdAt: agentKeyRow.created_at,
          updatedAt: agentKeyRow.created_at
        };
      }
    } else {
      // Legacy workspace keys
      workspace = await getWorkspaceByKey(token) || undefined;
      isWriteKey = token.startsWith('syn_w_');
      isReadKey = token.startsWith('syn_r_') || isWriteKey;
    }
    
    if (!workspace) {
      return c.json({ error: 'Invalid API key or workspace not found', code: 'AUTH_INVALID' }, 401);
    }
    
    c.set('workspace', workspace);
    c.set('isWriteKey', isWriteKey);
    c.set('isReadKey', isReadKey);
    c.set('apiKey', token);
    
    // Store agent info for use in endpoints
    if (agent) {
      (c as any).agent = agent;
      (c as any).isAgentAuth = true;
    }
    
    // Log audit trail
    const method = c.req.method;
    const path = c.req.path;
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';
    
    await logAudit(
      workspace.id,
      `${method} ${path}`,
      agent?.agentId || null,
      agent ? 'agent' : isWriteKey ? 'write' : 'read',
      `API request: ${method} ${path}`,
      ip
    );
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Internal authentication error', code: 'AUTH_ERROR' }, 500);
  }
}

// Health check endpoint
// DEBUG: Check agent key (REMOVE IN PRODUCTION)
app.get('/debug/check-key/:key', async (c) => {
  const key = c.req.param('key');
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT agent_id, workspace_id, status, length(agent_key) as key_len, agent_key = $1 as key_match FROM agents_v2 WHERE agent_key = $1', [key]);
    const all = await client.query('SELECT agent_id, substring(agent_key, 1, 12) as key_prefix, status FROM agents_v2 LIMIT 10');
    return c.json({ found: result.rows.length > 0, match: result.rows[0] || null, allAgents: all.rows });
  } finally {
    client.release();
  }
});

app.get('/health', async (c) => {
  const client = await pool.connect();
  try {
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const hasInvitations = tables.rows.some((r: any) => r.table_name === 'invitations');
    return c.json({ status: 'ok', timestamp: new Date().toISOString(), tables: tables.rows.map((r: any) => r.table_name), hasInvitations });
  } catch (e: any) {
    return c.json({ status: 'ok', timestamp: new Date().toISOString(), dbError: e.message });
  } finally {
    client.release();
  }
});

function validateWorkspaceCreation(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.name) {
    errors.push('name is required');
  }
  
  if (body.name && typeof body.name !== 'string') {
    errors.push('name must be a string');
  }
  
  if (body.name && typeof body.name === 'string' && body.name.trim().length === 0) {
    errors.push('name cannot be empty');
  }
  
  if (body.name && typeof body.name === 'string' && body.name.trim().length > 100) {
    errors.push('name must be 100 characters or less');
  }
  
  return { valid: errors.length === 0, errors };
}

// POST /api/v1/workspaces - Create workspace (no auth)
app.post('/api/v1/workspaces', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate input
    const validation = validateWorkspaceCreation(body);
    if (!validation.valid) {
      return c.json({ 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: validation.errors
      }, 400);
    }
    
    const { name } = body;
    const id = generateWorkspaceId();
    const writeKey = generateWriteKey();
    const readKey = generateReadKey();
    const createdAt = new Date().toISOString();
    
    await createWorkspace(id, name.trim(), writeKey, readKey);
    
    return c.json({
      id,
      name: name.trim(),
      writeKey,
      readKey,
      createdAt,
      message: 'Workspace created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating workspace:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/auth/me - Get current auth info (workspace ID, agent info if applicable)
app.get('/api/v1/auth/me', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const agent = c.get('agent') as Agent | undefined;
    const isWriteKey = c.get('isWriteKey') as boolean;
    const isReadKey = c.get('isReadKey') as boolean;
    
    return c.json({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      agent: agent ? {
        agentId: agent.agentId,
        displayName: agent.displayName,
        role: agent.role
      } : null,
      permissions: {
        read: isReadKey,
        write: isWriteKey
      }
    });
  } catch (error) {
    console.error('Error getting auth info:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/entries - List entries (any valid key)
app.get('/api/v1/entries', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const since = c.req.query('since');
    const namespace = c.req.query('namespace');
    const fromAgent = c.req.query('from_agent');
    const tag = c.req.query('tag');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    
    let entries: any[];
    
    if (since || namespace || fromAgent) {
      let timeModifier = null;
      
      if (since) {
        const match = since.match(/^(\d+)([hdm])$/);
        if (match) {
          const [, num, unit] = match;
          const value = parseInt(num!, 10);
          
          switch (unit) {
            case 'h':
              timeModifier = `-${value} hours`;
              break;
            case 'd':
              timeModifier = `-${value} days`;
              break;
            case 'm':
              timeModifier = `-${value} minutes`;
              break;
          }
        }
      }
      
      entries = await getEntriesWithFilters(
        workspace.id,
        since ? 'now' : null,
        timeModifier,
        namespace || null,
        fromAgent || null,
        limit
      );
    } else {
      entries = await getEntries(workspace.id, limit);
    }
    
    // Filter out expired entries and parse JSON fields
    const validEntries = entries
      .filter(entry => !isExpired(entry.created_at, entry.ttl))
      .map(entry => ({
        ...entry,
        tags: typeof entry.tags === 'string' ? JSON.parse(entry.tags) : entry.tags
      }))
      .filter(entry => !tag || (Array.isArray(entry.tags) && entry.tags.includes(tag)));
    
    return c.json({
      entries: validEntries,
      total: validEntries.length
    });
  } catch (error) {
    console.error('Error getting entries:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/entries - Create entry (write key only)
app.post('/api/v1/entries', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const body = await c.req.json();
    
    let { from, from_agent, namespace = 'general', content, tags = [], priority = 'info', ttl } = body;
    
    // Support both 'from' and 'from_agent' field names
    from = from || from_agent;
    
    // Agent keys enforce identity - do this before validation
    const agent = (c as any).agent;
    if (agent && agent.agentId) {
      from = agent.agentId; // Override — agent can only write as themselves
      
      // Phase 2: Enforce permissions for authenticated agents
      const hasPermission = await checkAgentWritePermission(workspace.id, agent.agentId, namespace, agent.role);
      if (!hasPermission) {
        return c.json({ 
          error: `Agent '${agent.agentId}' does not have write permission for namespace '${namespace}'`, 
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, 403);
      }
    }
    
    // Validate input after agent auto-population
    const validation = validateEntryCreation({ ...body, from, from_agent });
    if (!validation.valid) {
      return c.json({ 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: validation.errors
      }, 400);
    }
    
    const id = generateEntryId();
    
    await createEntry(
      id,
      workspace.id,
      from,
      namespace,
      content,
      tags,
      priority,
      ttl || null
    );
    
    return c.json({
      id,
      createdAt: new Date().toISOString(),
      message: 'Entry created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating entry:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/agents - List agents (any valid key)
app.get('/api/v1/agents', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    // Use new agents_v2 table
    const agents = await getAgentsByWorkspace(workspace.id);
    
    // Map to format expected by dashboard (compatible with old format)
    const formattedAgents = agents.map((agent: any) => ({
      id: agent.agent_id, // Use agent_id as id for compatibility
      role: agent.role,
      capabilities: [],
      lastSeen: agent.updated_at,
      registeredAt: agent.created_at,
      // Also include new fields
      agentId: agent.agent_id,
      displayName: agent.display_name,
      ownerType: agent.owner_type,
      status: agent.status
    }));
    
    return c.json({ agents: formattedAgents });
  } catch (error) {
    console.error('Error getting agents:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// DELETE /api/v1/entries/:id - Delete entry (write key only, owner/admin)
app.delete('/api/v1/entries/:id', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const isWriteKey = c.get('isWriteKey') as boolean;
    const agent = c.get('agent') as Agent | undefined;
    const entryId = c.req.param('id');
    
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'AUTH_READ_ONLY' }, 403);
    }
    
    // Check if agent has admin/owner role (or is workspace key)
    const isWorkspaceKey = !agent;
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can delete entries', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM entries WHERE id = $1 AND workspace_id = $2 RETURNING id',
        [entryId, workspace.id]
      );
      
      if (result.rowCount === 0) {
        return c.json({ error: 'Entry not found', code: 'NOT_FOUND' }, 404);
      }
      
      return c.json({ success: true, message: 'Entry deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting entry:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// Validation schemas
function validateAgentRegistration(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.agentId && !body.id) {
    errors.push('agentId or id is required');
  }
  
  if (body.agentId && typeof body.agentId !== 'string') {
    errors.push('agentId must be a string');
  }
  
  if (body.id && typeof body.id !== 'string') {
    errors.push('id must be a string');
  }
  
  if (body.name && typeof body.name !== 'string') {
    errors.push('name must be a string');
  }
  
  if (body.role && typeof body.role !== 'string') {
    errors.push('role must be a string');
  }
  
  if (body.capabilities && !Array.isArray(body.capabilities)) {
    errors.push('capabilities must be an array');
  }
  
  return { valid: errors.length === 0, errors };
}

function validateEntryCreation(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.from && !body.from_agent) {
    errors.push('from or from_agent is required');
  }
  
  if (!body.content) {
    errors.push('content is required');
  }
  
  if (body.content && typeof body.content !== 'string') {
    errors.push('content must be a string');
  }
  
  if (body.namespace && typeof body.namespace !== 'string') {
    errors.push('namespace must be a string');
  }
  
  if (body.tags && !Array.isArray(body.tags)) {
    errors.push('tags must be an array');
  }
  
  if (body.priority && !['low', 'info', 'warn', 'error', 'critical'].includes(body.priority)) {
    errors.push('priority must be one of: low, info, warn, error, critical');
  }
  
  if (body.ttl && !/^\d+[hdm]$/.test(body.ttl)) {
    errors.push('ttl must be in format: number + h/d/m (e.g., 1h, 7d, 30m)');
  }
  
  return { valid: errors.length === 0, errors };
}

// POST /api/v1/agents - Register agent (write key only)
app.post('/api/v1/agents', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const body = await c.req.json();
    const { id, role, capabilities = [] } = body;
    
    if (!id) {
      return c.json({ error: 'Agent id is required', code: 'VALIDATION_ERROR' }, 400);
    }
    
    await upsertAgent(
      id,
      workspace.id,
      role || null,
      capabilities,
      new Date().toISOString()
    );
    
    return c.json({ success: true }, 201);
  } catch (error) {
    console.error('Error registering agent:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/agents/register - Alternative agent registration endpoint (write key only)
app.post('/api/v1/agents/register', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const body = await c.req.json();
    
    // Validate input
    const validation = validateAgentRegistration(body);
    if (!validation.valid) {
      return c.json({ 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: validation.errors
      }, 400);
    }
    
    // Support both 'agentId' and 'id' field names for flexibility
    const agentId = body.agentId || body.id;
    const { name, role, capabilities = [] } = body;
    
    await upsertAgent(
      agentId,
      workspace.id,
      role || null,
      capabilities,
      new Date().toISOString()
    );
    
    return c.json({ 
      success: true, 
      agentId,
      message: 'Agent registered successfully'
    }, 201);
  } catch (error) {
    console.error('Error registering agent:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/workspaces/:wsId/agents/:agentId/keys - Create agent key (admin auth required)
app.post('/api/v1/workspaces/:wsId/agents/:agentId/keys', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const wsId = c.req.param('wsId');
    const agentId = c.req.param('agentId');
    
    if (workspace.id !== wsId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    if (!agentId || typeof agentId !== 'string') {
      return c.json({ error: 'Invalid agent ID', code: 'VALIDATION_ERROR' }, 400);
    }
    
    const body = await c.req.json();
    const { permissions = 'write' } = body;
    
    if (!['read', 'write', 'admin'].includes(permissions)) {
      return c.json({ error: 'Invalid permissions. Must be read, write, or admin', code: 'VALIDATION_ERROR' }, 400);
    }
    
    const keyId = generateKeyId();
    const agentKey = generateAgentKey();
    const keyHash = hashApiKey(agentKey);
    const keyPrefix = agentKey.slice(0, 15) + '...';
    const createdAt = new Date().toISOString();
    
    await createAgentKey(keyId, workspace.id, agentId, keyHash, keyPrefix, permissions);
    
    // Auto-register the agent if not exists
    await upsertAgent(
      agentId,
      workspace.id,
      null,
      [],
      createdAt
    );
    
    return c.json({
      keyId,
      key: agentKey, // Only returned on creation
      permissions,
      createdAt
    }, 201);
  } catch (error) {
    console.error('Error creating agent key:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/workspaces/:wsId/agents/:agentId/keys - List agent keys (admin auth required)
app.get('/api/v1/workspaces/:wsId/agents/:agentId/keys', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const wsId = c.req.param('wsId');
    const agentId = c.req.param('agentId');
    
    if (workspace.id !== wsId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    const keys = await getAgentKeysByAgent(workspace.id, agentId);
    
    return c.json({
      keys: keys.map(k => ({
        keyId: k.id,
        keyPrefix: k.key_prefix,
        permissions: k.permissions,
        createdAt: k.created_at,
        lastUsed: k.last_used,
        expiresAt: k.expires_at
      }))
    });
  } catch (error) {
    console.error('Error getting agent keys:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// DELETE /api/v1/workspaces/:wsId/keys/:keyId - Revoke a specific key (admin auth required)
app.delete('/api/v1/workspaces/:wsId/keys/:keyId', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const wsId = c.req.param('wsId');
    const keyId = c.req.param('keyId');
    
    if (workspace.id !== wsId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    await revokeAgentKey(keyId);
    
    return c.json({ success: true, message: 'Key revoked successfully' });
  } catch (error) {
    console.error('Error revoking key:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/workspaces/:wsId/keys - List all keys across all agents (admin auth required)
app.get('/api/v1/workspaces/:wsId/keys', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const wsId = c.req.param('wsId');
    
    if (workspace.id !== wsId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    const keys = await getAllWorkspaceKeys(workspace.id);
    
    return c.json({
      keys: keys.map(k => ({
        keyId: k.id,
        agentId: k.agent_id,
        keyPrefix: k.key_prefix,
        permissions: k.permissions,
        createdAt: k.created_at,
        lastUsed: k.last_used,
        expiresAt: k.expires_at
      }))
    });
  } catch (error) {
    console.error('Error getting workspace keys:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/invite - Create agent key (owner write key only)
app.post('/api/v1/invite', authMiddleware, async (c) => {
  try {
    const apiKey = c.get('apiKey') as string;
    if (!apiKey.startsWith('syn_w_')) {
      return c.json({ error: 'Only workspace owner (write key) can create invites', code: 'OWNER_REQUIRED' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const body = await c.req.json();
    const { agent, role, access = 'write', capabilities = [] } = body;
    
    if (!agent || typeof agent !== 'string') {
      return c.json({ error: 'agent id is required', code: 'VALIDATION_ERROR' }, 400);
    }
    
    const agentKey = generateAgentKey();
    const keyId = generateKeyId();
    const keyHash = hashApiKey(agentKey);
    const keyPrefix = agentKey.slice(0, 15) + '...';
    
    await createAgentKey(keyId, workspace.id, agent.trim(), keyHash, keyPrefix, access);
    
    // Auto-register the agent
    await upsertAgent(
      agent.trim(),
      workspace.id,
      role || null,
      capabilities,
      new Date().toISOString()
    );
    
    return c.json({
      agentId: agent.trim(),
      agentKey,
      access,
      workspace: workspace.name,
      message: `Share this key with ${agent}. They can only write as "${agent}".`
    }, 201);
  } catch (error) {
    console.error('Error creating invite:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/revoke - Revoke agent key (owner write key only)
app.post('/api/v1/revoke', authMiddleware, async (c) => {
  try {
    const apiKey = c.get('apiKey') as string;
    if (!apiKey.startsWith('syn_w_')) {
      return c.json({ error: 'Only workspace owner can revoke keys', code: 'OWNER_REQUIRED' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const body = await c.req.json();
    const { agent } = body;
    
    if (!agent) {
      return c.json({ error: 'agent id is required', code: 'VALIDATION_ERROR' }, 400);
    }
    
    // Get all keys for this agent and revoke them
    const agentKeys = await getAgentKeysByAgent(workspace.id, agent);
    for (const key of agentKeys) {
      await revokeAgentKey(key.id);
    }
    
    return c.json({ success: true, message: `All keys for "${agent}" have been revoked (${agentKeys.length} keys)` });
  } catch (error) {
    console.error('Error revoking key:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/keys - List agent keys (owner write key only)
app.get('/api/v1/keys', authMiddleware, async (c) => {
  try {
    const apiKey = c.get('apiKey') as string;
    if (!apiKey.startsWith('syn_w_')) {
      return c.json({ error: 'Only workspace owner can list keys', code: 'OWNER_REQUIRED' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const keys = await getAgentKeys(workspace.id);
    
    return c.json({
      keys: keys.map(k => ({
        keyId: k.id,
        agentId: k.agent_id,
        keyPrefix: k.key_prefix,  // Already masked
        permissions: k.permissions,
        createdAt: k.created_at,
        lastUsed: k.last_used,
      }))
    });
  } catch (error) {
    console.error('Error listing keys:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/status - Workspace status (any valid key)
app.get('/api/v1/status', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const stats = await getWorkspaceStats(workspace.id);
    
    return c.json({
      workspace: stats.workspace_name,
      agents: stats.agent_count,
      entries: stats.entry_count,
      lastActivity: stats.last_activity
    });
  } catch (error) {
    console.error('Error getting status:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/audit - Audit log (write key only)
app.get('/api/v1/audit', authMiddleware, async (c) => {
  try {
    const isWriteKey = c.get('isWriteKey') as boolean;
    if (!isWriteKey) {
      return c.json({ error: 'Write access required', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const workspace = c.get('workspace') as Workspace;
    const since = c.req.query('since');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    
    let timeModifier = null;
    
    if (since) {
      const match = since.match(/^(\d+)([hdm])$/);
      if (match) {
        const [, num, unit] = match;
        const value = parseInt(num!, 10);
        
        switch (unit) {
          case 'h':
            timeModifier = `-${value} hours`;
            break;
          case 'd':
            timeModifier = `-${value} days`;
            break;
          case 'm':
            timeModifier = `-${value} minutes`;
            break;
        }
      }
    }
    
    const events = await getAuditLog(
      workspace.id,
      since ? 'now' : null,
      timeModifier,
      limit
    );
    
    const formattedEvents = events.map(event => ({
      action: event.action,
      agent: event.agent,
      timestamp: event.timestamp,
      details: event.details,
      keyType: event.key_type,
      ip: event.ip
    }));
    
    return c.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error getting audit log:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// NEW API ENDPOINTS according to spec

// POST /api/v1/workspaces/:id/agents - Create agent (требует owner/admin)
app.post('/api/v1/workspaces/:id/agents', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can create agents', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const body = await c.req.json();
    const { agentId, displayName, ownerType = 'service', ownerEmail, role = 'contributor', model } = body;
    
    // Validation
    if (!agentId || !displayName) {
      return c.json({ error: 'agentId and displayName are required', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (!['human', 'service', 'anonymous'].includes(ownerType)) {
      return c.json({ error: 'ownerType must be human, service, or anonymous', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (!['owner', 'admin', 'contributor', 'reader'].includes(role)) {
      return c.json({ error: 'role must be owner, admin, contributor, or reader', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (ownerType === 'human' && !ownerEmail) {
      return c.json({ error: 'ownerEmail is required for human agents', code: 'VALIDATION_ERROR' }, 400);
    }
    
    try {
      const newAgent = await createAgent(workspaceId, agentId, displayName, ownerType, ownerEmail || null, role, model || null);
      
      // Map snake_case DB columns to camelCase response
      return c.json({
        id: newAgent.id,
        agentId: (newAgent as any).agent_id,
        agentKey: (newAgent as any).agent_key, // Only returned on creation
        displayName: (newAgent as any).display_name,
        ownerType: (newAgent as any).owner_type,
        ownerEmail: (newAgent as any).owner_email,
        role: newAgent.role,
        status: newAgent.status,
        model: (newAgent as any).model,
        createdAt: (newAgent as any).created_at
      }, 201);
    } catch (error: any) {
      if (error.constraint === 'agents_workspace_id_agent_id_key') {
        return c.json({ error: 'Agent ID already exists in this workspace', code: 'AGENT_EXISTS' }, 409);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating agent:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/workspaces/:id/agents/:agentId/regenerate-key - Regenerate agent key
app.post('/api/v1/workspaces/:id/agents/:agentId/regenerate-key', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const targetAgentId = c.req.param('agentId');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    const isWorkspaceKey = !agent;
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can regenerate keys', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const newKey = 'syn_a_' + crypto.randomBytes(16).toString('hex');
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE agents_v2 SET agent_key = $1, updated_at = NOW() WHERE workspace_id = $2 AND agent_id = $3 RETURNING *',
        [newKey, workspaceId, targetAgentId]
      );
      
      if (result.rows.length === 0) {
        return c.json({ error: 'Agent not found', code: 'NOT_FOUND' }, 404);
      }
      
      const row = result.rows[0];
      return c.json({
        agentId: row.agent_id,
        displayName: row.display_name,
        agentKey: newKey,
        role: row.role,
        message: 'Agent key regenerated successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error regenerating agent key:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/workspaces/:id/agents - List agents
app.get('/api/v1/workspaces/:id/agents', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    const agents = await getAgentsByWorkspace(workspaceId);
    
    // Don't expose agent keys in list - map snake_case DB columns to camelCase
    const formattedAgents = agents.map((agent: any) => ({
      id: agent.id,
      agentId: agent.agent_id,
      displayName: agent.display_name,
      ownerType: agent.owner_type,
      ownerEmail: agent.owner_email,
      role: agent.role,
      status: agent.status,
      model: agent.model,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at
    }));
    
    return c.json({ agents: formattedAgents });
  } catch (error) {
    console.error('Error getting agents:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// PATCH /api/v1/workspaces/:id/agents/:agentId - Update agent
app.patch('/api/v1/workspaces/:id/agents/:agentId', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const agentIdToUpdate = c.req.param('agentId');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions, or is updating their own agent
    const isWorkspaceKey = !agent;
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    const isSelf = agent && agent.agentId === agentIdToUpdate;
    
    if (!isWorkspaceKey && !isOwnerAdmin && !isSelf) {
      return c.json({ error: 'Only workspace owner, admin, or the agent itself can update agents', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const body = await c.req.json();
    const { displayName, model, avatar } = body;
    
    // Validate at least one field is provided
    if (displayName === undefined && model === undefined && avatar === undefined) {
      return c.json({ error: 'At least one field (displayName, model, avatar) must be provided', code: 'VALIDATION_ERROR' }, 400);
    }
    
    const updatedAgent = await updateAgent(workspaceId, agentIdToUpdate, { displayName, model, avatar });
    
    if (!updatedAgent) {
      return c.json({ error: 'Agent not found', code: 'AGENT_NOT_FOUND' }, 404);
    }
    
    return c.json({ 
      success: true, 
      agent: {
        agentId: updatedAgent.agentId,
        displayName: updatedAgent.displayName,
        role: updatedAgent.role,
        model: updatedAgent.model,
        avatar: updatedAgent.avatar
      }
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// DELETE /api/v1/workspaces/:id/agents/:agentId - Delete agent
app.delete('/api/v1/workspaces/:id/agents/:agentId', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const agentIdToDelete = c.req.param('agentId');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can delete agents', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const deleted = await deleteAgent(workspaceId, agentIdToDelete);
    
    if (!deleted) {
      return c.json({ error: 'Agent not found', code: 'AGENT_NOT_FOUND' }, 404);
    }
    
    return c.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// PHASE 2: PERMISSION MANAGEMENT ENDPOINTS

// GET /api/v1/workspaces/:id/permissions - List all permissions
app.get('/api/v1/workspaces/:id/permissions', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    const permissions = await getPermissions(workspaceId);
    
    return c.json({ permissions });
  } catch (error) {
    console.error('Error getting permissions:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/workspaces/:id/permissions - Add permission (owner/admin only)
app.post('/api/v1/workspaces/:id/permissions', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can manage permissions', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const body = await c.req.json();
    const { agentId, namespace, permission } = body;
    
    // Validation
    if (!agentId || !namespace || !permission) {
      return c.json({ error: 'agentId, namespace, and permission are required', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (!['read', 'write', 'admin'].includes(permission)) {
      return c.json({ error: 'permission must be read, write, or admin', code: 'VALIDATION_ERROR' }, 400);
    }
    
    // Verify agent exists
    const agents = await getAgentsByWorkspace(workspaceId);
    const targetAgent = agents.find((a: any) => a.agent_id === agentId);
    if (!targetAgent) {
      return c.json({ error: 'Agent not found', code: 'AGENT_NOT_FOUND' }, 404);
    }
    
    await createPermission(workspaceId, agentId, namespace, permission);
    
    return c.json({ 
      success: true, 
      message: `Permission ${permission} granted to ${agentId} for namespace ${namespace}`
    }, 201);
  } catch (error) {
    console.error('Error creating permission:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// DELETE /api/v1/workspaces/:id/permissions/:permId - Remove permission
app.delete('/api/v1/workspaces/:id/permissions/:permId', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const permissionId = c.req.param('permId');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can manage permissions', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const deleted = await deletePermission(workspaceId, permissionId);
    
    if (!deleted) {
      return c.json({ error: 'Permission not found', code: 'PERMISSION_NOT_FOUND' }, 404);
    }
    
    return c.json({ success: true, message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// POST /api/v1/workspaces/:id/migrate-permissions - Migration endpoint (owner/admin only)
app.post('/api/v1/workspaces/:id/migrate-permissions', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can run migration', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    await migrateAgentPermissions(workspaceId);
    
    return c.json({ success: true, message: 'Agent permissions migrated successfully' });
  } catch (error) {
    console.error('Error migrating permissions:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// PHASE 3: INVITATION SYSTEM ENDPOINTS

// POST /api/v1/workspaces/:id/invites - Create invitation (owner/admin only)
app.post('/api/v1/workspaces/:id/invites', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can create invitations', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const body = await c.req.json();
    const { role = 'contributor', namespaces = [], maxUses = 1 } = body;
    
    // Support both expiresIn (string: "7d") and expiresInHours (number: 168) from frontend
    let expiresIn: string = body.expiresIn || '7d';
    if (body.expiresInHours !== undefined) {
      if (body.expiresInHours === null || body.expiresInHours === 0) {
        expiresIn = 'never';
      } else {
        expiresIn = `${body.expiresInHours}h`;
      }
    }
    
    // Validation
    if (!['admin', 'contributor', 'reader'].includes(role)) {
      return c.json({ error: 'role must be admin, contributor, or reader', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (!Array.isArray(namespaces)) {
      return c.json({ error: 'namespaces must be an array', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (maxUses && (typeof maxUses !== 'number' || maxUses < 1)) {
      return c.json({ error: 'maxUses must be a positive number', code: 'VALIDATION_ERROR' }, 400);
    }
    
    // TTL validation
    if (expiresIn && expiresIn !== 'never' && !/^\d+[hdm]$/.test(expiresIn)) {
      return c.json({ error: 'expiresIn must be "never" or format: number + h/d/m (e.g., 1h, 7d, 30m)', code: 'VALIDATION_ERROR' }, 400);
    }
    
    const createdBy = agent?.agentId || 'workspace-owner';
    
    const invitation = await createInvitation(
      workspaceId,
      role,
      namespaces,
      createdBy,
      expiresIn,
      maxUses
    );
    
    const inviteUrl = `https://synapse-md.vercel.app/invite/${invitation.id}`;
    
    return c.json({
      inviteId: invitation.id,
      inviteUrl,
      expiresAt: invitation.expiresAt,
      role: invitation.role,
      namespaces: invitation.namespaces,
      maxUses: invitation.maxUses,
      message: 'Invitation created successfully'
    }, 201);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error('Error creating invitation:', errMsg, errStack);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR', debug: errMsg }, 500);
  }
});

// GET /api/v1/workspaces/:id/invites - List invitations (owner/admin only)
app.get('/api/v1/workspaces/:id/invites', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can list invitations', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    const invitations = await getInvitationsByWorkspace(workspaceId);
    
    return c.json({
      invitations: invitations.map(inv => ({
        inviteId: inv.id,
        role: inv.role,
        namespaces: inv.namespaces,
        createdBy: inv.createdBy,
        expiresAt: inv.expiresAt,
        maxUses: inv.maxUses,
        uses: inv.uses,
        status: inv.status,
        createdAt: inv.createdAt
      }))
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error listing invitations:', errMsg);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR', debug: errMsg }, 500);
  }
});

// DELETE /api/v1/workspaces/:id/invites/:inviteId - Revoke invitation
app.delete('/api/v1/workspaces/:id/invites/:inviteId', authMiddleware, async (c) => {
  try {
    const workspace = c.get('workspace') as Workspace;
    const workspaceId = c.req.param('id');
    const inviteId = c.req.param('inviteId');
    const agent = (c as any).agent;
    
    if (workspace.id !== workspaceId) {
      return c.json({ error: 'Workspace mismatch', code: 'WORKSPACE_MISMATCH' }, 400);
    }
    
    // Check if user has owner/admin permissions
    const isWorkspaceKey = !agent; // Using workspace write key
    const isOwnerAdmin = agent && ['owner', 'admin'].includes(agent.role);
    
    if (!isWorkspaceKey && !isOwnerAdmin) {
      return c.json({ error: 'Only workspace owner or admin can revoke invitations', code: 'INSUFFICIENT_PERMISSIONS' }, 403);
    }
    
    // Verify invitation belongs to this workspace
    const invitation = await getInvitationById(inviteId);
    if (!invitation || invitation.workspaceId !== workspaceId) {
      return c.json({ error: 'Invitation not found', code: 'INVITATION_NOT_FOUND' }, 404);
    }
    
    const revoked = await revokeInvitation(inviteId);
    
    if (!revoked) {
      return c.json({ error: 'Invitation not found or already revoked', code: 'INVITATION_NOT_FOUND' }, 404);
    }
    
    return c.json({ success: true, message: 'Invitation revoked successfully' });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// GET /api/v1/invites/:inviteId - Get invitation details (public endpoint)
app.get('/api/v1/invites/:inviteId', async (c) => {
  try {
    const inviteId = c.req.param('inviteId');
    const invitation = await getInvitationById(inviteId);
    
    if (!invitation) {
      return c.json({ error: 'Invitation not found', code: 'NOT_FOUND' }, 404);
    }
    
    const flatInvite = {
      inviteId: invitation.id, role: invitation.role, namespaces: invitation.namespaces,
      expiresAt: invitation.expiresAt, maxUses: invitation.maxUses, usedCount: invitation.uses,
      createdBy: invitation.createdBy, createdAt: invitation.createdAt,
      workspaceName: invitation.workspaceId
    };
    
    // Check if expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return c.json({ ...flatInvite, status: 'expired', isValid: false, reason: 'Invitation has expired' });
    }
    
    // Check if used up
    if (invitation.maxUses > 0 && invitation.uses >= invitation.maxUses) {
      return c.json({ ...flatInvite, status: 'used', isValid: false, reason: 'Invitation has been fully used' });
    }
    
    if (invitation.status !== 'active') {
      return c.json({ ...flatInvite, status: invitation.status, isValid: false, reason: `Invitation is ${invitation.status}` });
    }
    
    return c.json({ ...flatInvite, status: 'active', isValid: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error getting invitation:', errMsg);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR', debug: errMsg }, 500);
  }
});

// POST /api/v1/invites/:inviteId/accept - Accept invitation (public endpoint)
app.post('/api/v1/invites/:inviteId/accept', async (c) => {
  try {
    const inviteId = c.req.param('inviteId');
    const body = await c.req.json();
    const { agentId, displayName, ownerType = 'service', ownerEmail } = body;
    
    // Validation
    if (!agentId || !displayName) {
      return c.json({ error: 'agentId and displayName are required', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (!['human', 'service', 'anonymous'].includes(ownerType)) {
      return c.json({ error: 'ownerType must be human, service, or anonymous', code: 'VALIDATION_ERROR' }, 400);
    }
    
    if (ownerType === 'human' && !ownerEmail) {
      return c.json({ error: 'ownerEmail is required for human agents', code: 'VALIDATION_ERROR' }, 400);
    }
    
    // Accept invitation and validate
    const { valid, invitation, error } = await acceptInvitation(inviteId);
    
    if (!valid || !invitation) {
      return c.json({ error: error || 'Invalid invitation', code: 'INVITATION_INVALID' }, 400);
    }
    
    try {
      // Create agent in workspace
      const newAgent = await createAgent(
        invitation.workspaceId,
        agentId,
        displayName,
        ownerType,
        ownerEmail || null,
        invitation.role
      );
      
      // Create permissions for specified namespaces
      if (invitation.namespaces.length > 0) {
        for (const namespace of invitation.namespaces) {
          const permission = invitation.role === 'reader' ? 'read' : 'write';
          await createPermission(invitation.workspaceId, agentId, namespace, permission);
        }
      } else if (invitation.role === 'admin') {
        // Admin gets write permission for all namespaces
        await createPermission(invitation.workspaceId, agentId, '*', 'write');
      }
      
      return c.json({
        agentKey: (newAgent as any).agent_key,
        agent: {
          id: newAgent.id,
          agentId: (newAgent as any).agent_id,
          displayName: (newAgent as any).display_name,
          role: newAgent.role,
          status: newAgent.status,
          createdAt: (newAgent as any).created_at
        },
        message: 'Invitation accepted successfully'
      }, 201);
    } catch (error: any) {
      if (error.constraint === 'agents_workspace_id_agent_id_key') {
        return c.json({ error: 'Agent ID already exists in this workspace', code: 'AGENT_EXISTS' }, 409);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found', code: 'NOT_FOUND' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
});

// Start server
console.log(`Starting Synapse API server on port ${PORT}...`);
console.log(`Database: PostgreSQL via ${DATABASE_URL ? 'DATABASE_URL' : 'environment variable not set'}`);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`🚀 Synapse API server running on http://localhost:${PORT}`);