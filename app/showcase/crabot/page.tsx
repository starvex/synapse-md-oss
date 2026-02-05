'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, FileText, FolderOpen, Activity, ExternalLink, ChevronRight, Zap } from 'lucide-react'

// Crabot.ai Agent Data
const agents = [
  { id: 'r2d2', name: 'R2D2', role: 'Chief of Staff', emoji: '🤖', status: 'online', namespaces: ['*'], description: 'Координатор всех агентов. Правая рука Roman.' },
  { id: 'spock', name: 'Spock', role: 'Backend Engineer', emoji: '⚙️', status: 'online', namespaces: ['api/*', 'db/*', 'infra/*'], description: 'API, базы данных, бизнес-логика.' },
  { id: 'pixel', name: 'Pixel', role: 'Frontend Engineer', emoji: '🎨', status: 'online', namespaces: ['ui/*', 'components/*', 'design/*'], description: 'UI, UX, компоненты, анимации.' },
  { id: 'scotty', name: 'Scotty', role: 'DevOps Engineer', emoji: '🔧', status: 'online', namespaces: ['infra/*', 'deploy/*', 'monitoring/*'], description: 'Docker, CI/CD, серверы, деплой.' },
  { id: 'hawk', name: 'Hawk', role: 'QA Engineer', emoji: '🧪', status: 'online', namespaces: ['qa/*', 'bugs/*', 'tests/*'], description: 'Тестирование, баг-хантинг.' },
  { id: 'swift', name: 'Swift', role: 'Mobile Engineer', emoji: '📱', status: 'idle', namespaces: ['mobile/*', 'expo/*', 'native/*'], description: 'React Native, Expo, мобильные приложения.' },
  { id: 'cortex', name: 'Cortex', role: 'AI/ML Engineer', emoji: '🧠', status: 'idle', namespaces: ['ai/*', 'ml/*', 'models/*'], description: 'AI модели, ML пайплайны.' },
  { id: 'figma', name: 'Figma', role: 'UI/UX Designer', emoji: '🎭', status: 'idle', namespaces: ['design/*', 'ui/*', 'brand/*'], description: 'Дизайн, прототипы, UI системы.' },
  { id: 'shield', name: 'Shield', role: 'Security Engineer', emoji: '🛡️', status: 'idle', namespaces: ['security/*', 'auth/*', 'audit/*'], description: 'Безопасность, аудит, шифрование.' },
  { id: 'atlas', name: 'Atlas', role: 'Project Manager', emoji: '📋', status: 'offline', namespaces: ['projects/*', 'roadmap/*', 'sprints/*'], description: 'Проекты, роадмапы, спринты.' },
  { id: 'quill', name: 'Quill', role: 'Copywriter', emoji: '✍️', status: 'offline', namespaces: ['content/*', 'docs/*', 'marketing/*'], description: 'Контент, документация, копирайт.' },
  { id: 'mercury', name: 'Mercury', role: 'Marketing', emoji: '📣', status: 'offline', namespaces: ['marketing/*', 'social/*', 'campaigns/*'], description: 'Маркетинг, социалки, кампании.' },
  { id: 'newton', name: 'Newton', role: 'R&D', emoji: '🔬', status: 'offline', namespaces: ['research/*', 'experiments/*', 'papers/*'], description: 'Исследования, эксперименты.' },
  { id: 'harmony', name: 'Harmony', role: 'HR Manager', emoji: '👥', status: 'offline', namespaces: ['hr/*', 'team/*', 'culture/*'], description: 'HR, команда, культура.' },
  { id: 'judge', name: 'Judge', role: 'Legal Counsel', emoji: '⚖️', status: 'offline', namespaces: ['legal/*', 'compliance/*', 'contracts/*'], description: 'Юридические вопросы, compliance.' },
]

