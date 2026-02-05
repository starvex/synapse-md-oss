'use client'

import { useAgents, useEntries, getAgentStatus, getRoleColor, getAgentEmoji } from '../../../lib/hooks'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import ProtectedRoute from '../../../components/dashboard/protected-route'
import DashboardHeader from '../../../components/dashboard/header'
import { ErrorBoundary, ApiErrorFallback } from '../../../components/dashboard/error-boundary'
import { SkeletonNetworkGraph } from '../../../components/dashboard/skeleton-loaders'
import { GraphLegend } from '../../../components/dashboard/legend'
import { Loader2 } from 'lucide-react'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2 text-muted">
        <Loader2 size={24} className="animate-spin" />
        <span>Loading graph...</span>
      </div>
    </div>
  )
})

type NodeType = 'orchestrator' | 'agent' | 'namespace'

interface GraphNode {
  id: string
  name: string
  type: NodeType
  role?: string
  model?: string
  emoji: string
  status: 'online' | 'idle' | 'offline' | 'none'
  entryCount: number
  color: string
  size: number
  namespaces?: string[]
  x?: number
  y?: number
  fx?: number
  fy?: number
}

interface GraphLink {
  source: string
  target: string
  label?: string
  type: 'hierarchy' | 'namespace' | 'shared'
  strength: number
  color: string
  curvature?: number
}

interface AgentPanelProps {
  node: GraphNode | null
  onClose: () => void
  entries: any[] | undefined
}

const AGENT_ROLES: Record<string, string> = {
  r2d2: 'orchestrator',
  scotty: 'devops',
  spock: 'backend',
  pixel: 'frontend',
  swift: 'mobile',
  hawk: 'qa',
  figma: 'design',
  alfred: 'concierge',
  cortex: 'ai/ml',
  shield: 'security',
  newton: 'research',
  atlas: 'pm',
  quill: 'copywriter',
  mercury: 'marketing',
  judge: 'legal',
  harmony: 'hr',
}

