"use client"

import * as React from "react"
import Button from "./Button"

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center p-8 border border-destructive/40 rounded-lg text-muted-foreground bg-destructive/5">
      <div className="text-4xl mb-2" aria-hidden>⚠️</div>
      <h3 className="h3 mb-1 text-foreground">{title}</h3>
      {message && <p className="text-sm mb-3">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>Try again</Button>
      )}
    </div>
  )
}

export default ErrorState


