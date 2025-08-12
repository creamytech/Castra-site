"use client"

import * as React from "react"
import { cn } from "@/lib/ui/theme"

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline"
type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-destructive",
  outline: "bg-transparent text-foreground border border-border hover:bg-accent hover:text-accent-foreground",
}

const sizeClass: Record<ButtonSize, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-3",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", disabled, loading, leftIcon, rightIcon, children, ...props },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      data-variant={variant}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md transition-colors focus-ring", 
        variantClass[variant],
        sizeClass[size],
        isDisabled && "opacity-70 cursor-not-allowed",
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {leftIcon && <span aria-hidden>{leftIcon}</span>}
      <span>{children}</span>
      {loading && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-b-transparent animate-spin" aria-hidden />
      )}
      {!loading && rightIcon && <span aria-hidden>{rightIcon}</span>}
    </button>
  )
})

export default Button