const AgentPanel = ({ node, onClose, entries }: AgentPanelProps) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!node) return null

  const isNamespace = node.type === 'namespace'
  const nodeEntries = entries?.filter(e => 
    isNamespace 
      ? e.namespace === node.id.replace('ns:', '') 
      : (e.agentId === node.id)
  ) || []

  const panelContent = (
    <>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{node.emoji}</div>
        <h3 className="text-xl font-bold text-foreground break-words">{node.name}</h3>
        <p className="text-muted capitalize">
          {isNamespace ? 'Namespace' : node.role || 'Agent'}
        </p>
        {!isNamespace && node.model && (
          <p className="text-purple-400 text-sm font-mono mt-1">
            {node.model}
          </p>
        )}
        {!isNamespace && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              node.status === 'online' ? 'bg-green-500' :
              node.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-muted capitalize">
              {node.status === 'online' ? 'Active' : 
               node.status === 'idle' ? 'Idle' : 'Offline'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-surface-light rounded-lg p-4">
          <h4 className="text-sm font-medium text-muted mb-2">
            {isNamespace ? 'Namespace Info' : 'Stats'}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Entries:</span>
              <span className="text-foreground">{nodeEntries.length}</span>
            </div>
            {node.namespaces && node.namespaces.length > 0 && (
              <div>
                <span className="text-muted block mb-1">Namespaces:</span>
                <div className="flex flex-wrap gap-1">
                  {node.namespaces.map(ns => (
                    <span key={ns} className="px-2 py-0.5 bg-accent-green/10 text-accent-green rounded text-xs">
                      {ns}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {nodeEntries.length > 0 && (
          <div className="bg-surface-light rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted mb-2">Recent Entries</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto mobile-scroll">
              {nodeEntries.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="text-xs border-l-2 border-accent-green/30 pl-2">
                  <div className="text-foreground break-words line-clamp-2">{entry.content}</div>
                  <div className="text-muted mt-0.5">
                    {entry.namespace} · {entry.agentId}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile: bottom sheet */}
      {isMobile && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" 
            onClick={onClose}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-xl max-h-[85vh] overflow-y-auto z-50 mobile-safe-bottom">
            <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Agent Details</h3>
              <button 
                onClick={onClose} 
                className="touch-target p-2 text-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {panelContent}
            </div>
          </div>
        </>
      )}
      
      {/* Desktop: sidebar (unchanged) */}
      {!isMobile && (
        <div className="fixed right-0 top-0 h-full w-80 bg-surface border-l border-border z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={onClose} className="text-muted hover:text-foreground text-sm">
                ← Back
              </button>
            </div>
            {panelContent}
          </div>
        </div>
      )}
    </>
  )
}

// Namespace color palette
const NS_COLORS: Record<string, string> = {
  status: '#00ff88',
  qa: '#ffd700',
  deploy: '#ff6b6b',
  memory: '#b366ff',
  tasks: '#00d4ff',
  config: '#ff9f43',
  logs: '#54a0ff',
  alerts: '#ee5a24',
}

function getNamespaceColor(ns: string): string {
  if (NS_COLORS[ns]) return NS_COLORS[ns]
  // Generate deterministic color from string
  let hash = 0
  for (let i = 0; i < ns.length; i++) {
    hash = ns.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 60%)`
}

function getNamespaceEmoji(ns: string): string {
  const map: Record<string, string> = {
    status: '📊', qa: '🧪', deploy: '🚀', memory: '🧠',
    tasks: '📋', config: '⚙️', logs: '📝', alerts: '🚨',
    metrics: '📈', errors: '❌', builds: '🏗️', tests: '✅',
  }
  return map[ns] || '📁'
}

export const NetworkGraph = () => {
  const { data: agents, isLoading: agentsLoading, error: agentsError, refetch: refetchAgents } = useAgents()
  const { data: entries, error: entriesError, refetch: refetchEntries } = useEntries()
  const graphRef = useRef<any>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640
      setIsMobile(mobile)
      setDimensions({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      })
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const graphData = useMemo(() => {
    if (!agents) return { nodes: [], links: [] }

    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    // Build namespace map from entries
    const agentNamespaces = new Map<string, Set<string>>()
    const allNamespaces = new Set<string>()
    
    if (entries) {
      entries.forEach(entry => {
        const agentId = entry.agentId || 'unknown'
        if (!agentNamespaces.has(agentId)) {
          agentNamespaces.set(agentId, new Set())
        }
        agentNamespaces.get(agentId)!.add(entry.namespace)
        allNamespaces.add(entry.namespace)
      })
    }

    // Find orchestrator (R2D2 or first agent with orchestrator role)
    const orchestratorId = agents.find(a => 
      a.role === 'orchestrator' || a.id.toLowerCase() === 'r2d2'
    )?.id

    // Mobile optimization: limit agents if too many
    let filteredAgents = agents
    if (isMobile && agents.length > 12) {
      // Show orchestrator + top 8 agents by activity
      const orchestrator = agents.find(a => a.id === orchestratorId)
      const otherAgents = agents
        .filter(a => a.id !== orchestratorId)
        .map(agent => ({
          ...agent,
          entryCount: entries?.filter(e => e.agentId === agent.id).length || 0
        }))
        .sort((a, b) => b.entryCount - a.entryCount)
        .slice(0, 8)
      
      filteredAgents = orchestrator ? [orchestrator, ...otherAgents] : otherAgents.slice(0, 9)
    }

    // Pre-compute radial positions for agents (around center)
    const nonOrchAgents = filteredAgents.filter(a => a.id !== orchestratorId)
    const agentRadius = isMobile ? 150 : 200
    const nsRadius = isMobile ? 240 : 320

    // Create agent nodes
    let agentIndex = 0
    filteredAgents.forEach(agent => {
      const status = getAgentStatus(agent.lastActive)
      const isOrchestrator = agent.id === orchestratorId
      const nsList = agentNamespaces.get(agent.id)
      const nsArray = nsList ? Array.from(nsList) : []
      const entryCount = entries?.filter(e => e.agentId === agent.id).length || 0
      
      // Position: orchestrator at center, others in a circle
      let initX = 0, initY = 0
      if (!isOrchestrator) {
        const angle = (2 * Math.PI * agentIndex) / nonOrchAgents.length - Math.PI / 2
        initX = agentRadius * Math.cos(angle)
        initY = agentRadius * Math.sin(angle)
        agentIndex++
      }

      nodes.push({
        id: agent.id,
        name: agent.id,
        type: isOrchestrator ? 'orchestrator' : 'agent',
        role: isOrchestrator ? 'orchestrator' : (agent.role || AGENT_ROLES[agent.id] || 'agent'),
        model: agent.model,
        emoji: getAgentEmoji(agent.id, agent.role),
        status,
        entryCount,
        namespaces: nsArray,
        color: isOrchestrator ? '#00ff88' : getRoleColor(agent.role),
        size: isOrchestrator ? (isMobile ? 35 : 45) : Math.max(isMobile ? 22 : 28, Math.min(isMobile ? 32 : 38, (isMobile ? 22 : 28) + entryCount * 2)),
        x: initX,
        y: initY,
        ...(isOrchestrator ? { fx: 0, fy: 0 } : {}), // Pin orchestrator to center
      })
    })

    // Create namespace nodes positioned in outer ring
    let nsIndex = 0
    const nsCount = allNamespaces.size
    allNamespaces.forEach(ns => {
      const nsEntryCount = entries?.filter(e => e.namespace === ns).length || 0
      const angle = (2 * Math.PI * nsIndex) / Math.max(nsCount, 1) + Math.PI / 4
      nodes.push({
        id: `ns:${ns}`,
        name: ns,
        type: 'namespace',
        emoji: getNamespaceEmoji(ns),
        status: 'none',
        entryCount: nsEntryCount,
        color: getNamespaceColor(ns),
        size: Math.max(18, Math.min(28, 18 + nsEntryCount)),
        x: nsRadius * Math.cos(angle),
        y: nsRadius * Math.sin(angle),
      })
      nsIndex++
    })

    // Create hierarchy links: orchestrator → all agents
    if (orchestratorId) {
      filteredAgents.forEach(agent => {
        if (agent.id !== orchestratorId) {
          links.push({
            source: orchestratorId,
            target: agent.id,
            type: 'hierarchy',
            label: 'manages',
            strength: 0.3,
            color: '#00ff88cc',
          })
        }
      })
    }

    // Create agent → namespace links
    agentNamespaces.forEach((namespaces, agentId) => {
      namespaces.forEach(ns => {
        const nsEntryCount = entries?.filter(e => e.agentId === agentId && e.namespace === ns).length || 0
        links.push({
          source: agentId,
          target: `ns:${ns}`,
          type: 'namespace',
          label: `${nsEntryCount} entries`,
          strength: 0.5 + nsEntryCount * 0.1,
          color: getNamespaceColor(ns) + '99',
        })
      })
    })

    // Create shared-namespace links between agents
    const agentIds = Array.from(agentNamespaces.keys())
    agentIds.forEach((a, i) => {
      agentIds.slice(i + 1).forEach(b => {
        const shared = [...agentNamespaces.get(a)!].filter(ns => agentNamespaces.get(b)!.has(ns))
        if (shared.length > 0) {
          links.push({
            source: a,
            target: b,
            type: 'shared',
            label: shared.join(', '),
            strength: shared.length,
            color: '#00d4ff77',
            curvature: 0.3,
          })
        }
      })
    })

    return { nodes, links }
  }, [agents, entries, isMobile])

  // Configure force simulation for better spacing — run once
  const forceConfigured = useRef(false)
  useEffect(() => {
    if (forceConfigured.current || !graphRef.current || graphData.nodes.length === 0) return
    forceConfigured.current = true
    
    const timer = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.d3Force('charge')?.strength(isMobile ? -250 : -400)
        graphRef.current.d3Force('link')?.distance((link: any) => {
          const baseDist = isMobile ? 80 : 100
          return link.type === 'hierarchy' ? baseDist + 50 : 
                 link.type === 'namespace' ? baseDist : baseDist + 80
        })
        graphRef.current.d3Force('center')?.strength(0.05)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [graphData, isMobile])

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
  }, [])

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { x, y, size, color, emoji, status, type } = node

    // Guard: force graph may call before positions are computed
    if (x == null || y == null || !isFinite(x) || !isFinite(y)) return

    if (type === 'namespace') {
      // Namespace: hexagon shape
      const r = size / 2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const px = x + r * Math.cos(angle)
        const py = y + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fillStyle = '#0d0d0d'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5 / globalScale
      ctx.setLineDash([3 / globalScale, 3 / globalScale])
      ctx.stroke()
      ctx.setLineDash([])

      // Emoji
      ctx.font = `${size / 2.5}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, x, y)

      // Label
      ctx.font = `${Math.max(3, 10 / globalScale)}px Inter`
      ctx.fillStyle = color
      ctx.globalAlpha = 0.8
      ctx.fillText(node.name, x, y + size / 2 + 10 / globalScale)
      ctx.globalAlpha = 1
      return
    }

    const isOrchestrator = type === 'orchestrator'

    // Glow for orchestrator
    if (isOrchestrator) {
      const gradient = ctx.createRadialGradient(x, y, size / 4, x, y, size)
      gradient.addColorStop(0, '#00ff8822')
      gradient.addColorStop(1, '#00ff8800')
      ctx.beginPath()
      ctx.arc(x, y, size, 0, 2 * Math.PI)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Node circle
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI)
    ctx.fillStyle = '#111111'
    ctx.fill()

    // Border — thicker for orchestrator
    ctx.strokeStyle = color
    ctx.lineWidth = (isOrchestrator ? 3 : 2) / globalScale
    ctx.stroke()

    // Second ring for orchestrator
    if (isOrchestrator) {
      ctx.beginPath()
      ctx.arc(x, y, size / 2 + 4 / globalScale, 0, 2 * Math.PI)
      ctx.strokeStyle = '#00ff8844'
      ctx.lineWidth = 1 / globalScale
      ctx.stroke()
    }

    // Status indicator
    if (status === 'online') {
      ctx.beginPath()
      ctx.arc(x + size / 3, y - size / 3, 4 / globalScale, 0, 2 * Math.PI)
      ctx.fillStyle = '#10b981'
      ctx.fill()
      ctx.strokeStyle = '#0a0a0a'
      ctx.lineWidth = 1 / globalScale
      ctx.stroke()
    } else if (status === 'idle') {
      ctx.beginPath()
      ctx.arc(x + size / 3, y - size / 3, 4 / globalScale, 0, 2 * Math.PI)
      ctx.fillStyle = '#eab308'
      ctx.fill()
    }

    // Emoji
    ctx.font = `${size / 2}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'white'
    ctx.fillText(emoji, x, y)

    // Label
    const fontSize = Math.max(3, (isOrchestrator ? 13 : 12) / globalScale)
    ctx.font = `${isOrchestrator ? 'bold ' : ''}${fontSize}px Inter`
    ctx.fillStyle = isOrchestrator ? '#00ff88' : '#e5e5e5'
    ctx.fillText(node.name, x, y + size / 2 + 15 / globalScale)

    // Model or role label for all agents
    const subLabel = node.model || node.role
    if (subLabel) {
      ctx.font = `${Math.max(2, 9 / globalScale)}px Inter`
      ctx.fillStyle = node.model ? '#a855f788' : (isOrchestrator ? '#00ff8888' : '#ffffff66')
      ctx.fillText(subLabel, x, y + size / 2 + 28 / globalScale)
    }
  }, [])

  const linkColor = useCallback((link: any) => link.color || '#00ff8866', [])
  const linkWidth = useCallback((link: any) => link.type === 'hierarchy' ? 1.5 : link.type === 'shared' ? 2 : 1, [])
  const linkDash = useCallback((link: any) => link.type === 'hierarchy' ? [6, 4] : null, [])
  const linkCurvature = useCallback((link: any) => link.curvature || 0, [])

  if (agentsError || entriesError) {
    return (
      <ApiErrorFallback
        error={(agentsError || entriesError) as Error}
        retry={() => {
          if (agentsError) refetchAgents()
          if (entriesError) refetchEntries()
        }}
        title="Failed to load network data"
        description="We couldn't load the agent network. Check your connection and API access."
      />
    )
  }

  if (agentsLoading) {
    return <SkeletonNetworkGraph />
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-bold text-foreground mb-2">No agents connected</h3>
          <p className="text-muted mb-6">Add agents to start monitoring their activity and shared knowledge.</p>
          <button className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all">
            Add your first agent
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <GraphLegend />

      <div className="h-full bg-background">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          onNodeClick={handleNodeClick}
          nodeRelSize={isMobile ? 4 : 6}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkLineDash={linkDash}
          linkCurvature={linkCurvature}
          linkDirectionalArrowLength={(link: any) => link.type === 'hierarchy' ? (isMobile ? 4 : 6) : 0}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={linkColor}
          linkDirectionalParticles={(link: any) => isMobile ? 0 : (link.type === 'namespace' ? 2 : link.type === 'hierarchy' ? 1 : 0)}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={(link: any) => link.color?.replace(/[0-9a-f]{2}$/, 'aa') || '#00ff88aa'}
          d3AlphaDecay={isMobile ? 0.02 : 0.015}
          d3VelocityDecay={isMobile ? 0.3 : 0.25}
          cooldownTicks={isMobile ? 100 : 200}
          nodeId="id"
          onEngineStop={() => {
            if (graphRef.current) {
              const padding = isMobile ? 40 : 60
              const time = isMobile ? 200 : 400
              graphRef.current.zoomToFit(time, padding)
            }
          }}
          backgroundColor="#0a0a0a"
          width={dimensions.width - (selectedNode && !isMobile ? 320 : 0)}
          height={dimensions.height - (isMobile ? 180 : 140)}
        />
      </div>
      
      <AgentPanel 
        node={selectedNode} 
        onClose={() => setSelectedNode(null)}
        entries={entries}
      />
    </div>
  )
}

export default function NetworkPage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <DashboardHeader 
            title="Network Graph"
            description="Agent hierarchy, namespace connections, and shared memory flow."
          />
          <NetworkGraph />
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}
