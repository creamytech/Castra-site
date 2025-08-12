"use client"

import * as React from "react"
import { cn } from "@/lib/ui/theme"

export type BadgeStatus = "lead" | "potential" | "no_lead" | "vendor" | "newsletter" | "follow_up"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus
}

export function Badge({ status, className, children, ...props }: BadgeProps) {
  return (
    <span
      data-status={status}
      className={cn("badge select-none", className)}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge


