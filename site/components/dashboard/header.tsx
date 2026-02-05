'use client'

import { useAuth, useWorkspaceStatus } from '../../lib/hooks'
import { Search, Filter, LogOut, Play, Menu, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DEMO_WORKSPACE, DEMO_API_KEY } from '../../lib/demo-data'
import { useState, useEffect } from 'react'

interface HeaderProps {
  title: string
  description: string
}

const ViewTabs = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'feed'
  
  const tabs = [
    { id: 'feed', label: 'Feed', emoji: '📊' },
    { id: 'network', label: 'Graph', emoji: '🕸️' },
    { id: 'entries', label: 'Docs', emoji: '📚' },
    { id: 'agents', label: 'Agents', emoji: '🤖' },
  ]
  
  const handleTabChange = (tabId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabId)
    router.push(url.toString())
  }
  
  return (
    <>
      {/* Desktop tabs - unchanged */}
      <div className="hidden sm:flex bg-surface-light rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              currentTab === tab.id
                ? 'bg-accent-green text-black'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile tabs - horizontal scroll */}
      <div className="sm:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`touch-target flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap min-w-fit transition-all ${
              currentTab === tab.id
                ? 'bg-accent-green text-black'
                : 'bg-surface-light text-muted active:bg-surface'
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </>
  )
}

export default function DashboardHeader({ title, description }: HeaderProps) {
  const { auth, logout } = useAuth()
  const { data: status } = useWorkspaceStatus()
  const router = useRouter()
  const [statsExpanded, setStatsExpanded] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  const isDemo = auth?.workspace === DEMO_WORKSPACE && auth?.apiKey === DEMO_API_KEY
  const displayWorkspace = isDemo ? 'crabot-ai' : auth?.workspace
  
  const handleLogout = () => {
    logout()
    // Hard navigation to force state refresh
    window.location.href = '/dashboard'
  }

  // Close mobile menu when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setShowMobileMenu(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 mobile-safe-top">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Row 1: Workspace + burger menu */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="touch-target flex items-center gap-2 text-sm font-medium text-accent-green min-w-0 flex-1"
            >
              <span className="truncate">{displayWorkspace}</span>
              {statsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isDemo && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded flex-shrink-0">
                <Play size={10} />
                Demo
              </span>
            )}
          </div>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="touch-target p-2 text-muted hover:text-foreground transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Collapsible stats panel */}
        {statsExpanded && status && (
          <div className="border-b border-border/50 bg-surface/50 px-4 py-3 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted">Agents online:</span>
              <span className="text-foreground font-medium">{status.agents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Entries today:</span>
              <span className="text-foreground font-medium">{status.entriesToday}</span>
            </div>
            {status.lastActivity && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Last activity:</span>
                <span className="text-foreground font-medium">{status.lastActivity}</span>
              </div>
            )}
          </div>
        )}

        {/* Row 2: Tab navigation */}
        <div className="px-4 py-3 border-b border-border/50">
          <ViewTabs />
        </div>

        {/* Page title (mobile) */}
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground break-words">{title}</h1>
          <p className="text-muted text-sm mt-1 break-words line-clamp-2">{description}</p>
        </div>

        {/* Mobile menu overlay */}
        {showMobileMenu && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileMenu(false)}
            />
            <div className="absolute top-full right-4 bg-surface border border-border rounded-lg p-2 z-50 min-w-48 shadow-lg">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 px-3 py-2 text-sm border-b border-border mb-1">
                  <Search size={16} className="text-muted" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="bg-surface-light border border-border rounded px-2 py-1 text-sm flex-1 focus:border-accent-green focus:outline-none"
                  />
                </div>
                
                <button className="touch-target flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-light rounded transition-colors">
                  <Filter size={16} />
                  Filter
                </button>
                
                <button
                  onClick={() => {
                    router.push('/dashboard/permissions')
                    setShowMobileMenu(false)
                  }}
                  className="touch-target flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-light rounded transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </button>
                
                <button
                  onClick={handleLogout}
                  className="touch-target flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-light rounded transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop Layout - unchanged */}
      <div className="hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Top row - Workspace info and status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-foreground">
                  Workspace: <span className="text-accent-green">{displayWorkspace}</span>
                </div>
                {isDemo && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-accent-amber/20 text-accent-amber text-xs font-medium rounded-full border border-accent-amber/30">
                    <Play size={12} />
                    Demo Mode
                  </span>
                )}
              </div>
              
              {status && (
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span>Agents: <span className="text-foreground">{status.agents} online</span></span>
                  <span>Entries: <span className="text-foreground">{status.entriesToday} today</span></span>
                  {status.lastActivity && (
                    <span>Last: <span className="text-foreground">{status.lastActivity}</span></span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search size={20} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-surface-light border border-border rounded-lg px-3 py-2 text-sm w-64 focus:border-accent-green focus:outline-none"
                />
              </div>
              
              <button className="p-2 text-muted hover:text-foreground transition-colors">
                <Filter size={20} />
              </button>
              
              <button
                onClick={() => router.push('/dashboard/permissions')}
                className="p-2 text-muted hover:text-foreground transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 text-muted hover:text-foreground transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          
          {/* Bottom row - Title and navigation */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted mt-1">{description}</p>
            </div>
            
            <ViewTabs />
          </div>
        </div>
      </div>
    </header>
  )
}