'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/hooks'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { auth, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      // Still loading
      return
    }
    
    if (!auth) {
      router.push('/dashboard')
    }
  }, [auth, loading, router])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neural-mesh absolute inset-0" />
        <div className="relative flex items-center gap-2 text-muted">
          <Loader2 size={24} className="animate-spin" />
          <span>Connecting to workspace...</span>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render children (will redirect)
  if (!auth) {
    return null
  }

  return <>{children}</>
}