// Sample Shared Documents
const sharedDocs = [
  { 
    namespace: 'api', 
    docs: [
      { name: 'ENDPOINTS.md', from: 'spock', priority: 'critical', summary: 'API v2 endpoints — breaking changes Feb 15' },
      { name: 'AUTH_FLOW.md', from: 'shield', priority: 'important', summary: 'OAuth2 + JWT implementation details' },
      { name: 'RATE_LIMITS.md', from: 'spock', priority: 'info', summary: 'Rate limiting configuration per tier' },
    ]
  },
  { 
    namespace: 'infra', 
    docs: [
      { name: 'VPS_STATUS.md', from: 'scotty', priority: 'critical', summary: 'VPS migration in progress — ETA 2h' },
      { name: 'DOCKER_COMPOSE.md', from: 'scotty', priority: 'info', summary: 'Container orchestration setup' },
      { name: 'MONITORING.md', from: 'scotty', priority: 'info', summary: 'Grafana + Prometheus config' },
    ]
  },
  { 
    namespace: 'ui', 
    docs: [
      { name: 'DESIGN_SYSTEM.md', from: 'figma', priority: 'important', summary: 'Component library v3.0 specs' },
      { name: 'DARK_MODE.md', from: 'pixel', priority: 'info', summary: 'Theme implementation guide' },
    ]
  },
  { 
    namespace: 'qa', 
    docs: [
      { name: 'BLOCKERS.md', from: 'hawk', priority: 'critical', summary: '3 P0 bugs blocking release' },
      { name: 'TEST_COVERAGE.md', from: 'hawk', priority: 'info', summary: 'Current: 73% → Target: 85%' },
    ]
  },
  { 
    namespace: 'projects', 
    docs: [
      { name: 'ROADMAP_Q1.md', from: 'atlas', priority: 'important', summary: 'Q1 2026 milestones and deadlines' },
      { name: 'SPRINT_14.md', from: 'atlas', priority: 'info', summary: 'Current sprint: Feb 1-14' },
    ]
  },
]

// Activity Feed
const recentActivity = [
  { agent: 'hawk', action: 'wrote', target: 'qa/BLOCKERS.md', time: '2 min ago', priority: 'critical' },
  { agent: 'scotty', action: 'updated', target: 'infra/VPS_STATUS.md', time: '15 min ago', priority: 'critical' },
  { agent: 'spock', action: 'wrote', target: 'api/ENDPOINTS.md', time: '1 hour ago', priority: 'important' },
  { agent: 'pixel', action: 'updated', target: 'ui/DARK_MODE.md', time: '2 hours ago', priority: 'info' },
  { agent: 'r2d2', action: 'consolidated', target: 'shared memory', time: '3 hours ago', priority: 'info' },
  { agent: 'shield', action: 'wrote', target: 'security/AUDIT_JAN.md', time: '5 hours ago', priority: 'important' },
]

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  offline: 'bg-zinc-500'
}

const priorityColors: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/20 border-red-500/30',
  important: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  info: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
}

