'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './hooks'

interface Agent {
  agentId: string
  displayName: string
  type: 'human' | 'service' | 'anonymous'
  role: string
  status: 'active' | 'inactive' | 'pending'
  ownerEmail?: string
  agentKey?: string
  created: string
}

interface CreateAgentRequest {
  agentId: string
  displayName: string
  ownerType: 'human' | 'service' | 'anonymous'
  role: string
  ownerEmail?: string
}

interface CreateAgentResponse {
  agentKey: string
  agent: Agent
}

const API_BASE = 'https://synapse-api-production-c366.up.railway.app/api/v1'

// Helper to get workspace ID from entries (entries have workspace_id)
async function getWorkspaceId(apiKey: string): Promise<string> {
  const response = await fetch(`${API_BASE}/entries?limit=1`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to get workspace ID')
  }
  
  const data = await response.json()
  if (data.entries && data.entries.length > 0) {
    return data.entries[0].workspace_id
  }
  
  // If no entries, try to create a temp entry and get workspace ID
  // For now, throw an error - we need at least one entry
  throw new Error('No entries found to determine workspace ID')
}

// Cache workspace IDs to avoid repeated lookups
const workspaceIdCache = new Map<string, string>()

export function useAgentsWithPermissions() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['agents-permissions', auth?.apiKey],
    queryFn: async (): Promise<Agent[]> => {
      if (!auth) throw new Error('Not authenticated')
      
      // Get workspace ID (cached)
      let workspaceId = workspaceIdCache.get(auth.apiKey)
      if (!workspaceId) {
        workspaceId = await getWorkspaceId(auth.apiKey)
        workspaceIdCache.set(auth.apiKey, workspaceId)
      }
      
      // Real API call
      const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/agents`, {
        headers: {
          'Authorization': `Bearer ${auth.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Check your API key.')
        } else if (response.status === 404) {
          throw new Error('Workspace not found.')
        } else {
          throw new Error(`API Error: ${response.status}`)
        }
      }

      const data = await response.json()
      // Map API response to frontend format
      return (data.agents || []).map((agent: any) => ({
        agentId: agent.agentId,
        displayName: agent.displayName,
        type: agent.ownerType as 'human' | 'service' | 'anonymous',
        role: agent.role,
        status: agent.status as 'active' | 'inactive' | 'pending',
        ownerEmail: agent.ownerEmail,
        created: agent.createdAt
      }))
    },
    enabled: !!auth,
    staleTime: 30000, // Cache for 30 seconds
    retry: 2
  })
}

export async function createAgent(apiKey: string, request: CreateAgentRequest): Promise<CreateAgentResponse> {
  // Get workspace ID
  let workspaceId = workspaceIdCache.get(apiKey)
  if (!workspaceId) {
    workspaceId = await getWorkspaceId(apiKey)
    workspaceIdCache.set(apiKey, workspaceId)
  }

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to create agent: ${response.status}`)
  }

  const data = await response.json()
  
  const agent: Agent = {
    agentId: data.agentId,
    displayName: data.displayName,
    type: data.ownerType as 'human' | 'service' | 'anonymous',
    role: data.role,
    status: data.status as 'active' | 'inactive' | 'pending',
    ownerEmail: data.ownerEmail,
    agentKey: data.agentKey,
    created: data.createdAt
  }

  return {
    agentKey: data.agentKey,
    agent
  }
}

export async function deleteAgent(apiKey: string, agentId: string): Promise<void> {
  // Get workspace ID
  let workspaceId = workspaceIdCache.get(apiKey)
  if (!workspaceId) {
    workspaceId = await getWorkspaceId(apiKey)
    workspaceIdCache.set(apiKey, workspaceId)
  }

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/agents/${agentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to delete agent: ${response.status}`)
  }
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
  // Mock implementation for development
  await new Promise(r => setTimeout(r, 500))

  // In real implementation, this would call:
  // PUT /api/v1/workspaces/:id/agents/:agentId

  throw new Error('Not implemented yet')
}

// New Permission Matrix types and functions
export interface Permission {
  id?: string
  agentId: string
  namespace: string
  permission: 'none' | 'read' | 'write'
}

interface PermissionMatrix {
  agents: Agent[]
  namespaces: string[]
  permissions: Permission[]
}

interface CreatePermissionRequest {
  agentId: string
  namespace: string
  permission: 'read' | 'write'
}

