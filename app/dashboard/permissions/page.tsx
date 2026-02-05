'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '../../../components/dashboard/protected-route'
import { ErrorBoundary, ApiErrorFallback } from '../../../components/dashboard/error-boundary'
import { SkeletonGrid } from '../../../components/dashboard/skeleton-loaders'
import { Settings, Plus, MoreHorizontal, Trash2, Shield, Users, Hash, Check, X, Edit3, Mail, Copy, QrCode, ExternalLink, Clock, User } from 'lucide-react'
import { 
  usePermissionMatrix, 
  useAgentsWithPermissions, 
  useNamespaces, 
  createPermission, 
  deletePermission,
  useInvitations,
  createInvite,
  deleteInvite,
  type Permission,
  type CreateInviteRequest 
} from '../../../lib/permissions-hooks'
import { useAuth } from '../../../lib/hooks'

// Role badges for agents
const ROLE_BADGES = {
  owner: { emoji: '👑', label: 'Full Access', bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
  admin: { emoji: '⚡', label: 'Full Access', bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  contributor: { emoji: '✍️', label: 'Limited Access', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
  reader: { emoji: '👀', label: 'Read Only', bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' },
  scoped_writer: { emoji: '📝', label: 'Scoped Access', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' }
}

// Permission level styles
const PERMISSION_STYLES = {
  none: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-500', icon: X },
  read: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', icon: Check },
  write: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', icon: Edit3 }
}

interface AddPermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  apiKey: string
}

interface CreateInviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  apiKey: string
}

const CreateInviteModal = ({ isOpen, onClose, onSuccess, apiKey }: CreateInviteModalProps) => {
  const { data: namespaces } = useNamespaces()
  const [formData, setFormData] = useState({
    role: 'contributor' as 'admin' | 'contributor' | 'reader',
    selectedNamespaces: [] as string[],
    expiresIn: 168 as number | null, // 7 days default
    maxUses: 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ inviteUrl: string } | null>(null)

  const expiresOptions = [
    { label: '1 hour', value: 1 },
    { label: '24 hours', value: 24 }, 
    { label: '7 days', value: 168 },
    { label: '30 days', value: 720 },
    { label: 'Never', value: null }
  ]

  const maxUsesOptions = [
    { label: '1 use', value: 1 },
    { label: '5 uses', value: 5 },
    { label: 'Unlimited', value: 0 }
  ]

  const handleNamespaceToggle = (namespace: string) => {
    setFormData(prev => ({
      ...prev,
      selectedNamespaces: prev.selectedNamespaces.includes(namespace)
        ? prev.selectedNamespaces.filter(ns => ns !== namespace)
        : [...prev.selectedNamespaces, namespace]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const request: CreateInviteRequest = {
        role: formData.role,
        namespaces: formData.selectedNamespaces.length > 0 ? formData.selectedNamespaces : undefined,
        expiresInHours: formData.expiresIn,
        maxUses: formData.maxUses
      }

      const response = await createInvite(apiKey, request)
      setResult({ inviteUrl: response.inviteUrl })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result?.inviteUrl) {
      navigator.clipboard.writeText(result.inviteUrl)
    }
  }

  const handleClose = () => {
    setFormData({
      role: 'contributor',
      selectedNamespaces: [],
      expiresIn: 168,
      maxUses: 1
    })
    setResult(null)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Mail size={20} />
              {result ? 'Invitation Created' : 'Create Invitation'}
            </h3>
            <button
              onClick={handleClose}
              className="p-2 text-muted hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          
          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-green-400 font-medium mb-2">✓ Invitation created successfully!</div>
                <div className="text-sm text-muted">Share this URL with the person you want to invite:</div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-muted">Invitation URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={result.inviteUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-surface-light border border-border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-accent-green text-black rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-accent-green text-black font-medium py-3 px-4 rounded-lg hover:brightness-110 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['admin', 'contributor', 'reader'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role as any })}
                      className={`p-3 border rounded-lg text-center transition-all ${
                        formData.role === role
                          ? 'bg-accent-green/20 border-accent-green text-accent-green'
                          : 'border-border text-muted hover:border-accent-green'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Namespaces (optional)</label>
                <div className="text-xs text-muted mb-3">Leave empty to grant access to all namespaces based on role</div>
                <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-3 bg-surface-light">
                  {namespaces && namespaces.length > 0 ? (
                    <div className="space-y-2">
                      {namespaces.map(namespace => (
                        <label key={namespace} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.selectedNamespaces.includes(namespace)}
                            onChange={() => handleNamespaceToggle(namespace)}
                            className="accent-accent-green"
                          />
                          <span className="text-sm text-foreground font-mono">{namespace}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted text-sm">No namespaces available</div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Expires in</label>
                <div className="grid grid-cols-2 gap-2">
                  {expiresOptions.map(option => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, expiresIn: option.value })}
                      className={`p-2 border rounded-lg text-center transition-all ${
                        formData.expiresIn === option.value
                          ? 'bg-accent-green/20 border-accent-green text-accent-green'
                          : 'border-border text-muted hover:border-accent-green'
                      }`}
                    >
                      <div className="text-sm">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Max uses</label>
                <div className="grid grid-cols-3 gap-2">
                  {maxUsesOptions.map(option => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, maxUses: option.value })}
                      className={`p-2 border rounded-lg text-center transition-all ${
                        formData.maxUses === option.value
                          ? 'bg-accent-green/20 border-accent-green text-accent-green'
                          : 'border-border text-muted hover:border-accent-green'
                      }`}
                    >
                      <div className="text-sm">{option.label}</div>
                    </button>
                  ))}
                </div>
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
                  className="flex-1 bg-accent-green text-black font-medium py-3 px-4 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Invitation'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-3 border border-border rounded-lg hover:border-accent-green transition-all text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const AddPermissionModal = ({ isOpen, onClose, onSuccess, apiKey }: AddPermissionModalProps) => {
  const { data: agents } = useAgentsWithPermissions()
  const { data: namespaces } = useNamespaces()
  const [formData, setFormData] = useState({
    agentId: '',
    namespace: '',
    newNamespace: '',
    permission: 'read' as 'read' | 'write'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useNewNamespace, setUseNewNamespace] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const namespace = useNewNamespace ? formData.newNamespace : formData.namespace
      if (!formData.agentId || !namespace) {
        throw new Error('Please fill in all fields')
      }

      await createPermission(apiKey, {
        agentId: formData.agentId,
        namespace,
        permission: formData.permission
      })
      
      setFormData({ agentId: '', namespace: '', newNamespace: '', permission: 'read' })
      setUseNewNamespace(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add permission')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield size={20} />
              Add Permission
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Agent *</label>
              <select
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
                required
              >
                <option value="">Select agent...</option>
                {agents?.map(agent => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.displayName} ({agent.agentId})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Namespace *</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="existing"
                    name="namespaceType"
                    checked={!useNewNamespace}
                    onChange={() => setUseNewNamespace(false)}
                    className="accent-accent-green"
                  />
                  <label htmlFor="existing" className="text-sm text-foreground">Use existing namespace</label>
                </div>
                
                {!useNewNamespace && (
                  <select
                    value={formData.namespace}
                    onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                    className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
                    required={!useNewNamespace}
                  >
                    <option value="">Select namespace...</option>
                    {namespaces?.map(ns => (
                      <option key={ns} value={ns}>{ns}</option>
                    ))}
                  </select>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="new"
                    name="namespaceType"
                    checked={useNewNamespace}
                    onChange={() => setUseNewNamespace(true)}
                    className="accent-accent-green"
                  />
                  <label htmlFor="new" className="text-sm text-foreground">Create new namespace</label>
                </div>
                
                {useNewNamespace && (
                  <input
                    type="text"
                    value={formData.newNamespace}
                    onChange={(e) => setFormData({ ...formData, newNamespace: e.target.value })}
                    placeholder="Enter namespace name"
                    className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
                    required={useNewNamespace}
                  />
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Permission Level *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, permission: 'read' })}
                  className={`p-3 border rounded-lg text-center transition-all ${
                    formData.permission === 'read'
                      ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                      : 'border-border text-muted hover:border-accent-green'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Check size={16} />
                    Read
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, permission: 'write' })}
                  className={`p-3 border rounded-lg text-center transition-all ${
                    formData.permission === 'write'
                      ? 'bg-green-500/20 border-green-500/30 text-green-400'
                      : 'border-border text-muted hover:border-accent-green'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Edit3 size={16} />
                    Write
                  </div>
                </button>
              </div>
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
                {loading ? 'Adding...' : 'Add Permission'}
              </button>
              <button
                type="button"
                onClick={onClose}
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

const PermissionCell = ({ 
  agent, 
  namespace, 
  permission, 
  onUpdate, 
  onDelete,
  isReadonly 
}: { 
  agent: any
  namespace: string
  permission?: Permission
  onUpdate: (permission: 'read' | 'write') => void
  onDelete: () => void
  isReadonly: boolean
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  
  // Determine current permission level
  const permLevel = permission?.permission || 'none'
  const style = PERMISSION_STYLES[permLevel]
  const Icon = style.icon

  // Check if this agent has full access (owner/admin)
  const hasFullAccess = agent.role === 'owner' || agent.role === 'admin'
  
  if (hasFullAccess) {
    return (
      <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium ${PERMISSION_STYLES.write.bg} ${PERMISSION_STYLES.write.border} ${PERMISSION_STYLES.write.text} border`}>
        <div className="flex items-center justify-center gap-1">
          <Edit3 size={14} />
          Full
        </div>
      </div>
    )
  }

  if (isReadonly) {
    return (
      <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium ${style.bg} ${style.border} ${style.text} border`}>
        <div className="flex items-center justify-center gap-1">
          <Icon size={14} />
          {permLevel === 'none' ? '-' : permLevel}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`w-full px-3 py-2 rounded-lg text-center text-sm font-medium border transition-all hover:brightness-110 ${style.bg} ${style.border} ${style.text}`}
      >
        <div className="flex items-center justify-center gap-1">
          <Icon size={14} />
          {permLevel === 'none' ? '-' : permLevel}
        </div>
      </button>
      
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-20 min-w-[120px]">
            <button
              onClick={() => {
                onUpdate('read')
                setShowDropdown(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-surface-light transition-colors"
            >
              <Check size={14} />
              Read
            </button>
            <button
              onClick={() => {
                onUpdate('write')
                setShowDropdown(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-surface-light transition-colors"
            >
              <Edit3 size={14} />
              Write
            </button>
            {permission && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={() => {
                    onDelete()
                    setShowDropdown(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const InvitationsSection = () => {
  const { auth } = useAuth()
  const { data: invitations, isLoading: invitationsLoading, refetch } = useInvitations()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const getStatusBadge = (invitation: any) => {
    if (invitation.status === 'expired' || (invitation.expiresAt && new Date(invitation.expiresAt) < new Date())) {
      return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', label: 'Expired' }
    }
    if (invitation.status === 'revoked') {
      return { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Revoked' }
    }
    if (invitation.maxUses > 0 && invitation.usedCount >= invitation.maxUses) {
      return { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Used up' }
    }
    return { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', label: 'Active' }
  }

  const formatExpiresAt = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return 'Never'
    const date = new Date(expiresAt)
    const now = new Date()
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 0) return 'Expired'
    if (diffHours < 24) return `${diffHours}h`
    if (diffHours < 168) return `${Math.round(diffHours / 24)}d`
    return date.toLocaleDateString()
  }

  const handleRevoke = async (inviteId: string) => {
    if (!auth?.apiKey) return
    
    try {
      await deleteInvite(auth.apiKey, inviteId)
      refetch()
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
    }
  }

  const copyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2 mb-2">
            <Mail size={20} />
            Invitations
          </h2>
          <p className="text-muted text-sm">
            Manage workspace invitations and external agent access.
          </p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          Create Invite
        </button>
      </div>

      {invitationsLoading ? (
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-surface-light rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {invitations && invitations.length > 0 ? (
            <div className="divide-y divide-border">
              {invitations.map(invitation => {
                const statusBadge = getStatusBadge(invitation)
                return (
                  <div key={invitation.inviteId} className="p-4 hover:bg-surface-light/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {invitation.role}
                          </div>
                          {invitation.namespaces && invitation.namespaces.length > 0 && (
                            <div className="text-xs text-muted">
                              {invitation.namespaces.length} namespace{invitation.namespaces.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Expires: {formatExpiresAt(invitation.expiresAt)}
                          </span>
                          <span>
                            Uses: {invitation.usedCount}/{invitation.maxUses === 0 ? '∞' : invitation.maxUses}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            Created by {invitation.createdBy}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyInviteUrl(invitation.inviteUrl)}
                          className="p-2 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-light"
                          title="Copy invite URL"
                        >
                          <Copy size={16} />
                        </button>
                        
                        <button
                          onClick={() => handleRevoke(invitation.inviteId)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-500/10"
                          title="Revoke invitation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {invitation.namespaces && invitation.namespaces.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {invitation.namespaces.map(ns => (
                          <span key={ns} className="px-2 py-1 bg-surface-light border border-border rounded text-xs font-mono">
                            {ns}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h3 className="text-lg font-medium text-foreground mb-2">No invitations</h3>
              <p className="text-muted mb-4">Create your first invitation to invite external agents to this workspace.</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all"
              >
                Create Invite
              </button>
            </div>
          )}
        </div>
      )}
      
      {auth?.apiKey && (
        <CreateInviteModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
          apiKey={auth.apiKey}
        />
      )}
    </div>
  )
}

const PermissionMatrix = () => {
  const { auth } = useAuth()
  const { data: agents, isLoading: agentsLoading } = useAgentsWithPermissions()
  const { data: namespaces, isLoading: namespacesLoading } = useNamespaces()
  const { data: matrix, isLoading: matrixLoading, refetch } = usePermissionMatrix()
  const [showAddModal, setShowAddModal] = useState(false)

  const permissions = matrix?.permissions || []

  // Calculate permission badges for agents
  const agentPermissionCounts = useMemo(() => {
    const counts: Record<string, { namespaces: number; hasWrite: boolean }> = {}
    
    permissions.forEach(perm => {
      if (!counts[perm.agentId]) {
        counts[perm.agentId] = { namespaces: 0, hasWrite: false }
      }
      if (perm.permission !== 'none') {
        counts[perm.agentId].namespaces++
        if (perm.permission === 'write') {
          counts[perm.agentId].hasWrite = true
        }
      }
    })
    
    return counts
  }, [permissions])

  const handleUpdatePermission = async (agentId: string, namespace: string, permissionLevel: 'read' | 'write') => {
    if (!auth?.apiKey) return
    
    try {
      await createPermission(auth.apiKey, { agentId, namespace, permission: permissionLevel })
      refetch()
    } catch (error) {
      console.error('Failed to update permission:', error)
    }
  }

  const handleDeletePermission = async (permissionId: string) => {
    if (!auth?.apiKey || !permissionId) return
    
    try {
      await deletePermission(auth.apiKey, permissionId)
      refetch()
    } catch (error) {
      console.error('Failed to delete permission:', error)
    }
  }

  const getPermission = (agentId: string, namespace: string): Permission | undefined => {
    return permissions.find(p => p.agentId === agentId && p.namespace === namespace)
  }

  if (agentsLoading || namespacesLoading || matrixLoading) {
    return (
      <div className="mb-6">
        <div className="h-6 bg-surface-light rounded w-48 animate-pulse mb-4" />
        <div className="h-10 bg-surface-light rounded w-32 animate-pulse" />
        <SkeletonGrid count={6} SkeletonComponent={() => (
          <div className="h-20 bg-surface-light rounded animate-pulse" />
        )} />
      </div>
    )
  }

  if (!agents || !namespaces) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h3 className="text-xl font-bold text-foreground mb-2">No data available</h3>
          <p className="text-muted mb-6">Unable to load agents or namespaces.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2 mb-2">
            <Settings size={20} />
            Permission Matrix
          </h2>
          <p className="text-muted text-sm">
            Green = write, Blue = read access.
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Agent summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {agents.map(agent => {
          const roleBadge = ROLE_BADGES[agent.role as keyof typeof ROLE_BADGES] || ROLE_BADGES.contributor
          const permCount = agentPermissionCounts[agent.agentId]
          
          let accessInfo = ''
          if (agent.role === 'owner' || agent.role === 'admin') {
            accessInfo = roleBadge.label
          } else if (agent.role === 'reader') {
            accessInfo = 'Read Only'
          } else if (permCount) {
            accessInfo = `${permCount.namespaces} namespace${permCount.namespaces !== 1 ? 's' : ''}`
          } else {
            accessInfo = 'No access'
          }
          
          return (
            <div key={agent.agentId} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-foreground text-sm">{agent.displayName}</div>
                  <div className="text-xs text-muted font-mono">{agent.agentId}</div>
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${roleBadge.bg} ${roleBadge.border} ${roleBadge.text}`}>
                  <span>{roleBadge.emoji}</span>
                  {agent.role}
                </div>
              </div>
              <div className="text-xs text-muted">{accessInfo}</div>
            </div>
          )
        })}
      </div>

      {/* Permission Matrix Grid */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden relative">
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="bg-surface-light border-b border-border p-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: '200px repeat(var(--cols), 120px)' } as any}>
                <div className="font-medium text-muted text-sm flex items-center gap-2">
                  <Users size={16} />
                  Agents
                </div>
                {namespaces.map(namespace => (
                  <div key={namespace} className="text-center font-medium text-muted text-sm flex items-center justify-center gap-1">
                    <Hash size={14} />
                    {namespace}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-border">
              {agents.map(agent => (
                <div key={agent.agentId} className="p-4 hover:bg-surface-light/50 transition-colors">
                  <div className="grid gap-4" style={{ gridTemplateColumns: '200px repeat(var(--cols), 120px)' } as any}>
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-foreground text-sm">{agent.displayName}</div>
                        <div className="text-xs text-muted font-mono">{agent.agentId}</div>
                        <div className="text-xs text-muted mt-1">{agent.role}</div>
                      </div>
                    </div>
                    
                    {namespaces.map(namespace => {
                      const permission = getPermission(agent.agentId, namespace)
                      return (
                        <PermissionCell
                          key={`${agent.agentId}-${namespace}`}
                          agent={agent}
                          namespace={namespace}
                          permission={permission}
                          onUpdate={(level) => handleUpdatePermission(agent.agentId, namespace, level)}
                          onDelete={() => permission?.id && handleDeletePermission(permission.id)}
                          isReadonly={false}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {auth?.apiKey && (
        <AddPermissionModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => refetch()}
          apiKey={auth.apiKey}
        />
      )}
      
      <style jsx>{`
        :root {
          --cols: ${namespaces.length};
        }
      `}</style>
    </div>
  )
}

// Simple settings header without tabs
const SettingsHeader = () => {
  const router = useRouter()
  
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 p-4">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-light"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings size={20} />
            Settings
          </h1>
          <p className="text-muted text-sm">Manage workspace permissions and agent access.</p>
        </div>
      </div>
    </header>
  )
}

export default function PermissionsPage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col bg-background">
          <SettingsHeader />
          <div className="flex-1 max-w-7xl mx-auto px-4 py-6 pb-24 space-y-8">
            <PermissionMatrix />
            <InvitationsSection />
          </div>
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}