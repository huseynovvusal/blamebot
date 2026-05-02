/**
 * The "Candy Button" — pill, chunky border, hard shadow, bounce.
 * Used for primary CTAs across the marketing surface and the dashboard header.
 * For dense table actions and config forms, the regular shadcn <Button> still works.
 */

"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const candyVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
    "border-2 border-foreground font-display font-bold tracking-tight",
    "transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
    "shadow-[4px_4px_0_0_var(--foreground)]",
    "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)]",
    "active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_var(--foreground)]",
    "disabled:pointer-events-none disabled:opacity-60",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  {
    variants: {
      tone: {
        violet: "bg-primary text-primary-foreground",
        pink: "bg-destructive text-foreground",
        amber: "bg-accent text-accent-foreground",
        mint: "bg-success text-foreground",
        ghost: "bg-transparent text-foreground hover:bg-accent",
        cream: "bg-card text-foreground",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { tone: "violet", size: "md" },
  },
)

export interface CandyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof candyVariants> {
  asChild?: boolean
}

export const CandyButton = React.forwardRef<HTMLButtonElement, CandyButtonProps>(function CandyButton(
  { className, tone, size, asChild = false, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp ref={ref} className={cn(candyVariants({ tone, size }), className)} {...props}>
      {children}
    </Comp>
  )
})
