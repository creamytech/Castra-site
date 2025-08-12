"use client"

import * as React from "react"
import ErrorState from "./ui/ErrorState"

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // TODO: send to Sentry
    console.error("ErrorBoundary caught", error, info)
  }

  handleRetry = () => this.setState({ hasError: false, message: undefined })

  render() {
    if (this.state.hasError) {
      return <ErrorState message={this.state.message} onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}

export default ErrorBoundary


