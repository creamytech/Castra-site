"use client"

import * as React from "react"
import { cn } from "@/lib/ui/theme"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

export function Chip({ className, selected, children, ...props }: ChipProps) {
  return (
    <button
      className={cn("chip", selected && "ring-1 ring-ring", className)}
      aria-pressed={selected}
      {...props}
    >
      {children}
    </button>
  )
}

export default Chip


