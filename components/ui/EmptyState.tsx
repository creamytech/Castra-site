"use client"

import * as React from "react"

export interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
      <div className="text-4xl mb-2" aria-hidden>🗂️</div>
      <h3 className="h3 mb-1 text-foreground">{title}</h3>
      {description && <p className="text-sm mb-3">{description}</p>}
      {action}
    </div>
  )
}

export default EmptyState


