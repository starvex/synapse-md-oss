'use client'

import { useState } from 'react'
import ProtectedRoute from '../../../components/dashboard/protected-route'
import DashboardHeader from '../../../components/dashboard/header'
import { ErrorBoundary, ApiErrorFallback } from '../../../components/dashboard/error-boundary'
import { SkeletonGrid } from '../../../components/dashboard/skeleton-loaders'
import { Loader2, Plus, MoreHorizontal, Copy, Trash2, Users, Eye, EyeOff } from 'lucide-react'
import { useAgentsWithPermissions, createAgent, deleteAgent } from '../../../lib/permissions-hooks'
import { useAuth } from '../../../lib/hooks'

// Type badges mapping
const TYPE_BADGES = {
  human: { emoji: '🧑', label: 'Human', bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  service: { emoji: '⚙️', label: 'Service', bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' },
  anonymous: { emoji: '👤', label: 'Anonymous', bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' }
}

const STATUS_BADGES = {
  active: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
  inactive: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
  pending: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' }
}

const ROLES = ['owner', 'admin', 'contributor', 'reader', 'scoped_writer']

interface Agent {
  agentId: string
  displayName: string
  type: 'human' | 'service' | 'anonymous'
  role: string
  status: 'active' | 'inactive' | 'pending'
  ownerEmail?: string
  agentKey?: string
  model?: string
  created: string
}

interface CreateAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  apiKey: string
}

const CreateAgentModal = ({ isOpen, onClose, onSuccess, apiKey }: CreateAgentModalProps) => {
  const [formData, setFormData] = useState({
    agentId: '',
    displayName: '',
    ownerType: 'service' as 'human' | 'service' | 'anonymous',
    role: 'contributor',
    ownerEmail: ''
  })
  const [loading, setLoading] = useState(false)
  const [generatedKey, setGeneratedKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await createAgent(apiKey, formData)
      setGeneratedKey(result.agentKey)
      setShowKey(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  const copyKey = () => {
    navigator.clipboard.writeText(generatedKey)
  }

  const reset = () => {
    setFormData({
      agentId: '',
      displayName: '',
      ownerType: 'service',
      role: 'contributor',
      ownerEmail: ''
    })
    setGeneratedKey('')
    setShowKey(false)
    setError('')
  }

  if (!isOpen) return null

  if (generatedKey) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl max-w-md w-full">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="text-2xl mb-2">🔑</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Agent Key Generated</h3>
              <p className="text-muted text-sm">
                Save this key securely. It won't be shown again.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Agent Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={generatedKey}
                    readOnly
                    className="w-full px-3 py-3 pr-12 bg-surface-light border border-border rounded-lg font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={copyKey}
                  className="flex-1 bg-accent-green text-black font-medium py-3 px-4 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copy Key
                </button>
                <button
                  onClick={() => {
                    reset()
                    onClose()
                  }}
                  className="px-4 py-3 border border-border rounded-lg hover:border-accent-green transition-all text-muted hover:text-foreground"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Create New Agent</h3>
            <button
              onClick={() => {
                reset()
                onClose()
              }}
              className="p-2 text-muted hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Agent ID *</label>
              <input
                type="text"
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                placeholder="e.g., pixel-frontend"
                className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Display Name *</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., Pixel Frontend Agent"
                className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Owner Type *</label>
              <select
                value={formData.ownerType}
                onChange={(e) => setFormData({ ...formData, ownerType: e.target.value as any })}
                className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
              >
                <option value="human">🧑 Human</option>
                <option value="service">⚙️ Service</option>
                <option value="anonymous">👤 Anonymous</option>
              </select>
            </div>
            
            {formData.ownerType === 'human' && (
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Owner Email *</label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder="owner@example.com"
                  className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent-green text-black font-medium py-3 px-4 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
                Generate Key
              </button>
              <button
                type="button"
                onClick={() => {
                  reset()
                  onClose()
                }}
                className="px-4 py-3 border border-border rounded-lg hover:border-accent-green transition-all text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const AgentRow = ({ agent, onCopyKey, onDelete }: { 
  agent: Agent, 
  onCopyKey: (key: string) => void,
  onDelete: (agentId: string) => void 
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const typeBadge = TYPE_BADGES[agent.type]
  const statusBadge = STATUS_BADGES[agent.status]

  return (
    <tr className="border-b border-border hover:bg-surface-light/50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-accent-green">
          {agent.agentId}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-foreground">{agent.displayName}</div>
      </td>
      <td className="px-4 py-3">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${typeBadge.bg} ${typeBadge.border} ${typeBadge.text}`}>
          <span>{typeBadge.emoji}</span>
          {typeBadge.label}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-muted">{agent.role}</div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="text-sm text-muted font-mono">
          {agent.model ? (
            <span className="text-purple-400">{agent.model}</span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
          {agent.status}
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="text-sm text-muted">{new Date(agent.created).toLocaleDateString()}</div>
      </td>
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 text-muted hover:text-foreground transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-20 min-w-[140px]">
                <button
                  onClick={() => {
                    onCopyKey(agent.agentKey || '')
                    setShowDropdown(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-light transition-colors"
                >
                  <Copy size={14} />
                  Copy Key
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => {
                    onDelete(agent.agentId)
                    setShowDropdown(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export const AgentsList = () => {
  const { auth } = useAuth()
  const { data: agents, isLoading, error, refetch } = useAgentsWithPermissions()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    // TODO: Show toast notification
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm(`Delete agent "${agentId}"? This action cannot be undone.`)) return
    if (!auth?.apiKey) return
    
    try {
      await deleteAgent(auth.apiKey, agentId)
      refetch()
    } catch (error) {
      // TODO: Show error toast
      console.error('Failed to delete agent:', error)
    }
  }

  if (error) {
    return (
      <ApiErrorFallback
        error={error as Error}
        retry={refetch}
        title="Failed to load agents"
        description="We couldn't fetch the agent list. Check your connection and try again."
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-surface-light rounded w-32 animate-pulse" />
            <div className="h-10 bg-surface-light rounded w-28 animate-pulse" />
          </div>
        </div>
        <SkeletonGrid count={4} SkeletonComponent={() => (
          <div className="h-16 bg-surface-light rounded animate-pulse" />
        )} />
      </div>
    )
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-foreground mb-2">No agents registered</h3>
          <p className="text-muted mb-6">Create your first agent to start managing permissions and access.</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all"
          >
            Create First Agent
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              <Users size={20} />
              Agents ({agents.length})
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {agents.filter(a => a.status === 'active').length} active
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Create Agent
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-light border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Agent ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Display Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted hidden md:table-cell">Model</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted hidden sm:table-cell">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <AgentRow
                  key={agent.agentId}
                  agent={agent}
                  onCopyKey={handleCopyKey}
                  onDelete={handleDeleteAgent}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {auth?.apiKey && (
        <CreateAgentModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
          apiKey={auth.apiKey}
        />
      )}
    </div>
  )
}

export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <DashboardHeader 
            title="Agents"
            description="Manage workspace participants, their roles, and permissions. Create new agents with specific access levels."
          />
          <AgentsList />
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}