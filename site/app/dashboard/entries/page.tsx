'use client'

import { useEntries, useAgents, getAgentEmoji, formatRelativeTime } from '../../../lib/hooks'
import { useState, useMemo } from 'react'
import ProtectedRoute from '../../../components/dashboard/protected-route'
import DashboardHeader from '../../../components/dashboard/header'
import { ErrorBoundary, ApiErrorFallback } from '../../../components/dashboard/error-boundary'
import { SkeletonNamespaceFolder } from '../../../components/dashboard/skeleton-loaders'
import { Loader2, Folder, FolderOpen, Plus, Search, FileText, ChevronRight, MoreHorizontal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

interface NamespaceGroup {
  name: string
  entries: any[]
  expanded: boolean
}

const NamespaceFolder = ({ namespace, onToggle, onViewEntry }: any) => {
  const { name, entries, expanded } = namespace
  
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(name)}
        className="w-full touch-target flex items-center gap-3 p-4 text-left hover:bg-surface-light active:bg-surface-light transition-colors"
      >
        {expanded ? <FolderOpen size={20} className="text-accent-green flex-shrink-0" /> : <Folder size={20} className="text-muted flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-mono text-accent-green font-medium truncate">{name}</span>
            <span className="text-sm text-muted">({entries.length} {entries.length === 1 ? 'entry' : 'entries'})</span>
          </div>
        </div>
        <ChevronRight size={16} className={`text-muted transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="border-t border-border">
          {entries.map((entry: any) => (
            <div
              key={entry.id}
              className="touch-target flex items-start sm:items-center gap-3 p-4 border-b border-border last:border-b-0 hover:bg-surface-light active:bg-surface-light transition-colors cursor-pointer"
              onClick={() => onViewEntry(entry)}
            >
              <div className="text-lg flex-shrink-0 mt-0.5 sm:mt-0">{getAgentEmoji(entry.agentId)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate mb-1">
                  {entry.content.split('\n')[0].replace(/^#+\s*/, '')}
                </div>
                <div className="flex items-center gap-2 text-muted text-sm">
                  <span>{entry.agentId}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(entry.timestamp)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <FileText size={16} className="text-muted" />
                <button 
                  className="touch-target p-1 text-muted hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Show entry options
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const EntryModal = ({ entry, onClose }: any) => {
  if (!entry) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl max-w-4xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden mobile-safe-bottom">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="text-xl flex-shrink-0">{getAgentEmoji(entry.agentId)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{entry.agentId}</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-muted">
                <span className="font-mono text-accent-green break-all">{entry.namespace}</span>
                <span className="hidden sm:inline">•</span>
                <span>{formatRelativeTime(entry.timestamp)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="touch-target p-2 text-muted hover:text-foreground transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[60vh] mobile-scroll">
          <div className="prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{entry.content}</ReactMarkdown>
          </div>
          
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border">
              {entry.tags.map((tag: string) => (
                <span key={tag} className="px-2 py-1 bg-surface-light text-muted text-xs rounded font-mono break-all">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const SharedDocuments = () => {
  const { data: entries, isLoading, error, refetch } = useEntries()
  const { data: agents, isLoading: agentsLoading } = useAgents()
  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(new Set())
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const namespaceGroups = useMemo(() => {
    if (!entries) return []
    
    // Group entries by namespace
    const groups = new Map<string, any[]>()
    
    entries.forEach(entry => {
      if (!groups.has(entry.namespace)) {
        groups.set(entry.namespace, [])
      }
      groups.get(entry.namespace)!.push(entry)
    })
    
    // Convert to array and sort
    const result = Array.from(groups.entries())
      .map(([name, entries]) => ({
        name,
        entries: entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        expanded: expandedNamespaces.has(name)
      }))
      .sort((a, b) => b.entries.length - a.entries.length)
    
    // Filter by search query if provided
    if (searchQuery) {
      return result.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.entries.some(entry => 
          entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.agentId.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }
    
    return result
  }, [entries, expandedNamespaces, searchQuery])

  const toggleNamespace = (namespaceName: string) => {
    const newExpanded = new Set(expandedNamespaces)
    if (newExpanded.has(namespaceName)) {
      newExpanded.delete(namespaceName)
    } else {
      newExpanded.add(namespaceName)
    }
    setExpandedNamespaces(newExpanded)
  }

  if (error) {
    return (
      <ApiErrorFallback
        error={error as Error}
        retry={refetch}
        title="Failed to load shared documents"
        description="We couldn't fetch the document namespaces. Check your connection and try again."
      />
    )
  }

  if (isLoading || agentsLoading) {
    return (
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-surface-light rounded w-48 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-10 bg-surface-light rounded w-80 animate-pulse" />
              <div className="h-10 bg-surface-light rounded w-36 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonNamespaceFolder key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-xl font-bold text-foreground mb-2">No shared documents</h3>
          <p className="text-muted mb-6">Shared knowledge will organize here by namespace.</p>
          <button className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all">
            Create namespace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-medium text-foreground">
            📁 Namespaces ({namespaceGroups.length})
          </h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative order-2 sm:order-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search namespaces and entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-light border border-border rounded-lg pl-10 pr-4 py-3 text-base sm:text-sm w-full sm:w-80 focus:border-accent-green focus:outline-none"
              />
            </div>
            
            <button className="touch-target bg-accent-green text-black font-medium py-3 px-4 rounded-lg hover:brightness-110 transition-all flex items-center gap-2 justify-center order-1 sm:order-2">
              <Plus size={16} />
              <span className="sm:block">Create Namespace</span>
            </button>
          </div>
        </div>
        
        {searchQuery && (
          <div className="text-sm text-muted">
            {namespaceGroups.length} result{namespaceGroups.length !== 1 ? 's' : ''} for "{searchQuery}"
            <button 
              onClick={() => setSearchQuery('')}
              className="text-accent-green ml-2 hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {namespaceGroups.map(namespace => (
          <NamespaceFolder
            key={namespace.name}
            namespace={namespace}
            onToggle={toggleNamespace}
            onViewEntry={setSelectedEntry}
          />
        ))}
      </div>
      
      <EntryModal 
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  )
}

export default function EntriesPage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <DashboardHeader 
            title="Shared Documents"
            description="Knowledge organized by namespace. Browse shared entries and create new collaborative spaces."
          />
          <SharedDocuments />
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}