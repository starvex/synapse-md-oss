'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Dashboard error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <AlertTriangle size={48} className="mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Something went wrong</h3>
            <p className="text-muted mb-6">
              We encountered an error while loading this section. This might be a temporary issue with the API or network connection.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-surface-light text-foreground border border-border py-2 px-4 rounded-lg hover:border-accent-green transition-all"
              >
                Reload Page
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-muted text-sm cursor-pointer hover:text-foreground">
                  Error Details
                </summary>
                <pre className="mt-2 p-3 bg-surface-light border border-border rounded text-xs text-muted overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export const ApiErrorFallback = ({ 
  error, 
  retry, 
  title = "Failed to load data",
  description = "We couldn't fetch the latest data. This might be a temporary issue."
}: {
  error?: Error
  retry: () => void
  title?: string
  description?: string
}) => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="text-center max-w-md">
      <div className="text-red-500 mb-4">
        <AlertTriangle size={40} className="mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted mb-6">{description}</p>
      
      <div className="flex gap-3 justify-center">
        <button
          onClick={retry}
          className="bg-accent-green text-black font-medium py-2 px-4 rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
      
      {error && (
        <details className="mt-6 text-left">
          <summary className="text-muted text-sm cursor-pointer hover:text-foreground">
            Error Details
          </summary>
          <pre className="mt-2 p-3 bg-surface-light border border-border rounded text-xs text-muted overflow-auto max-h-32">
            {error.toString()}
          </pre>
        </details>
      )}
    </div>
  </div>
)