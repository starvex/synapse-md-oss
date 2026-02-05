'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { DEMO_WORKSPACE, DEMO_API_KEY, demoAgents, demoEntries, demoStatus, isDemoMode } from './demo-data'

interface AuthData {
  workspace: string
  apiKey: string
}

interface Agent {
  id: string
  role?: string
  model?: string
  lastActive?: string
  lastSeen?: string
  entryCount?: number
  namespaces?: string[]
  capabilities?: string[]
  registeredAt?: string
}

interface Entry {
  id: string
  agentId?: string
  from_agent?: string
  namespace: string
  content: string
  tags?: string[]
  priority?: 'critical' | 'warning' | 'info'
  timestamp?: string
  created_at?: string
}

interface WorkspaceStatus {
  agents: number
  entriesTotal: number
  entriesToday: number
  lastActivity?: string
}

const API_BASE = 'https://synapse-api-production-c366.up.railway.app/api/v1'

export function useAuth() {
  const [auth, setAuth] = useState<AuthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('synapse-auth')
    if (stored) {
      try {
        setAuth(JSON.parse(stored))
      } catch {
        localStorage.removeItem('synapse-auth')
      }
    }
    setLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem('synapse-auth')
    setAuth(null)
  }

  return { auth, loading, logout }
}

function useApiQuery<T>(endpoint: string, options: { enabled?: boolean } = {}) {
  const { auth } = useAuth()
  const isDemo = auth?.workspace === DEMO_WORKSPACE && auth?.apiKey === DEMO_API_KEY

  return useQuery<T>({
    queryKey: [endpoint, auth?.workspace],
    queryFn: async () => {
      if (!auth) throw new Error('Not authenticated')
      
      // Return demo data if in demo mode
      if (isDemo) {
        await new Promise(r => setTimeout(r, 300)) // Simulate network delay
        if (endpoint.includes('/status')) {
          return demoStatus as T
        }
        if (endpoint.includes('/agents')) {
          return { agents: demoAgents } as T
        }
        if (endpoint.includes('/entries')) {
          return { entries: demoEntries, total: demoEntries.length } as T
        }
        if (endpoint.includes('/audit')) {
          return { events: [] } as T
        }
        return {} as T
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${auth.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your credentials.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Check your API key permissions.')
        } else if (response.status === 404) {
          throw new Error('Workspace not found. Verify the workspace name.')
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw new Error(`API Error: ${response.status} - ${response.statusText}`)
        }
      }

      return response.json()
    },
    enabled: !!auth && options.enabled !== false,
    refetchInterval: isDemo ? false : (endpoint.includes('/entries') ? 5000 : endpoint.includes('/status') ? 5000 : 30000),
    retry: (failureCount, error: any) => {
      // Don't retry auth errors or demo mode
      if (isDemo || error?.message?.includes('Invalid API key') || error?.message?.includes('Access denied')) {
        return false
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useWorkspaceStatus() {
  const { auth } = useAuth()
  const query = useApiQuery<any>(auth ? '/status' : '')
  // API returns { workspace, agents, entries, lastActivity }
  // Map to WorkspaceStatus interface
  const data = useMemo(() => 
    query.data ? {
      agents: query.data.agents,
      entriesTotal: query.data.entries,
      entriesToday: 0, // API doesn't provide this yet
      lastActivity: query.data.lastActivity,
    } as WorkspaceStatus : undefined,
    [query.data]
  )
  return { ...query, data }
}

export function useAgents() {
  const { auth } = useAuth()
  const query = useApiQuery<{ agents: Agent[] }>(auth ? '/agents' : '')
  // API returns { agents: [...] } — unwrap and normalize field names
  const data = useMemo(() => 
    query.data?.agents?.map(a => ({
      ...a,
      lastActive: a.lastSeen || a.lastActive,
    })),
    [query.data]
  )
  return { ...query, data }
}

export function useEntries(since?: string) {
  const { auth } = useAuth()
  const params = new URLSearchParams()
  if (since) params.append('since', since)
  params.append('limit', '50')
  
  const query = useApiQuery<{ entries: Entry[], total: number }>(auth ? `/entries?${params}` : '')
  // API returns { entries: [...], total } — unwrap and normalize field names
  const data = useMemo(() =>
    query.data?.entries?.map(e => ({
      ...e,
      agentId: e.from_agent || e.agentId || 'unknown',
      timestamp: e.created_at || e.timestamp || new Date().toISOString(),
    })),
    [query.data]
  )
  return { ...query, data }
}

export function useAuditLog() {
  const { auth } = useAuth()
  const query = useApiQuery<{ events: any[] }>(auth ? '/audit' : '')
  // API returns { events: [...] } — unwrap
  const data = useMemo(() => query.data?.events, [query.data])
  return { ...query, data }
}

// Utility function to determine agent status based on last activity
export function getAgentStatus(lastActive?: string): 'online' | 'idle' | 'offline' {
  // Support both lastActive and lastSeen field names
  if (!lastActive) return 'offline'
  
  const lastActiveTime = new Date(lastActive).getTime()
  const now = Date.now()
  const diffMinutes = (now - lastActiveTime) / (1000 * 60)
  
  if (diffMinutes <= 5) return 'online'
  if (diffMinutes <= 60) return 'idle'
  return 'offline'
}

// Utility function to format relative time
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const time = new Date(timestamp).getTime()
  const diff = now - time
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Utility function to get role color
export function getRoleColor(role?: string): string {
  if (!role) return '#666666'
  
  const roleLower = role.toLowerCase()
  if (roleLower.includes('orchestrator') || roleLower.includes('r2d2')) return '#00ff88'
  if (roleLower.includes('backend') || roleLower.includes('devops')) return '#00d4ff'
  if (roleLower.includes('frontend') || roleLower.includes('design')) return '#b366ff'
  if (roleLower.includes('mobile')) return '#ff6b6b'
  if (roleLower.includes('qa') || roleLower.includes('test')) return '#ffd700'
  return '#666666'
}

// Utility function to get agent emoji
export function getAgentEmoji(agentId: string, role?: string): string {
  const id = agentId.toLowerCase()
  const roleStr = role?.toLowerCase() || ''
  
  if (id.includes('r2d2')) return '🤖'
  if (id.includes('spock')) return '⚙️'
  if (id.includes('scotty')) return '🔧'
  if (id.includes('pixel') || roleStr.includes('design')) return '🎨'
  if (id.includes('hawk') || roleStr.includes('qa')) return '🧪'
  if (id.includes('swift') || roleStr.includes('mobile')) return '📱'
  if (id.includes('figma')) return '🎭'
  if (id.includes('alfred')) return '🎩'
  if (roleStr.includes('backend')) return '⚙️'
  if (roleStr.includes('frontend')) return '💻'
  if (roleStr.includes('devops')) return '🚀'
  
  return '🤖'
}