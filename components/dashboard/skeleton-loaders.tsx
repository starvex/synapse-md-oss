'use client'

export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-surface border border-border rounded-lg p-4 animate-pulse ${className}`}>
    <div className="flex items-start gap-4 mb-4">
      <div className="w-12 h-12 bg-surface-light rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-surface-light rounded w-32 mb-2" />
        <div className="h-3 bg-surface-light rounded w-24" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-surface-light rounded w-full" />
      <div className="h-3 bg-surface-light rounded w-3/4" />
      <div className="h-3 bg-surface-light rounded w-1/2" />
    </div>
  </div>
)

export const SkeletonEntry = ({ className = '' }: { className?: string }) => (
  <div className={`bg-surface border border-border rounded-lg p-4 animate-pulse ${className}`}>
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 bg-surface-light rounded-full" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 bg-surface-light rounded w-20" />
          <div className="h-3 bg-surface-light rounded w-16" />
          <div className="h-3 bg-surface-light rounded w-12" />
        </div>
      </div>
      <div className="h-5 w-12 bg-surface-light rounded-full" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-surface-light rounded w-full" />
      <div className="h-3 bg-surface-light rounded w-5/6" />
      <div className="h-3 bg-surface-light rounded w-2/3" />
    </div>
    <div className="flex gap-2">
      <div className="h-5 w-16 bg-surface-light rounded" />
      <div className="h-5 w-12 bg-surface-light rounded" />
      <div className="h-5 w-14 bg-surface-light rounded" />
    </div>
  </div>
)

export const SkeletonAgentCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-surface border border-border rounded-xl p-6 animate-pulse ${className}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-surface-light rounded-full" />
        <div>
          <div className="h-5 bg-surface-light rounded w-24 mb-2" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-surface-light rounded-full" />
            <div className="h-4 w-12 bg-surface-light rounded-full" />
          </div>
        </div>
      </div>
      <div className="w-6 h-6 bg-surface-light rounded" />
    </div>
    
    <div className="grid grid-cols-3 gap-4 mb-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="text-center">
          <div className="h-6 bg-surface-light rounded w-8 mx-auto mb-1" />
          <div className="h-3 bg-surface-light rounded w-12 mx-auto" />
        </div>
      ))}
    </div>
    
    <div className="mb-4">
      <div className="h-3 bg-surface-light rounded w-24 mb-2" />
      <div className="flex flex-wrap gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-5 w-12 bg-surface-light rounded" />
        ))}
      </div>
    </div>
    
    <div className="border-t border-border pt-4">
      <div className="h-3 bg-surface-light rounded w-20 mb-2" />
      <div className="h-3 bg-surface-light rounded w-full" />
      <div className="h-3 bg-surface-light rounded w-3/4 mt-1" />
    </div>
  </div>
)

export const SkeletonNetworkGraph = ({ className = '' }: { className?: string }) => (
  <div className={`flex-1 relative bg-background ${className}`}>
    <div className="absolute inset-4 border border-border rounded-lg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-green/5 to-transparent" />
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full mx-auto mb-4" />
          <div className="h-4 bg-surface-light rounded w-32 mx-auto mb-2 animate-pulse" />
          <div className="h-3 bg-surface-light rounded w-48 mx-auto animate-pulse" />
        </div>
      </div>
    </div>
    
    {/* Legend skeleton */}
    <div className="absolute top-4 left-4 z-10 bg-surface/90 border border-border rounded-lg p-3 animate-pulse">
      <div className="h-3 bg-surface-light rounded w-12 mb-2" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-surface-light rounded-full" />
          <div className="h-2 bg-surface-light rounded w-16" />
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonNamespaceFolder = ({ className = '' }: { className?: string }) => (
  <div className={`bg-surface border border-border rounded-lg animate-pulse ${className}`}>
    <div className="flex items-center gap-3 p-4">
      <div className="w-5 h-5 bg-surface-light rounded" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-surface-light rounded w-24" />
          <div className="h-3 bg-surface-light rounded w-16" />
        </div>
      </div>
      <div className="w-4 h-4 bg-surface-light rounded" />
    </div>
  </div>
)

export const SkeletonGrid = ({ 
  count = 6, 
  SkeletonComponent = SkeletonCard,
  columns = "grid-cols-1 lg:grid-cols-2",
  className = '' 
}: { 
  count?: number
  SkeletonComponent?: React.ComponentType<{ className?: string }>
  columns?: string
  className?: string
}) => (
  <div className={`grid ${columns} gap-6 ${className}`}>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonComponent key={i} />
    ))}
  </div>
)