export default function CrabotShowcase() {
  const [expandedNamespace, setExpandedNamespace] = useState<string | null>('api')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const onlineCount = agents.filter(a => a.status === 'online').length
  const idleCount = agents.filter(a => a.status === 'idle').length
  const totalDocs = sharedDocs.reduce((acc, ns) => acc + ns.docs.length, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted hover:text-foreground transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <div className="text-3xl">🦀</div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Crabot.ai</h1>
                  <p className="text-sm text-muted">Live Synapse Workspace</p>
                </div>
              </div>
            </div>
            <a 
              href="https://crabot.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-accent-green/20 text-accent-green border border-accent-green/30 rounded-lg hover:bg-accent-green/30 transition-colors"
            >
              Visit Crabot.ai
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users size={20} className="text-accent-green" />
              <span className="text-muted text-sm">Total Agents</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{agents.length}</div>
            <div className="text-sm text-muted mt-1">
              <span className="text-green-400">{onlineCount} online</span> · <span className="text-yellow-400">{idleCount} idle</span>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen size={20} className="text-accent-amber" />
              <span className="text-muted text-sm">Namespaces</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{sharedDocs.length}</div>
            <div className="text-sm text-muted mt-1">Active categories</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText size={20} className="text-blue-400" />
              <span className="text-muted text-sm">Shared Docs</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{totalDocs}</div>
            <div className="text-sm text-muted mt-1">Across all namespaces</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap size={20} className="text-purple-400" />
              <span className="text-muted text-sm">Token Savings</span>
            </div>
            <div className="text-3xl font-bold text-accent-green">78%</div>
            <div className="text-sm text-muted mt-1">Via namespace filtering</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Agents Column */}
          <div className="col-span-1">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users size={18} />
              Agent Team
            </h2>
            <div className="space-y-2">
              {agents.map(agent => (
                <div 
                  key={agent.id}
                  className={`bg-surface border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedAgent === agent.id 
                      ? 'border-accent-green bg-accent-green/5' 
                      : 'border-border hover:border-accent-green/30'
                  }`}
                  onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${statusColors[agent.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{agent.name}</div>
                      <div className="text-sm text-muted truncate">{agent.role}</div>
                    </div>
                    <ChevronRight size={16} className={`text-muted transition-transform ${selectedAgent === agent.id ? 'rotate-90' : ''}`} />
                  </div>
                  {selectedAgent === agent.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted mb-2">{agent.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.namespaces.map(ns => (
                          <span key={ns} className="text-xs px-2 py-0.5 bg-accent-green/10 text-accent-green rounded font-mono">
                            {ns}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shared Docs Column */}
          <div className="col-span-1">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FolderOpen size={18} />
              Shared Documentation
            </h2>
            <div className="space-y-2">
              {sharedDocs.map(ns => (
                <div key={ns.namespace} className="bg-surface border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedNamespace(expandedNamespace === ns.namespace ? null : ns.namespace)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-light transition-colors"
                  >
                    <FolderOpen size={18} className={expandedNamespace === ns.namespace ? 'text-accent-green' : 'text-muted'} />
                    <span className="font-mono text-accent-green font-medium">{ns.namespace}/</span>
                    <span className="text-sm text-muted">({ns.docs.length})</span>
                    <ChevronRight size={16} className={`ml-auto text-muted transition-transform ${expandedNamespace === ns.namespace ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedNamespace === ns.namespace && (
                    <div className="border-t border-border">
                      {ns.docs.map(doc => {
                        const agent = agents.find(a => a.id === doc.from)
                        return (
                          <div key={doc.name} className="p-4 border-b border-border last:border-b-0 hover:bg-surface-light transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{agent?.emoji}</span>
                              <span className="font-mono text-sm text-foreground">{doc.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded border ${priorityColors[doc.priority]}`}>
                                {doc.priority}
                              </span>
                            </div>
                            <p className="text-sm text-muted">{doc.summary}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Column */}
          <div className="col-span-1">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity size={18} />
              Recent Activity
            </h2>
            <div className="bg-surface border border-border rounded-lg divide-y divide-border">
              {recentActivity.map((activity, i) => {
                const agent = agents.find(a => a.id === activity.agent)
                return (
                  <div key={i} className="p-4 hover:bg-surface-light transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{agent?.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium text-foreground">{agent?.name}</span>
                          <span className="text-muted"> {activity.action} </span>
                          <span className="font-mono text-accent-green">{activity.target}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted">{activity.time}</span>
                          {activity.priority !== 'info' && (
                            <span className={`text-xs px-2 py-0.5 rounded border ${priorityColors[activity.priority]}`}>
                              {activity.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Protocol Badge */}
            <div className="mt-6 bg-gradient-to-br from-accent-green/10 to-accent-amber/10 border border-accent-green/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">🧬</div>
                <div>
                  <div className="font-semibold text-foreground">Powered by Synapse</div>
                  <div className="text-sm text-muted">Multi-agent memory protocol</div>
                </div>
              </div>
              <p className="text-sm text-muted mb-4">
                This workspace demonstrates real-time agent collaboration through shared, namespaced memory.
              </p>
              <Link 
                href="/whitepaper"
                className="inline-flex items-center gap-2 text-sm text-accent-green hover:text-accent-amber transition-colors"
              >
                Read the Whitepaper
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
