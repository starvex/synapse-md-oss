'use client'

import { useEntries, useAgents, getAgentEmoji, formatRelativeTime } from '../../../lib/hooks'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProtectedRoute from '../../../components/dashboard/protected-route'
import DashboardHeader from '../../../components/dashboard/header'
import { ErrorBoundary, ApiErrorFallback } from '../../../components/dashboard/error-boundary'
import { SkeletonEntry, SkeletonCard } from '../../../components/dashboard/skeleton-loaders'
import { Loader2, Filter, ChevronDown, ChevronRight, Pin, Reply, MoreHorizontal } from 'lucide-react'

interface FilterState {
  agent: string[]
  namespace: string[]
  priority: string[]
  search: string
}

const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    info: 'bg-green-500/20 text-green-400 border-green-500/30'
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs border font-mono ${colors[priority as keyof typeof colors] || colors.info}`}>
      {priority}
    </span>
  )
}

const EntryCard = ({ entry, agent, expanded, onToggleExpand }: any) => {
  const agentEmoji = getAgentEmoji(entry.agentId, agent?.role)
  const relativeTime = formatRelativeTime(entry.timestamp)
  
  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-accent-green/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xl">{agentEmoji}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{entry.agentId}</span>
              <span className="text-muted">•</span>
              <span className="text-accent-green font-mono text-sm">{entry.namespace}</span>
              <span className="text-muted">•</span>
              <span className="text-muted text-sm">{relativeTime}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {entry.priority && <PriorityBadge priority={entry.priority} />}
          <div className={`w-2 h-2 rounded-full ${
            entry.priority === 'critical' ? 'bg-red-500' :
            entry.priority === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
        </div>
      </div>
      
      <div className="mb-4">
        <div className={`text-foreground leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          {entry.content}
        </div>
        {entry.content.length > 200 && (
          <button
            onClick={() => onToggleExpand(entry.id)}
            className="text-accent-green text-sm mt-2 hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {entry.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-1 bg-surface-light text-muted text-xs rounded font-mono">
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-4">
        {/* TODO: implement */}
        <button className="flex items-center gap-1 text-muted cursor-not-allowed opacity-50 text-sm">
          <ChevronRight size={16} />
          Expand
        </button>
        {/* TODO: implement */}
        <button className="flex items-center gap-1 text-muted cursor-not-allowed opacity-50 text-sm">
          <Reply size={16} />
          Reply
        </button>
        {/* TODO: implement */}
        <button className="flex items-center gap-1 text-muted cursor-not-allowed opacity-50 text-sm">
          <Pin size={16} />
          Pin
        </button>
        <button className="flex items-center gap-1 text-muted hover:text-accent-green transition-colors text-sm ml-auto">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  )
}

const FilterPanel = ({ filters, updateFilters, agents, namespaces }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="bg-surface border border-border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Filter size={16} />
          <span className="font-medium">Filters</span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Agents</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {agents?.map((agent: any) => (
                <label key={agent.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-accent-green"
                    checked={filters.agent.includes(agent.id)}
                    onChange={(e) => {
                      const newAgents = e.target.checked
                        ? [...filters.agent, agent.id]
                        : filters.agent.filter((id: string) => id !== agent.id)
                      updateFilters({ ...filters, agent: newAgents })
                    }}
                  />
                  <span className="mr-1">{getAgentEmoji(agent.id, agent.role)}</span>
                  {agent.id}
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Namespaces</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {namespaces?.map((namespace: string) => (
                <label key={namespace} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-accent-green"
                    checked={filters.namespace.includes(namespace)}
                    onChange={(e) => {
                      const newNamespaces = e.target.checked
                        ? [...filters.namespace, namespace]
                        : filters.namespace.filter((ns: string) => ns !== namespace)
                      updateFilters({ ...filters, namespace: newNamespaces })
                    }}
                  />
                  <span className="font-mono text-accent-green">{namespace}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Priority</label>
            {['critical', 'warning', 'info'].map(priority => (
              <label key={priority} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-accent-green"
                  checked={filters.priority.includes(priority)}
                  onChange={(e) => {
                    const newPriorities = e.target.checked
                      ? [...filters.priority, priority]
                      : filters.priority.filter((p: string) => p !== priority)
                    updateFilters({ ...filters, priority: newPriorities })
                  }}
                />
                <PriorityBadge priority={priority} />
              </label>
            ))}
          </div>
          
          <button
            onClick={() => updateFilters({ agent: [], namespace: [], priority: [], search: '' })}
            className="w-full text-sm text-muted hover:text-foreground border border-border rounded py-2"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}

export const ActivityFeed = () => {
  const { data: entries, isLoading, error, refetch } = useEntries()
  const { data: agents, isLoading: agentsLoading } = useAgents()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [filters, setFilters] = useState<FilterState>({
    agent: [],
    namespace: [],
    priority: [],
    search: ''
  })
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  
  // Initialize filters from URL params
  useEffect(() => {
    const agentParam = searchParams.get('agent')
    const namespaceParam = searchParams.get('namespace')
    const priorityParam = searchParams.get('priority')
    const searchParam = searchParams.get('search')
    
    setFilters({
      agent: agentParam ? [agentParam] : [],
      namespace: namespaceParam ? [namespaceParam] : [],
      priority: priorityParam ? [priorityParam] : [],
      search: searchParam || ''
    })
  }, [searchParams])
  
  // Update URL when filters change
  const updateFiltersAndUrl = (newFilters: FilterState) => {
    setFilters(newFilters)
    
    const url = new URL(window.location.href)
    // Clear all filter params
    url.searchParams.delete('agent')
    url.searchParams.delete('namespace')
    url.searchParams.delete('priority')
    url.searchParams.delete('search')
    
    // Add new filter params if they have values
    if (newFilters.agent.length === 1) {
      url.searchParams.set('agent', newFilters.agent[0])
    }
    if (newFilters.namespace.length === 1) {
      url.searchParams.set('namespace', newFilters.namespace[0])
    }
    if (newFilters.priority.length === 1) {
      url.searchParams.set('priority', newFilters.priority[0])
    }
    if (newFilters.search) {
      url.searchParams.set('search', newFilters.search)
    }
    
    router.push(url.toString(), { scroll: false })
  }

  const agentMap = useMemo(() => {
    if (!agents) return new Map()
    return new Map(agents.map(agent => [agent.id, agent]))
  }, [agents])

  const namespaces = useMemo(() => {
    if (!entries) return []
    return Array.from(new Set(entries.map(entry => entry.namespace))).sort()
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (!entries) return []
    
    return entries.filter(entry => {
      // Agent filter
      if (filters.agent.length > 0 && !filters.agent.includes(entry.agentId)) {
        return false
      }
      
      // Namespace filter
      if (filters.namespace.length > 0 && !filters.namespace.includes(entry.namespace)) {
        return false
      }
      
      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(entry.priority || 'info')) {
        return false
      }
      
      // Search filter
      if (filters.search && !entry.content.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      return true
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [entries, filters])

  const toggleEntryExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  if (error) {
    return (
      <ApiErrorFallback
        error={error as Error}
        retry={refetch}
        title="Failed to load activity feed"
        description="We couldn't fetch the latest entries. Check your connection and try again."
      />
    )
  }

  if (isLoading || agentsLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6 pb-24">
        <div className="grid grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-3">
            <SkeletonCard />
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-6 bg-surface-light rounded w-32 animate-pulse" />
              <div className="h-10 bg-surface-light rounded w-64 animate-pulse" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonEntry key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-foreground mb-2">No activity yet</h3>
          <p className="text-muted mb-6">Entries will appear here as your agents write to shared memory.</p>
          <button className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all">
            Write first entry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-6 pb-24">
      <div className="grid grid-cols-12 gap-6">
        {/* Filters Sidebar - hidden on mobile */}
        <div className="hidden md:block md:col-span-3">
          <FilterPanel 
            filters={filters}
            updateFilters={updateFiltersAndUrl}
            agents={agents}
            namespaces={namespaces}
          />
        </div>
        
        {/* Main Feed - full width on mobile */}
        <div className="col-span-12 md:col-span-9">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">
              {filteredEntries.length} entries
            </h2>
            
            <input
              type="text"
              placeholder="Search entries..."
              value={filters.search}
              onChange={(e) => updateFiltersAndUrl({ ...filters, search: e.target.value })}
              className="bg-surface-light border border-border rounded-lg px-3 py-2 text-sm w-64 focus:border-accent-green focus:outline-none"
            />
          </div>
          
          <div className="space-y-4">
            {filteredEntries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                agent={agentMap.get(entry.agentId)}
                expanded={expandedEntries.has(entry.id)}
                onToggleExpand={toggleEntryExpansion}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActivityPage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <DashboardHeader 
            title="Activity Feed"
            description="Real-time stream of all agent activity. Filter by agent, namespace, or priority to focus on what matters."
          />
          <ActivityFeed />
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}

export default ActivityPage