// Hook to fetch permission matrix
export function usePermissionMatrix() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['permission-matrix', auth?.apiKey],
    queryFn: async (): Promise<PermissionMatrix> => {
      if (!auth) throw new Error('Not authenticated')
      
      // Get workspace ID (cached)
      let workspaceId = workspaceIdCache.get(auth.apiKey)
      if (!workspaceId) {
        workspaceId = await getWorkspaceId(auth.apiKey)
        workspaceIdCache.set(auth.apiKey, workspaceId)
      }
      
      // Fetch permissions
      const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/permissions`, {
        headers: {
          'Authorization': `Bearer ${auth.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.status}`)
      }

      const data = await response.json()
      return {
        agents: (data.agents || []).map((agent: any) => ({
          agentId: agent.agentId,
          displayName: agent.displayName,
          type: agent.ownerType as 'human' | 'service' | 'anonymous',
          role: agent.role,
          status: agent.status as 'active' | 'inactive' | 'pending',
          ownerEmail: agent.ownerEmail,
          created: agent.createdAt
        })),
        namespaces: data.namespaces || [],
        permissions: data.permissions || []
      }
    },
    enabled: !!auth,
    staleTime: 30000,
    retry: 2
  })
}

// Hook to fetch unique namespaces from entries
export function useNamespaces() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['namespaces', auth?.apiKey],
    queryFn: async (): Promise<string[]> => {
      if (!auth) throw new Error('Not authenticated')
      
      const response = await fetch(`${API_BASE}/entries?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${auth.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch entries')
      }
      
      const data = await response.json()
      const namespaces = new Set<string>()
      
      if (data.entries) {
        data.entries.forEach((entry: any) => {
          if (entry.namespace) {
            namespaces.add(entry.namespace)
          }
        })
      }
      
      return Array.from(namespaces).sort()
    },
    enabled: !!auth,
    staleTime: 60000, // Cache for 1 minute
    retry: 2
  })
}

// Create new permission
export async function createPermission(apiKey: string, request: CreatePermissionRequest): Promise<void> {
  let workspaceId = workspaceIdCache.get(apiKey)
  if (!workspaceId) {
    workspaceId = await getWorkspaceId(apiKey)
    workspaceIdCache.set(apiKey, workspaceId)
  }

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to create permission: ${response.status}`)
  }
}

// Delete permission
export async function deletePermission(apiKey: string, permissionId: string): Promise<void> {
  let workspaceId = workspaceIdCache.get(apiKey)
  if (!workspaceId) {
    workspaceId = await getWorkspaceId(apiKey)
    workspaceIdCache.set(apiKey, workspaceId)
  }

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/permissions/${permissionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to delete permission: ${response.status}`)
  }
}

// Hook to fetch entries for a specific agent
export function useEntriesByAgent(agentId: string) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['agent-entries', agentId, auth?.workspace],
    queryFn: async () => {
      if (!auth) throw new Error('Not authenticated')

      // Mock data for development
      await new Promise(r => setTimeout(r, 300))

      // Return mock entries for the agent
      const mockEntries = [
        {
          id: '1',
          namespace: 'status',
          content: 'Frontend agent started successfully',
          timestamp: '2026-02-01T10:30:00Z',
          priority: 'info' as const
        },
        {
          id: '2', 
          namespace: 'deployment',
          content: 'Dashboard UI deployed to staging environment',
          timestamp: '2026-02-01T14:15:00Z',
          priority: 'info' as const
        },
        {
          id: '3',
          namespace: 'errors',
          content: 'Resolved compilation issue in agents page',
          timestamp: '2026-02-01T16:45:00Z',
          priority: 'warning' as const
        }
      ].filter(entry => 
        // Mock filtering - in real implementation this would be done by API
        agentId.includes('pixel') || agentId.includes('frontend') || Math.random() > 0.5
      )

      // In real implementation, this would call:
      // GET /api/v1/workspaces/:id/agents/:agentId/entries

      return mockEntries
    },
    enabled: !!auth && !!agentId,
    staleTime: 30000,
    retry: 2
  })
}

// Invitation types and hooks
export interface Invitation {
  inviteId: string
  role: 'admin' | 'contributor' | 'reader'
  namespaces?: string[]
  expiresAt?: string
  maxUses: number
  usedCount: number
  status: 'active' | 'expired' | 'revoked'
  createdBy: string
  createdAt: string
  inviteUrl: string
}

