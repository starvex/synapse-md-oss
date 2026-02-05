'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Loader2, Eye, EyeOff, Play } from 'lucide-react'
import ProtectedRoute from '../../components/dashboard/protected-route'
import DashboardHeader from '../../components/dashboard/header'
import { Suspense } from 'react'
import { DEMO_WORKSPACE, DEMO_API_KEY } from '../../lib/demo-data'

// Import tab components
import { NetworkGraph } from './network/page'
import { ActivityFeed } from './activity/page'
import { SharedDocuments } from './entries/page'
import { AgentsList } from './agents/page'
import { default as PermissionsPage } from './permissions/page'

interface AuthData {
  workspace: string
  apiKey: string
}

function LoginForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<AuthData>({
    workspace: '',
    apiKey: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [rememberWorkspace, setRememberWorkspace] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const storedAuth = localStorage.getItem('synapse-auth')
    if (storedAuth) {
      try {
        const auth = JSON.parse(storedAuth)
        if (auth.apiKey && auth.workspace) {
          router.push('/dashboard?tab=feed')
          return
        }
      } catch (e) {
        localStorage.removeItem('synapse-auth')
      }
    }

    // Load remembered workspace
    const savedWorkspace = localStorage.getItem('synapse-workspace')
    if (savedWorkspace) {
      setFormData(prev => ({ ...prev, workspace: savedWorkspace }))
    }
  }, [router])

  const validateAuth = async (workspace: string, apiKey: string) => {
    const response = await fetch(`https://synapse-api-production-c366.up.railway.app/api/v1/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Workspace doesn\'t exist. Check the name.')
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Check your credentials.')
      } else if (response.status === 429) {
        throw new Error('Too many attempts. Wait a moment.')
      } else {
        throw new Error('Connection failed. Check your internet.')
      }
    }

    return await response.json()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await validateAuth(formData.workspace, formData.apiKey)
      
      // Store auth data
      localStorage.setItem('synapse-auth', JSON.stringify(formData))
      
      // Store workspace name if remember is checked
      if (rememberWorkspace) {
        localStorage.setItem('synapse-workspace', formData.workspace)
      } else {
        localStorage.removeItem('synapse-workspace')
      }
      
      // Hard navigation to force state refresh
      window.location.href = '/dashboard?tab=feed'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="neural-mesh absolute inset-0" />
      
      <div className="relative w-full max-w-md">
        <div className="bg-surface border border-border rounded-xl p-8 glow-green">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-gradient-green mb-2">
              🧠 Connect to Synapse
            </div>
            <p className="text-muted">
              Monitor your AI agents and shared memory in real-time.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="workspace" className="block text-sm font-medium mb-2">
                Workspace name
              </label>
              <input
                id="workspace"
                type="text"
                value={formData.workspace}
                onChange={(e) => setFormData(prev => ({ ...prev, workspace: e.target.value }))}
                className="w-full px-4 py-3 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none transition-colors"
                placeholder="Enter workspace name"
                required
              />
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
                API key
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full px-4 py-3 pr-12 bg-surface-light border border-border rounded-lg focus:border-accent-green focus:outline-none transition-colors font-mono text-sm"
                  placeholder="syn_r_... or syn_w_..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberWorkspace}
                onChange={(e) => setRememberWorkspace(e.target.checked)}
                className="mr-2 accent-accent-green"
              />
              <label htmlFor="remember" className="text-sm text-muted">
                Remember this workspace
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-green text-black font-semibold py-3 px-4 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              Connect
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-muted">or</span>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.setItem('synapse-auth', JSON.stringify({
                workspace: DEMO_WORKSPACE,
                apiKey: DEMO_API_KEY
              }))
              // Hard navigation to force state refresh
              window.location.href = '/dashboard?tab=network'
            }}
            className="w-full bg-accent-amber/20 text-accent-amber border border-accent-amber/30 font-semibold py-3 px-4 rounded-lg hover:bg-accent-amber/30 transition-all flex items-center justify-center gap-2"
          >
            <Play size={20} />
            View Demo: Crabot.ai
          </button>

          <p className="text-center text-muted text-sm mt-4">
            See a live workspace with 15 AI agents collaborating in real-time.
          </p>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'feed'

  const getTabContent = () => {
    switch (tab) {
      case 'network':
        return <NetworkGraph />
      case 'feed':
        return <ActivityFeed />
      case 'entries':
        return <SharedDocuments />
      case 'agents':
        return <AgentsList />
      case 'permissions':
        return <PermissionsPage />
      default:
        return <ActivityFeed />
    }
  }

  const getTabInfo = () => {
    switch (tab) {
      case 'network':
        return {
          title: 'Network Graph',
          description: 'Agent hierarchy, namespace connections, and shared memory flow.'
        }
      case 'feed':
        return {
          title: 'Activity Feed', 
          description: 'Real-time stream of all agent activity. Filter by agent, namespace, or priority to focus on what matters.'
        }
      case 'entries':
        return {
          title: 'Shared Documents',
          description: 'Knowledge organized by namespace. Browse shared entries and create new collaborative spaces.'
        }
      case 'agents':
        return {
          title: 'Agents',
          description: 'Manage workspace participants, their roles, and permissions. Create new agents with specific access levels.'
        }
      case 'permissions':
        return {
          title: 'Permissions',
          description: 'Manage agent access to different namespaces. Control who can read or write to specific data areas.'
        }
      default:
        return {
          title: 'Activity Feed',
          description: 'Real-time stream of all agent activity. Filter by agent, namespace, or priority to focus on what matters.'
        }
    }
  }

  const tabInfo = getTabInfo()

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <DashboardHeader 
          title={tabInfo.title}
          description={tabInfo.description}
        />
        {getTabContent()}
      </div>
    </ProtectedRoute>
  )
}

export default function DashboardPage() {
  const [auth, setAuth] = useState<AuthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle logout FIRST
    const params = new URLSearchParams(window.location.search)
    if (params.get('logout') === '1') {
      localStorage.removeItem('synapse-auth')
      localStorage.removeItem('synapse-workspace')
      window.history.replaceState({}, '', '/dashboard')
      setLoading(false)
      return
    }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent-green" />
      </div>
    )
  }

  if (!auth) {
    return <LoginForm />
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent-green" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}