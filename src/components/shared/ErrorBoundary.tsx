import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error caught by ErrorBoundary', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">Ocurrió un error</h2>
          <p className="mt-2 text-sm text-red-600">No se pudo mostrar esta sección. Intenta de nuevo.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Intentar de nuevo
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
