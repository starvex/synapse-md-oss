'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ErrorBoundary, ApiErrorFallback } from '../../../components/dashboard/error-boundary'
import { Shield, User, Mail, AlertCircle, CheckCircle, Copy, ExternalLink, ArrowRight } from 'lucide-react'
import { 
  getInviteDetails, 
  acceptInvite,
  type AcceptInviteRequest,
  type Invitation
} from '../../../lib/permissions-hooks'

interface InviteDetailsState {
  invitation: Invitation | null
  workspaceName: string
  isValid: boolean
  error?: string
  loading: boolean
}

const AcceptInvitePage = () => {
  const params = useParams()
  const router = useRouter()
  const inviteId = params.inviteId as string

  const [inviteDetails, setInviteDetails] = useState<InviteDetailsState>({
    invitation: null,
    workspaceName: '',
    isValid: false,
    loading: true
  })

  const [formData, setFormData] = useState({
    agentId: '',
    displayName: '',
    ownerType: 'human' as 'human' | 'service' | 'anonymous',
    ownerEmail: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ agentKey: string; agent: any } | null>(null)
  const [submitError, setSubmitError] = useState('')

  // Fetch invite details on mount
  useEffect(() => {
    if (!inviteId) return

    const fetchDetails = async () => {
      try {
        const details = await getInviteDetails(inviteId)
        setInviteDetails({
          ...details,
          loading: false
        })
      } catch (error) {
        setInviteDetails({
          invitation: null,
          workspaceName: '',
          isValid: false,
          error: error instanceof Error ? error.message : 'Failed to load invitation',
          loading: false
        })
      }
    }

    fetchDetails()
  }, [inviteId])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    try {
      if (!formData.agentId || !formData.displayName) {
        throw new Error('Please fill in all required fields')
      }

      if (formData.ownerType === 'human' && !formData.ownerEmail) {
        throw new Error('Email is required for human agents')
      }

      const request: AcceptInviteRequest = {
        agentId: formData.agentId,
        displayName: formData.displayName,
        ownerType: formData.ownerType,
        ownerEmail: formData.ownerType === 'human' ? formData.ownerEmail : undefined
      }

      const response = await acceptInvite(inviteId, request)
      setResult(response)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to accept invitation')
    } finally {
      setSubmitting(false)
    }
  }

  const copyAgentKey = () => {
    if (result?.agentKey) {
      navigator.clipboard.writeText(result.agentKey)
    }
  }

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  if (inviteDetails.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green mx-auto mb-4"></div>
          <p className="text-muted">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (inviteDetails.error || !inviteDetails.isValid || !inviteDetails.invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-red-400 mb-4">
            <AlertCircle size={48} className="mx-auto" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-muted mb-6">
            {inviteDetails.error || 'This invitation is no longer valid or has expired.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-green-400 mb-4">
              <CheckCircle size={48} className="mx-auto" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Welcome to the team!</h1>
            <p className="text-muted">
              You have successfully joined the <span className="font-medium">{inviteDetails.workspaceName}</span> workspace.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-green-400 font-medium mb-2">✓ Agent created successfully!</div>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted">Agent ID:</span> <span className="font-mono text-foreground">{result.agent.agentId}</span></div>
                <div><span className="text-muted">Display Name:</span> <span className="text-foreground">{result.agent.displayName}</span></div>
                <div><span className="text-muted">Role:</span> <span className="text-foreground">{result.agent.role}</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted">Your Agent Key</label>
              <div className="p-3 bg-surface-light border border-border rounded-lg">
                <div className="text-xs text-muted mb-2">⚠️ Save this key now! It won't be shown again.</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={result.agentKey}
                    readOnly
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={copyAgentKey}
                    className="px-3 py-2 bg-accent-green text-black rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* API Usage Instructions */}
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-medium text-foreground">📖 How to use the API</label>
              <div className="p-4 bg-surface-light border border-border rounded-lg space-y-4 text-sm">
                <div>
                  <div className="text-muted mb-2">Write to shared memory:</div>
                  <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto text-green-400">
{`curl -X POST "https://synapse-api-production-c366.up.railway.app/api/v1/entries" \\
  -H "X-Agent-Key: ${result.agentKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"namespace":"status","content":"Your message here","tags":["update"]}'`}
                  </pre>
                </div>
                <div>
                  <div className="text-muted mb-2">Read shared memory:</div>
                  <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto text-blue-400">
{`curl "https://synapse-api-production-c366.up.railway.app/api/v1/entries?namespace=status" \\
  -H "X-Agent-Key: ${result.agentKey}"`}
                  </pre>
                </div>
                <div className="text-muted text-xs">
                  💡 Use <code className="bg-black/30 px-1 rounded">namespace</code> to organize entries (e.g., "marketing", "status", "tasks")
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={goToDashboard}
                className="flex-1 bg-accent-green text-black font-medium py-3 px-4 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { invitation } = inviteDetails

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="text-accent-green mb-4">
            <Shield size={48} className="mx-auto" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Join Workspace</h1>
          <p className="text-muted">
            You have been invited to join <span className="font-medium">{inviteDetails.workspaceName}</span>
          </p>
        </div>

        {/* What is Synapse explanation */}
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="text-sm text-blue-300">
            <strong>What is Synapse?</strong> A shared memory protocol for AI agents. 
            Your agent will be able to read and write entries to coordinate with other agents in this workspace.
          </div>
        </div>

        <div className="mb-6 p-4 bg-surface-light border border-border rounded-lg">
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Mail size={16} />
            Invitation Details
          </h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted">Role:</span> <span className="font-medium text-foreground">{invitation.role}</span></div>
            {invitation.namespaces && invitation.namespaces.length > 0 && (
              <div>
                <span className="text-muted">Access to namespaces:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {invitation.namespaces.map(ns => (
                    <span key={ns} className="px-2 py-1 bg-surface border border-border rounded text-xs font-mono">
                      {ns}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {invitation.expiresAt && (
              <div>
                <span className="text-muted">Expires:</span> <span className="text-foreground">{new Date(invitation.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
            <div><span className="text-muted">Uses remaining:</span> <span className="text-foreground">{invitation.maxUses === 0 ? 'Unlimited' : `${invitation.maxUses - invitation.usedCount}`}</span></div>
          </div>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Agent ID *</label>
            <input
              type="text"
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              placeholder="e.g., pixel-frontend"
              className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none font-mono"
              required
            />
            <div className="text-xs text-muted mt-1">Unique identifier for your agent (lowercase, hyphen-separated)</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Display Name *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g., Pixel"
              className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Owner Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'human', label: 'Human', icon: User },
                { value: 'service', label: 'Service', icon: Shield },
                { value: 'anonymous', label: 'Anonymous', icon: User }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, ownerType: value as any })}
                  className={`p-3 border rounded-lg text-center transition-all ${
                    formData.ownerType === value
                      ? 'bg-accent-green/20 border-accent-green text-accent-green'
                      : 'border-border text-muted hover:border-accent-green'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon size={16} />
                    <div className="text-xs">{label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {formData.ownerType === 'human' && (
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Email *</label>
              <input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full px-3 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none"
                required
              />
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent-green text-black font-medium py-3 px-4 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AcceptInviteClient() {
  return (
    <ErrorBoundary>
      <AcceptInvitePage />
    </ErrorBoundary>
  )
}