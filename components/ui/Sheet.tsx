"use client"

import * as React from "react"
import { cn } from "@/lib/ui/theme"

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: "left" | "right" | "top" | "bottom"
  children: React.ReactNode
  className?: string
}

export function Sheet({ open, onOpenChange, side = "right", children, className }: SheetProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
          <div
            className={cn(
              "absolute bg-card text-card-foreground border-l border-border shadow-xl w-80 max-w-[90vw] h-full p-4",
              side === "right" && "right-0 top-0",
              side === "left" && "left-0 top-0",
              side === "top" && "left-0 right-0 top-0 h-80 w-full border-b",
              side === "bottom" && "left-0 right-0 bottom-0 h-80 w-full border-t",
              className,
            )}
          >
            {children}
          </div>
        </div>
      )}
    </>
  )
}

export default Sheet