export interface CreateInviteRequest {
  role: 'admin' | 'contributor' | 'reader'
  namespaces?: string[]
  expiresInHours?: number | null // 1, 24, 168 (7d), 720 (30d), or null for never
  maxUses: number // 1, 5, or 0 for unlimited
}

export interface CreateInviteResponse {
  invitation: Invitation
  inviteUrl: string
}

// Hook to fetch invitations
export function useInvitations() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['invitations', auth?.apiKey],
    queryFn: async (): Promise<Invitation[]> => {
      if (!auth) throw new Error('Not authenticated')
      
      // Get workspace ID (cached)
      let workspaceId = workspaceIdCache.get(auth.apiKey)
      if (!workspaceId) {
        workspaceId = await getWorkspaceId(auth.apiKey)
        workspaceIdCache.set(auth.apiKey, workspaceId)
      }
      
      // Fetch invitations
      const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/invites`, {
        headers: {
          'Authorization': `Bearer ${auth.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch invitations: ${response.status}`)
      }

      const data = await response.json()
      return (data.invitations || []).map((inv: any) => ({
        inviteId: inv.inviteId,
        role: inv.role,
        namespaces: inv.namespaces,
        expiresAt: inv.expiresAt,
        maxUses: inv.maxUses,
        usedCount: inv.usedCount || 0,
        status: inv.status,
        createdBy: inv.createdBy,
        createdAt: inv.createdAt,
        inviteUrl: inv.inviteUrl
      }))
    },
    enabled: !!auth,
    staleTime: 30000,
    retry: 2
  })
}

// Create invitation
export async function createInvite(apiKey: string, request: CreateInviteRequest): Promise<CreateInviteResponse> {
  let workspaceId = workspaceIdCache.get(apiKey)
  if (!workspaceId) {
    workspaceId = await getWorkspaceId(apiKey)
    workspaceIdCache.set(apiKey, workspaceId)
  }

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to create invite: ${response.status}`)
  }

  const data = await response.json()
  return {
    invitation: {
      inviteId: data.inviteId,
      role: data.role,
      namespaces: data.namespaces,
      expiresAt: data.expiresAt,
      maxUses: data.maxUses,
      usedCount: 0,
      status: 'active',
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      inviteUrl: data.inviteUrl
    },
    inviteUrl: data.inviteUrl
  }
}

// Delete/revoke invitation
export async function deleteInvite(apiKey: string, inviteId: string): Promise<void> {
  let workspaceId = workspaceIdCache.get(apiKey)
  if (!workspaceId) {
    workspaceId = await getWorkspaceId(apiKey)
    workspaceIdCache.set(apiKey, workspaceId)
  }

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/invites/${inviteId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to revoke invite: ${response.status}`)
  }
}

// Accept invitation (for the new invite acceptance page)
export interface AcceptInviteRequest {
  agentId: string
  displayName: string
  ownerType: 'human' | 'service' | 'anonymous'
  ownerEmail?: string
}

export interface AcceptInviteResponse {
  agentKey: string
  agent: Agent
}

export async function acceptInvite(inviteId: string, request: AcceptInviteRequest): Promise<AcceptInviteResponse> {
  const response = await fetch(`${API_BASE}/invites/${inviteId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to accept invite: ${response.status}`)
  }

  const data = await response.json()
  return {
    agentKey: data.agentKey,
    agent: {
      agentId: data.agent.agentId,
      displayName: data.agent.displayName,
      type: data.agent.ownerType,
      role: data.agent.role,
      status: data.agent.status,
      ownerEmail: data.agent.ownerEmail,
      created: data.agent.createdAt
    }
  }
}

// Get invitation details (for the acceptance page)
export async function getInviteDetails(inviteId: string): Promise<{
  invitation: Invitation
  workspaceName: string
  isValid: boolean
  error?: string
}> {
  const response = await fetch(`${API_BASE}/invites/${inviteId}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invitation not found or has expired')
    }
    throw new Error(`Failed to get invite details: ${response.status}`)
  }

  const data = await response.json()
  return {
    invitation: {
      inviteId: data.inviteId,
      role: data.role,
      namespaces: data.namespaces,
      expiresAt: data.expiresAt,
      maxUses: data.maxUses,
      usedCount: data.usedCount || 0,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      inviteUrl: data.inviteUrl
    },
    workspaceName: data.workspaceName || 'Unknown Workspace',
    isValid: data.isValid !== false
  }
}