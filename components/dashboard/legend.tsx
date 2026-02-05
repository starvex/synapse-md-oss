'use client'

import { useState, useEffect } from 'react'
import { Info, X } from 'lucide-react'

interface LegendProps {
  className?: string
}

const LegendContent = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 rounded-full border-2 border-accent-green bg-[#111] flex-shrink-0" />
      <span className="text-muted text-sm">Orchestrator</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 rounded-full border-2 border-[#00d4ff] bg-[#111] flex-shrink-0" />
      <span className="text-muted text-sm">Agent</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 rotate-45 border border-dashed border-[#ffd700] bg-[#0d0d0d] flex-shrink-0" />
      <span className="text-muted text-sm">Namespace</span>
    </div>
    <div className="border-t border-border pt-2 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-6 border-t border-dashed border-accent-green/40" />
        <span className="text-muted text-sm">Hierarchy</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-6 border-t border-[#ffd700]/60" />
        <span className="text-muted text-sm">Writes to</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-6 border-t-2 border-[#00d4ff]/40" />
        <span className="text-muted text-sm">Shared namespace</span>
      </div>
    </div>
  </div>
)

export const GraphLegend = ({ className = "" }: LegendProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <>
      {/* Mobile: floating action button */}
      {isMobile && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-20 bg-accent-green text-black p-3 rounded-full shadow-lg touch-target hover:bg-accent-green/90 transition-colors"
          aria-label="Show legend"
        >
          <Info size={20} />
        </button>
      )}
      
      {/* Mobile: full-screen overlay */}
      {isMobile && isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-xl p-6 max-h-[70vh] overflow-y-auto z-40 mobile-safe-bottom">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Legend</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="touch-target p-2 text-muted hover:text-foreground transition-colors"
                aria-label="Close legend"
              >
                <X size={20} />
              </button>
            </div>
            <LegendContent />
          </div>
        </>
      )}
      
      {/* Desktop: sidebar (unchanged) */}
      {!isMobile && (
        <div className={`absolute top-4 left-4 z-10 bg-surface/90 border border-border rounded-lg p-4 text-xs backdrop-blur-sm ${className}`}>
          <div className="text-muted font-medium mb-3">Legend</div>
          <LegendContent />
        </div>
      )}
    </>
  )
}

export default GraphLegend